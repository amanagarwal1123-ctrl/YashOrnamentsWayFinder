from fastapi import FastAPI, APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import secrets

from models import (
    Session, SessionEvent, CallbackRequest, HelpdeskCase, HelpdeskCaseUpdate,
    InternalUser, OTPCode, GoldRate, GalleryItem, AuditLog, Route, Checkpoint,
    SessionCreateRequest, SessionEventRequest, CallbackCreateRequest,
    HelpdeskActionRequest, LoginRequest, GoldRateUpdateRequest, PushSubscription,
    QRSource, Business
)
from utils import serialize_doc, now_utc, to_iso

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# SSE clients for helpdesk notifications
helpdesk_clients: List[asyncio.Queue] = []

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def gen_id():
    return str(uuid.uuid4())

# ========== HELPER ==========
async def log_event(session_id: str, business_id: str, event_type: str, event_data: dict = None, checkpoint_id: str = ""):
    event = {
        'id': gen_id(),
        'session_id': session_id,
        'business_id': business_id,
        'event_type': event_type,
        'event_data': event_data or {},
        'checkpoint_id': checkpoint_id,
        'timestamp': now_utc().isoformat()
    }
    await db.session_events.insert_one(event)
    return event

async def notify_helpdesk(notification: dict):
    """Send notification to all connected helpdesk SSE clients."""
    for q in helpdesk_clients:
        try:
            await q.put(notification)
        except Exception:
            pass

async def create_helpdesk_case(session_id: str, business_id: str, case_type: str, 
                                customer_name: str = "", customer_phone: str = "",
                                checkpoint_id: str = "", checkpoint_name: str = "", 
                                route_id: str = ""):
    case = {
        'id': gen_id(),
        'session_id': session_id,
        'business_id': business_id,
        'case_type': case_type,
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'last_checkpoint_id': checkpoint_id,
        'last_checkpoint_name': checkpoint_name,
        'route_id': route_id,
        'status': 'open',
        'assigned_to': '',
        'notes': '',
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat()
    }
    await db.helpdesk_cases.insert_one(case)
    
    # Get business info for notification
    business = await db.businesses.find_one({'id': business_id})
    biz_name = business['name'] if business else 'Unknown'
    
    notification = {
        'type': case_type,
        'case_id': case['id'],
        'session_id': session_id,
        'business_name': biz_name,
        'business_id': business_id,
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'checkpoint_name': checkpoint_name,
        'timestamp': now_utc().isoformat()
    }
    await notify_helpdesk(notification)
    return case

# ========== PUBLIC: QR / Session ==========
@api_router.post("/sessions/create")
async def create_session(req: SessionCreateRequest):
    """Create a new navigation session from QR code scan."""
    qr = await db.qr_sources.find_one({'code': req.qr_code, 'active': True})
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid or inactive QR code")
    
    business = await db.businesses.find_one({'id': qr['business_id']})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Increment scan count
    await db.qr_sources.update_one({'code': req.qr_code}, {'$inc': {'scan_count': 1}})
    
    session = {
        'id': gen_id(),
        'business_id': business['id'],
        'business_slug': business['slug'],
        'qr_source_id': qr['id'],
        'campaign': qr.get('campaign', ''),
        'customer_name': '',
        'customer_phone': '',
        'route_id': '',
        'current_checkpoint_id': '',
        'current_checkpoint_order': 0,
        'status': 'active',
        'arrived_building': False,
        'arrived_destination': False,
        'device_info': req.device_info,
        'help_requested': False,
        'callback_requested': False,
        'last_activity': now_utc().isoformat(),
        'created_at': now_utc().isoformat()
    }
    await db.sessions.insert_one(session)
    
    await log_event(session['id'], business['id'], 'qr_scan', {'qr_code': req.qr_code, 'campaign': qr.get('campaign', '')})
    
    return {
        'session': serialize_doc(session),
        'business': serialize_doc(business)
    }

@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    business = await db.businesses.find_one({'id': session['business_id']})
    return {
        'session': serialize_doc(session),
        'business': serialize_doc(business)
    }

@api_router.put("/sessions/{session_id}/customer-info")
async def update_customer_info(session_id: str, data: dict):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    update = {}
    if 'customer_name' in data:
        update['customer_name'] = data['customer_name']
    if 'customer_phone' in data:
        update['customer_phone'] = data['customer_phone']
    if update:
        update['last_activity'] = now_utc().isoformat()
        await db.sessions.update_one({'id': session_id}, {'$set': update})
    return {'status': 'ok'}

# ========== PUBLIC: Routes & Checkpoints ==========
@api_router.get("/routes")
async def get_routes():
    routes = await db.routes.find({'status': 'published'}, {'_id': 0}).to_list(100)
    return serialize_doc(routes)

@api_router.get("/routes/{route_id}")
async def get_route(route_id: str):
    route = await db.routes.find_one({'id': route_id}, {'_id': 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return serialize_doc(route)

@api_router.get("/routes/{route_id}/checkpoints")
async def get_route_checkpoints(route_id: str):
    checkpoints = await db.checkpoints.find(
        {'route_id': route_id}, {'_id': 0}
    ).sort('order', 1).to_list(100)
    return serialize_doc(checkpoints)

@api_router.get("/checkpoints/{checkpoint_id}")
async def get_checkpoint(checkpoint_id: str):
    cp = await db.checkpoints.find_one({'id': checkpoint_id}, {'_id': 0})
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    return serialize_doc(cp)

# ========== PUBLIC: Session Events ==========
@api_router.post("/sessions/{session_id}/events")
async def add_session_event(session_id: str, req: SessionEventRequest):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update = {'last_activity': now_utc().isoformat()}
    
    # Handle specific event types
    if req.event_type == 'route_selected':
        update['route_id'] = req.event_data.get('route_id', '')
    elif req.event_type == 'checkpoint_confirmed':
        update['current_checkpoint_id'] = req.checkpoint_id
        update['current_checkpoint_order'] = req.event_data.get('order', 0)
    elif req.event_type == 'arrived_building':
        update['arrived_building'] = True
    elif req.event_type == 'arrived_destination':
        update['arrived_destination'] = True
        update['status'] = 'completed'
    elif req.event_type == 'help_requested':
        update['help_requested'] = True
        # Create helpdesk case
        cp = await db.checkpoints.find_one({'id': session.get('current_checkpoint_id', '')})
        cp_name = cp['name'] if cp else 'Unknown'
        await create_helpdesk_case(
            session_id, session['business_id'], 'help_request',
            session.get('customer_name', ''), session.get('customer_phone', ''),
            session.get('current_checkpoint_id', ''), cp_name, session.get('route_id', '')
        )
    elif req.event_type == 'cannot_find':
        # Log confusion
        cp = await db.checkpoints.find_one({'id': req.checkpoint_id})
        cp_name = cp['name'] if cp else 'Unknown'
        await create_helpdesk_case(
            session_id, session['business_id'], 'cannot_find',
            session.get('customer_name', ''), session.get('customer_phone', ''),
            req.checkpoint_id, cp_name, session.get('route_id', '')
        )
    elif req.event_type == 'location_shared':
        cp = await db.checkpoints.find_one({'id': session.get('current_checkpoint_id', '')})
        cp_name = cp['name'] if cp else 'Unknown'
        await create_helpdesk_case(
            session_id, session['business_id'], 'location_share',
            session.get('customer_name', ''), session.get('customer_phone', ''),
            session.get('current_checkpoint_id', ''), cp_name, session.get('route_id', '')
        )
    elif req.event_type == 'checkpoint_shared':
        cp = await db.checkpoints.find_one({'id': req.checkpoint_id})
        cp_name = cp['name'] if cp else 'Unknown'
        await create_helpdesk_case(
            session_id, session['business_id'], 'checkpoint_share',
            session.get('customer_name', ''), session.get('customer_phone', ''),
            req.checkpoint_id, cp_name, session.get('route_id', '')
        )
    
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    event = await log_event(session_id, session['business_id'], req.event_type, req.event_data, req.checkpoint_id)
    return serialize_doc(event)

@api_router.get("/sessions/{session_id}/events")
async def get_session_events(session_id: str):
    events = await db.session_events.find(
        {'session_id': session_id}, {'_id': 0}
    ).sort('timestamp', 1).to_list(500)
    return serialize_doc(events)

# ========== PUBLIC: Callback Request ==========
@api_router.post("/sessions/{session_id}/callback")
async def request_callback(session_id: str, req: CallbackCreateRequest):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session with customer info if provided
    update = {'callback_requested': True, 'last_activity': now_utc().isoformat()}
    if req.customer_name:
        update['customer_name'] = req.customer_name
    if req.customer_phone:
        update['customer_phone'] = req.customer_phone
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    
    callback = {
        'id': gen_id(),
        'session_id': session_id,
        'business_id': session['business_id'],
        'customer_name': req.customer_name,
        'customer_phone': req.customer_phone,
        'issue_type': req.issue_type,
        'notes': req.notes,
        'status': 'pending',
        'last_checkpoint_id': session.get('current_checkpoint_id', ''),
        'created_at': now_utc().isoformat(),
        'resolved_at': None
    }
    await db.callback_requests.insert_one(callback)
    
    # Create helpdesk case
    cp = await db.checkpoints.find_one({'id': session.get('current_checkpoint_id', '')})
    cp_name = cp['name'] if cp else 'Unknown'
    await create_helpdesk_case(
        session_id, session['business_id'], 'callback',
        req.customer_name, req.customer_phone,
        session.get('current_checkpoint_id', ''), cp_name, session.get('route_id', '')
    )
    
    await log_event(session_id, session['business_id'], 'callback_requested', {
        'issue_type': req.issue_type, 'phone': req.customer_phone
    })
    
    return serialize_doc(callback)

# ========== PUBLIC: Gold Rates (AJPL only) ==========
@api_router.get("/gold-rates")
async def get_gold_rates():
    rate = await db.gold_rates.find_one({}, {'_id': 0}, sort=[('updated_at', -1)])
    if not rate:
        return {'rate_24k': 0, 'rate_22k': 0, 'rate_18k': 0, 'updated_at': ''}
    return serialize_doc(rate)

# ========== PUBLIC: Gallery (AJPL only) ==========
@api_router.get("/gallery")
async def get_gallery():
    items = await db.gallery_items.find({'active': True}, {'_id': 0}).to_list(100)
    return serialize_doc(items)

# ========== PUBLIC: Business Info ==========
@api_router.get("/businesses/{slug}")
async def get_business_by_slug(slug: str):
    business = await db.businesses.find_one({'slug': slug}, {'_id': 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return serialize_doc(business)

# ========== AUTH: Simple JWT bypass for testing ==========
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({'username': req.username, 'active': True})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials or user deactivated")
    
    # Check OTP
    otp = await db.otp_codes.find_one({
        'user_id': user['id'],
        'code': req.otp,
        'used': False
    })
    
    if otp:
        # Check expiry
        expires_at = otp.get('expires_at', '')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at < now_utc():
            raise HTTPException(status_code=401, detail="OTP expired")
        # Mark OTP as used
        await db.otp_codes.update_one({'id': otp['id']}, {'$set': {'used': True}})
    else:
        # Simple bypass: accept 'admin123' for testing
        if req.otp != 'admin123':
            raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Generate simple token
    token = secrets.token_urlsafe(32)
    return {
        'token': token,
        'user': serialize_doc(user)
    }

@api_router.get("/auth/me")
async def get_current_user(username: str = Query(None)):
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await db.users.find_one({'username': username, 'active': True}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return serialize_doc(user)

# ========== ADMIN: Sessions ==========
@api_router.get("/admin/sessions")
async def admin_get_sessions(status: str = "active", business_id: str = None, limit: int = 50):
    query = {}
    if status:
        query['status'] = status
    if business_id:
        query['business_id'] = business_id
    sessions = await db.sessions.find(query, {'_id': 0}).sort('last_activity', -1).to_list(limit)
    return serialize_doc(sessions)

@api_router.get("/admin/sessions/live")
async def admin_live_sessions():
    """Get all active sessions for live map view."""
    sessions = await db.sessions.find({'status': 'active'}, {'_id': 0}).to_list(200)
    result = []
    for s in sessions:
        # Get checkpoint info
        cp_name = ""
        if s.get('current_checkpoint_id'):
            cp = await db.checkpoints.find_one({'id': s['current_checkpoint_id']})
            cp_name = cp['name'] if cp else ''
        
        result.append({
            **serialize_doc(s),
            'current_checkpoint_name': cp_name
        })
    return result

@api_router.get("/admin/sessions/{session_id}/detail")
async def admin_session_detail(session_id: str):
    session = await db.sessions.find_one({'id': session_id}, {'_id': 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    events = await db.session_events.find({'session_id': session_id}, {'_id': 0}).sort('timestamp', 1).to_list(500)
    business = await db.businesses.find_one({'id': session['business_id']}, {'_id': 0})
    
    # Get route and checkpoint info
    route = None
    if session.get('route_id'):
        route = await db.routes.find_one({'id': session['route_id']}, {'_id': 0})
    
    cases = await db.helpdesk_cases.find({'session_id': session_id}, {'_id': 0}).to_list(50)
    callbacks = await db.callback_requests.find({'session_id': session_id}, {'_id': 0}).to_list(50)
    
    return {
        'session': serialize_doc(session),
        'business': serialize_doc(business),
        'route': serialize_doc(route),
        'events': serialize_doc(events),
        'cases': serialize_doc(cases),
        'callbacks': serialize_doc(callbacks)
    }

@api_router.post("/admin/sessions/{session_id}/terminate")
async def admin_terminate_session(session_id: str, data: dict = None):
    reason = data.get('reason', 'admin_terminated') if data else 'admin_terminated'
    result = await db.sessions.update_one(
        {'id': session_id},
        {'$set': {'status': 'terminated', 'last_activity': now_utc().isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = await db.sessions.find_one({'id': session_id})
    await log_event(session_id, session.get('business_id', ''), 'session_terminated', {'reason': reason})
    return {'status': 'terminated'}

# ========== ADMIN: Stats ==========
@api_router.get("/admin/stats")
async def admin_stats(business_id: str = None):
    query = {}
    if business_id:
        query['business_id'] = business_id
    
    active_query = {**query, 'status': 'active'}
    completed_query = {**query, 'status': 'completed'}
    
    active_count = await db.sessions.count_documents(active_query)
    completed_count = await db.sessions.count_documents(completed_query)
    total_count = await db.sessions.count_documents(query)
    
    help_pending = await db.helpdesk_cases.count_documents({**({'business_id': business_id} if business_id else {}), 'status': {'$in': ['open', 'acknowledged']}})
    callback_pending = await db.callback_requests.count_documents({**({'business_id': business_id} if business_id else {}), 'status': 'pending'})
    
    # Per business counts
    ajpl_active = await db.sessions.count_documents({'status': 'active', 'business_slug': 'ajpl'})
    yash_active = await db.sessions.count_documents({'status': 'active', 'business_slug': 'yash'})
    
    return {
        'active_sessions': active_count,
        'completed_sessions': completed_count,
        'total_sessions': total_count,
        'help_pending': help_pending,
        'callback_pending': callback_pending,
        'ajpl_active': ajpl_active,
        'yash_active': yash_active
    }

# ========== ADMIN: Routes Management ==========
@api_router.get("/admin/routes")
async def admin_get_routes():
    routes = await db.routes.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(routes)

@api_router.post("/admin/routes")
async def admin_create_route(data: dict):
    route = {
        'id': gen_id(),
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'start_type': data.get('start_type', 'custom'),
        'start_label': data.get('start_label', ''),
        'difficulty': data.get('difficulty', 'easy'),
        'estimated_time_minutes': data.get('estimated_time_minutes', 15),
        'checkpoint_count': 0,
        'status': data.get('status', 'draft'),
        'created_by': data.get('created_by', ''),
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat()
    }
    await db.routes.insert_one(route)
    return serialize_doc(route)

@api_router.put("/admin/routes/{route_id}")
async def admin_update_route(route_id: str, data: dict):
    data['updated_at'] = now_utc().isoformat()
    data.pop('id', None)
    data.pop('_id', None)
    await db.routes.update_one({'id': route_id}, {'$set': data})
    route = await db.routes.find_one({'id': route_id}, {'_id': 0})
    return serialize_doc(route)

@api_router.delete("/admin/routes/{route_id}")
async def admin_delete_route(route_id: str):
    await db.routes.delete_one({'id': route_id})
    await db.checkpoints.delete_many({'route_id': route_id})
    return {'status': 'deleted'}

# ========== ADMIN: Checkpoints Management ==========
@api_router.get("/admin/checkpoints")
async def admin_get_checkpoints(route_id: str = None):
    query = {}
    if route_id:
        query['route_id'] = route_id
    cps = await db.checkpoints.find(query, {'_id': 0}).sort('order', 1).to_list(200)
    return serialize_doc(cps)

@api_router.post("/admin/checkpoints")
async def admin_create_checkpoint(data: dict):
    cp = {
        'id': gen_id(),
        'route_id': data.get('route_id', ''),
        'order': data.get('order', 1),
        'name': data.get('name', ''),
        'short_instruction': data.get('short_instruction', ''),
        'long_instruction': data.get('long_instruction', ''),
        'landmark_description': data.get('landmark_description', ''),
        'what_to_look_for': data.get('what_to_look_for', ''),
        'photo_url': data.get('photo_url', ''),
        'video_url': data.get('video_url', ''),
        'arrow_map_url': data.get('arrow_map_url', ''),
        'direction': data.get('direction', 'straight'),
        'indoor': data.get('indoor', False),
        'floor_context': data.get('floor_context', ''),
        'is_critical': data.get('is_critical', True),
        'risk_level': data.get('risk_level', 'low'),
        'fallback_text': data.get('fallback_text', ''),
        'heading': data.get('heading', 0.0),
        'lat': data.get('lat', 0.0),
        'lng': data.get('lng', 0.0),
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat()
    }
    await db.checkpoints.insert_one(cp)
    
    # Update route checkpoint count
    count = await db.checkpoints.count_documents({'route_id': cp['route_id']})
    await db.routes.update_one({'id': cp['route_id']}, {'$set': {'checkpoint_count': count}})
    
    return serialize_doc(cp)

@api_router.put("/admin/checkpoints/{checkpoint_id}")
async def admin_update_checkpoint(checkpoint_id: str, data: dict):
    data['updated_at'] = now_utc().isoformat()
    data.pop('id', None)
    data.pop('_id', None)
    await db.checkpoints.update_one({'id': checkpoint_id}, {'$set': data})
    cp = await db.checkpoints.find_one({'id': checkpoint_id}, {'_id': 0})
    return serialize_doc(cp)

@api_router.delete("/admin/checkpoints/{checkpoint_id}")
async def admin_delete_checkpoint(checkpoint_id: str):
    cp = await db.checkpoints.find_one({'id': checkpoint_id})
    if cp:
        await db.checkpoints.delete_one({'id': checkpoint_id})
        count = await db.checkpoints.count_documents({'route_id': cp['route_id']})
        await db.routes.update_one({'id': cp['route_id']}, {'$set': {'checkpoint_count': count}})
    return {'status': 'deleted'}

# ========== ADMIN: Users ==========
@api_router.get("/admin/users")
async def admin_get_users():
    users = await db.users.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(users)

@api_router.post("/admin/users")
async def admin_create_user(data: dict):
    existing = await db.users.find_one({'username': data.get('username', '')})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = {
        'id': gen_id(),
        'username': data.get('username', ''),
        'display_name': data.get('display_name', ''),
        'role': data.get('role', 'helpdesk'),
        'active': True,
        'created_at': now_utc().isoformat()
    }
    await db.users.insert_one(user)
    return serialize_doc(user)

@api_router.put("/admin/users/{user_id}/toggle-active")
async def admin_toggle_user(user_id: str):
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not user.get('active', True)
    await db.users.update_one({'id': user_id}, {'$set': {'active': new_status}})
    return {'active': new_status}

# ========== ADMIN: OTP Generation ==========
@api_router.post("/admin/otp/generate")
async def admin_generate_otp(data: dict):
    user_id = data.get('user_id', '')
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate 6-digit OTP
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = now_utc() + timedelta(hours=2)
    
    otp = {
        'id': gen_id(),
        'user_id': user_id,
        'code': code,
        'used': False,
        'expires_at': expires_at.isoformat(),
        'created_at': now_utc().isoformat()
    }
    await db.otp_codes.insert_one(otp)
    
    return {
        'otp': code,
        'expires_at': expires_at.isoformat(),
        'user': serialize_doc(user)
    }

# ========== ADMIN: Gold Rates ==========
@api_router.post("/admin/gold-rates")
async def admin_update_gold_rates(req: GoldRateUpdateRequest):
    rate = {
        'id': gen_id(),
        'rate_24k': req.rate_24k,
        'rate_22k': req.rate_22k,
        'rate_18k': req.rate_18k,
        'updated_by': 'admin',
        'updated_at': now_utc().isoformat()
    }
    await db.gold_rates.insert_one(rate)
    return serialize_doc(rate)

# ========== ADMIN: Gallery ==========
@api_router.get("/admin/gallery")
async def admin_get_gallery():
    items = await db.gallery_items.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(items)

@api_router.post("/admin/gallery")
async def admin_create_gallery_item(data: dict):
    item = {
        'id': gen_id(),
        'title': data.get('title', ''),
        'description': data.get('description', ''),
        'image_url': data.get('image_url', ''),
        'category': data.get('category', ''),
        'weight': data.get('weight', ''),
        'active': True,
        'created_at': now_utc().isoformat()
    }
    await db.gallery_items.insert_one(item)
    return serialize_doc(item)

@api_router.delete("/admin/gallery/{item_id}")
async def admin_delete_gallery_item(item_id: str):
    await db.gallery_items.delete_one({'id': item_id})
    return {'status': 'deleted'}

# ========== ADMIN: QR Sources ==========
@api_router.get("/admin/qr-sources")
async def admin_get_qr_sources():
    sources = await db.qr_sources.find({}, {'_id': 0}).to_list(100)
    result = []
    for s in sources:
        biz = await db.businesses.find_one({'id': s['business_id']})
        result.append({**serialize_doc(s), 'business_name': biz['name'] if biz else 'Unknown'})
    return result

@api_router.post("/admin/qr-sources")
async def admin_create_qr_source(data: dict):
    existing = await db.qr_sources.find_one({'code': data.get('code', '')})
    if existing:
        raise HTTPException(status_code=400, detail="QR code already exists")
    source = {
        'id': gen_id(),
        'code': data.get('code', ''),
        'business_id': data.get('business_id', ''),
        'campaign': data.get('campaign', 'default'),
        'description': data.get('description', ''),
        'active': True,
        'scan_count': 0,
        'created_at': now_utc().isoformat()
    }
    await db.qr_sources.insert_one(source)
    return serialize_doc(source)

# ========== ADMIN: Businesses ==========
@api_router.get("/admin/businesses")
async def admin_get_businesses():
    businesses = await db.businesses.find({}, {'_id': 0}).to_list(10)
    return serialize_doc(businesses)

# ========== ADMIN: Analytics ==========
@api_router.get("/admin/analytics")
async def admin_analytics(business_id: str = None, days: int = 30):
    date_cutoff = (now_utc() - timedelta(days=days)).isoformat()
    
    query = {}
    if business_id:
        query['business_id'] = business_id
    
    # Total sessions
    total = await db.sessions.count_documents(query)
    completed = await db.sessions.count_documents({**query, 'status': 'completed'})
    abandoned = await db.sessions.count_documents({**query, 'status': 'abandoned'})
    
    # Events breakdown
    event_query = {}
    if business_id:
        event_query['business_id'] = business_id
    
    pipeline = [
        {'$match': event_query},
        {'$group': {'_id': '$event_type', 'count': {'$sum': 1}}}
    ]
    event_counts = {}
    async for doc in db.session_events.aggregate(pipeline):
        event_counts[doc['_id']] = doc['count']
    
    # Top drop-off checkpoints
    drop_off_pipeline = [
        {'$match': {**event_query, 'event_type': 'cannot_find'}},
        {'$group': {'_id': '$checkpoint_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 5}
    ]
    drop_offs = []
    async for doc in db.session_events.aggregate(drop_off_pipeline):
        cp = await db.checkpoints.find_one({'id': doc['_id']})
        drop_offs.append({
            'checkpoint_id': doc['_id'],
            'checkpoint_name': cp['name'] if cp else 'Unknown',
            'count': doc['count']
        })
    
    # Helpdesk stats
    help_total = await db.helpdesk_cases.count_documents({} if not business_id else {'business_id': business_id})
    help_resolved = await db.helpdesk_cases.count_documents({**({} if not business_id else {'business_id': business_id}), 'status': 'resolved'})
    
    return {
        'total_sessions': total,
        'completed_sessions': completed,
        'abandoned_sessions': abandoned,
        'completion_rate': round(completed / max(total, 1) * 100, 1),
        'event_counts': event_counts,
        'top_drop_offs': drop_offs,
        'helpdesk_total': help_total,
        'helpdesk_resolved': help_resolved,
        'helpdesk_resolution_rate': round(help_resolved / max(help_total, 1) * 100, 1)
    }

# ========== ADMIN: Audit Logs ==========
@api_router.get("/admin/audit-logs")
async def admin_get_audit_logs(limit: int = 50):
    logs = await db.audit_logs.find({}, {'_id': 0}).sort('timestamp', -1).to_list(limit)
    return serialize_doc(logs)

# ========== HELPDESK ==========
@api_router.get("/helpdesk/cases")
async def helpdesk_get_cases(status: str = None, business_id: str = None):
    query = {}
    if status:
        query['status'] = status
    if business_id:
        query['business_id'] = business_id
    cases = await db.helpdesk_cases.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    result = []
    for case in cases:
        biz = await db.businesses.find_one({'id': case['business_id']})
        session = await db.sessions.find_one({'id': case['session_id']})
        result.append({
            **serialize_doc(case),
            'business_name': biz['name'] if biz else 'Unknown',
            'business_slug': biz['slug'] if biz else '',
            'route_name': '',
            'session_status': session['status'] if session else 'unknown'
        })
    return result

@api_router.get("/helpdesk/cases/{case_id}")
async def helpdesk_get_case_detail(case_id: str):
    case = await db.helpdesk_cases.find_one({'id': case_id}, {'_id': 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    updates = await db.helpdesk_case_updates.find({'case_id': case_id}, {'_id': 0}).sort('timestamp', 1).to_list(100)
    session = await db.sessions.find_one({'id': case['session_id']}, {'_id': 0})
    business = await db.businesses.find_one({'id': case['business_id']}, {'_id': 0})
    
    return {
        'case': serialize_doc(case),
        'updates': serialize_doc(updates),
        'session': serialize_doc(session),
        'business': serialize_doc(business)
    }

@api_router.post("/helpdesk/cases/{case_id}/action")
async def helpdesk_case_action(case_id: str, req: HelpdeskActionRequest):
    case = await db.helpdesk_cases.find_one({'id': case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Map action to status
    status_map = {
        'acknowledged': 'acknowledged',
        'called': 'in_progress',
        'no_answer': 'in_progress',
        'guided': 'in_progress',
        'resolved': 'resolved',
        'closed': 'closed',
        'note_added': case.get('status', 'open')
    }
    new_status = status_map.get(req.action, case.get('status', 'open'))
    
    await db.helpdesk_cases.update_one(
        {'id': case_id},
        {'$set': {'status': new_status, 'updated_at': now_utc().isoformat()}}
    )
    
    update = {
        'id': gen_id(),
        'case_id': case_id,
        'action': req.action,
        'note': req.note,
        'performed_by': '',
        'timestamp': now_utc().isoformat()
    }
    await db.helpdesk_case_updates.insert_one(update)
    
    return serialize_doc(update)

@api_router.get("/helpdesk/callbacks")
async def helpdesk_get_callbacks(status: str = None):
    query = {}
    if status:
        query['status'] = status
    callbacks = await db.callback_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    result = []
    for cb in callbacks:
        biz = await db.businesses.find_one({'id': cb['business_id']})
        result.append({
            **serialize_doc(cb),
            'business_name': biz['name'] if biz else 'Unknown'
        })
    return result

# ========== HELPDESK: SSE Notifications ==========
@api_router.get("/helpdesk/notifications/stream")
async def helpdesk_sse_stream(request: Request):
    """SSE endpoint for helpdesk real-time notifications."""
    queue = asyncio.Queue()
    helpdesk_clients.append(queue)
    
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    notification = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {json.dumps(notification)}\n\n"
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        finally:
            helpdesk_clients.remove(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# ========== LLM: Generate Suggestions ==========
@api_router.post("/llm/suggest-checkpoint")
async def llm_suggest_checkpoint(data: dict):
    """Generate LLM suggestions for checkpoint text."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    trainer_text = data.get('text', '')
    suggestion_type = data.get('type', 'checkpoint')  # checkpoint, instruction, warning, summary
    
    prompts = {
        'checkpoint': f"""Given this trainer description of a navigation checkpoint in Chandni Chowk Delhi:
\"{trainer_text}\"

Generate improved text. Return JSON with: title (max 6 words), short_instruction (1 sentence), long_instruction (2-3 sentences), landmark_description, what_to_look_for, fallback_text.""",
        
        'instruction': f"""Improve this navigation instruction for a first-time visitor to Chandni Chowk:
\"{trainer_text}\"

Return JSON with: improved_instruction, what_to_look_for, warning_if_any.""",
        
        'warning': f"""Generate a clear warning message for this confusion point in Chandni Chowk navigation:
\"{trainer_text}\"

Return JSON with: warning_text, what_not_to_do, recovery_hint.""",
        
        'summary': f"""Generate a route summary for this navigation route:
\"{trainer_text}\"

Return JSON with: summary, estimated_walk_time, difficulty, tips (array)."""
    }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"suggestion-{gen_id()[:8]}",
            system_message="You are a navigation assistant for Chandni Chowk, Delhi. Generate clear, helpful navigation text. Always return valid JSON."
        )
        
        msg = UserMessage(text=prompts.get(suggestion_type, prompts['checkpoint']))
        response = await chat.send_message(msg)
        
        # Try to parse JSON from response
        json_str = response
        if '```json' in response:
            json_str = response.split('```json')[1].split('```')[0].strip()
        elif '```' in response:
            json_str = response.split('```')[1].split('```')[0].strip()
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError:
            parsed = {'raw_suggestion': response}
        
        # Log the suggestion in audit
        audit = {
            'id': gen_id(),
            'user_id': '',
            'action': 'llm_suggestion',
            'entity_type': suggestion_type,
            'entity_id': '',
            'old_value': {'trainer_text': trainer_text},
            'new_value': {'suggestion': parsed},
            'status': 'generated',
            'timestamp': now_utc().isoformat()
        }
        await db.audit_logs.insert_one(audit)
        
        return {'suggestion': parsed, 'raw': response}
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== Where Am I ==========
@api_router.post("/where-am-i")
async def where_am_i(data: dict):
    """Infer nearest checkpoint from user description or location."""
    description = data.get('description', '')
    hints = data.get('hints', [])  # quick options selected
    lat = data.get('lat', 0)
    lng = data.get('lng', 0)
    session_id = data.get('session_id', '')
    
    # Simple matching: search checkpoints for matching terms
    all_checkpoints = await db.checkpoints.find({}, {'_id': 0}).to_list(200)
    
    matches = []
    search_terms = description.lower().split() + [h.lower() for h in hints]
    
    for cp in all_checkpoints:
        score = 0
        cp_text = f"{cp.get('name', '')} {cp.get('short_instruction', '')} {cp.get('landmark_description', '')} {cp.get('what_to_look_for', '')}".lower()
        for term in search_terms:
            if term in cp_text:
                score += 1
        if score > 0:
            matches.append({**serialize_doc(cp), 'match_score': score})
    
    # Sort by score
    matches.sort(key=lambda x: x['match_score'], reverse=True)
    
    # If location available, also add nearby checkpoints
    if lat and lng:
        for cp in all_checkpoints:
            if cp.get('lat') and cp.get('lng'):
                dist = ((cp['lat'] - lat) ** 2 + (cp['lng'] - lng) ** 2) ** 0.5
                if dist < 0.005:  # roughly 500m
                    already = any(m['id'] == cp['id'] for m in matches)
                    if not already:
                        matches.append({**serialize_doc(cp), 'match_score': 0, 'distance': dist})
    
    return {'matches': matches[:5]}

# ========== Root ==========
@api_router.get("/")
async def root():
    return {"message": "Chandni Chowk Navigation API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
