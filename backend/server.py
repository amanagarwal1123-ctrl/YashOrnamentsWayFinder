from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
import io
import shutil
import jwt as pyjwt
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import qrcode
from qrcode.image.styledpil import StyledPilImage

from models import (
    Session, SessionEvent, CallbackRequest, HelpdeskCase, HelpdeskCaseUpdate,
    InternalUser, OTPCode, GoldRate, GalleryItem, AuditLog, Route, Checkpoint,
    SessionCreateRequest, SessionEventRequest, CallbackCreateRequest,
    HelpdeskActionRequest, LoginRequest, GoldRateUpdateRequest, PushSubscription,
    QRSource, Business
)
from utils import serialize_doc, now_utc, to_iso
from watermark import (
    apply_watermark_to_image, apply_watermark_to_bytes,
    generate_placeholder_watermarked, get_branding_config,
    ORIGINALS_DIR, WATERMARKED_DIR, MEDIA_DIR
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Ensure media directories
QR_DIR = MEDIA_DIR / "qr_codes"
for d in [ORIGINALS_DIR, WATERMARKED_DIR, QR_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ========== Security Config ==========
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_HOURS = 12
DEV_MODE = os.environ.get('DEV_MODE', 'false').lower() == 'true'

_jwt_secret_env = os.environ.get('JWT_SECRET', '')
if not _jwt_secret_env and not DEV_MODE:
    raise RuntimeError("JWT_SECRET must be set in production (DEV_MODE is not enabled)")
JWT_SECRET = _jwt_secret_env or secrets.token_urlsafe(48)

security_scheme = HTTPBearer(auto_error=False)

def create_jwt(user_id: str, username: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'username': username,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        'iat': datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> dict:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """Dependency: extract and validate JWT, return user dict."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    payload = decode_jwt(credentials.credentials)
    user = await db.users.find_one({'id': payload['sub'], 'active': True}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    return serialize_doc(user)

async def require_admin(user: dict = Depends(get_current_user_dep)) -> dict:
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_admin_or_helpdesk(user: dict = Depends(get_current_user_dep)) -> dict:
    if user.get('role') not in ('admin', 'helpdesk'):
        raise HTTPException(status_code=403, detail="Admin or Helpdesk access required")
    return user

async def require_admin_or_trainer(user: dict = Depends(get_current_user_dep)) -> dict:
    if user.get('role') not in ('admin', 'trainer'):
        raise HTTPException(status_code=403, detail="Admin or Trainer access required")
    return user

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
                                route_id: str = "", priority: str = "normal"):
    now_ts = now_utc().isoformat()
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
        'priority': priority,
        'notes': '',
        'last_notification_at': now_ts,
        'created_at': now_ts,
        'updated_at': now_ts,
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
    
    # If QR has a default route, pre-populate distance
    route_distance_value = 0.0
    route_distance_unit = ''
    preselected_route_id = qr.get('default_route_id', '')
    if preselected_route_id:
        route = await db.routes.find_one({'id': preselected_route_id, 'status': 'published'}, {'_id': 0})
        if route:
            route_distance_value = route.get('distance_value', 0.0)
            route_distance_unit = route.get('distance_unit', 'km')
    
    session = {
        'id': gen_id(),
        'business_id': business['id'],
        'business_slug': business['slug'],
        'qr_source_id': qr['id'],
        'campaign': qr.get('campaign', ''),
        # Source tracking
        'entry_source_type': 'qr',
        'entry_source_id': qr['id'],
        'entry_source_label': qr.get('source_label', '') or qr.get('description', ''),
        'entry_campaign': qr.get('campaign', ''),
        # Customer
        'customer_name': '',
        'customer_phone': '',
        'customer_card_media_id': '',
        # Route
        'route_id': preselected_route_id,
        'route_distance_value': route_distance_value,
        'route_distance_unit': route_distance_unit,
        'current_checkpoint_id': '',
        'current_checkpoint_order': 0,
        # Status
        'status': 'active',
        'arrived_building': False,
        'arrived_destination': False,
        'device_info': req.device_info,
        'started_at': '',
        'completed_at': '',
        'abandoned_at': '',
        # Help
        'help_requested': False,
        'callback_requested': False,
        # Location
        'location_consent_granted': False,
        'location_consent_at': '',
        'location_permission_state': 'unknown',
        'last_known_lat': 0.0,
        'last_known_lng': 0.0,
        'last_known_location_text': '',
        'last_location_at': '',
        # Assistance
        'assigned_helpdesk_user_id': '',
        'assistance_mode': '',
        'assistance_status': '',
        'last_recovery_checkpoint_id': '',
        'last_activity': now_utc().isoformat(),
        'created_at': now_utc().isoformat()
    }
    await db.sessions.insert_one(session)
    
    await log_event(session['id'], business['id'], 'customer_opened', {
        'qr_code': req.qr_code, 'campaign': qr.get('campaign', ''),
        'entry_mode': qr.get('entry_mode', 'fast'),
    })
    
    # Notify helpdesk immediately
    await notify_helpdesk({
        'type': 'customer_opened',
        'session_id': session['id'],
        'business_name': business['name'],
        'business_id': business['id'],
        'source_label': qr.get('source_label', '') or qr.get('description', ''),
        'timestamp': now_utc().isoformat(),
    })
    
    return {
        'session': serialize_doc(session),
        'business': serialize_doc(business),
        'entry_mode': qr.get('entry_mode', 'fast'),
        'default_route_id': preselected_route_id,
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
            session.get('current_checkpoint_id', ''), cp_name, session.get('route_id', ''),
            priority='high'
        )
    elif req.event_type == 'cannot_find':
        # Log confusion
        cp = await db.checkpoints.find_one({'id': req.checkpoint_id})
        cp_name = cp['name'] if cp else 'Unknown'
        await create_helpdesk_case(
            session_id, session['business_id'], 'cannot_find',
            session.get('customer_name', ''), session.get('customer_phone', ''),
            req.checkpoint_id, cp_name, session.get('route_id', ''),
            priority='high'
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

# ========== AUTH ==========
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({'username': req.username, 'active': True})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials or user deactivated")
    
    # Support 'password' as alias for 'otp'
    otp_value = req.otp or req.password
    if not otp_value:
        raise HTTPException(status_code=422, detail="OTP is required (use 'otp' or 'password' field)")
    
    # Check real OTP first
    otp = await db.otp_codes.find_one({
        'user_id': user['id'],
        'code': otp_value,
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
    elif DEV_MODE and otp_value == 'admin123':
        # Dev-only bypass — gated behind DEV_MODE env flag
        logger.warning(f"DEV_MODE OTP bypass used for user '{req.username}'")
    else:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Generate JWT
    token = create_jwt(user['id'], user['username'], user['role'])
    return {
        'token': token,
        'user': serialize_doc(user)
    }

@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user_dep)):
    """Return current user profile from JWT token."""
    return user

# ========== ADMIN: Sessions ==========
@api_router.get("/admin/sessions")
async def admin_get_sessions(status: str = "active", business_id: str = None, limit: int = 50, _user: dict = Depends(require_admin)):
    query = {}
    if status:
        query['status'] = status
    if business_id:
        query['business_id'] = business_id
    sessions = await db.sessions.find(query, {'_id': 0}).sort('last_activity', -1).to_list(limit)
    return serialize_doc(sessions)

@api_router.get("/admin/sessions/live")
async def admin_live_sessions(_user: dict = Depends(require_admin)):
    """Get all active sessions for live map view."""
    sessions = await db.sessions.find({'status': 'active'}, {'_id': 0}).to_list(200)
    
    # Batch fetch checkpoints to avoid N+1
    cp_ids = list(set(s.get('current_checkpoint_id', '') for s in sessions if s.get('current_checkpoint_id')))
    cp_lookup = {}
    if cp_ids:
        cps = await db.checkpoints.find({'id': {'$in': cp_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(cp_ids))
        cp_lookup = {cp['id']: cp['name'] for cp in cps}
    
    result = []
    for s in sessions:
        cp_name = cp_lookup.get(s.get('current_checkpoint_id', ''), '')
        result.append({
            **serialize_doc(s),
            'current_checkpoint_name': cp_name
        })
    return result

@api_router.get("/admin/sessions/{session_id}/detail")
async def admin_session_detail(session_id: str, _user: dict = Depends(require_admin)):
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
async def admin_terminate_session(session_id: str, data: dict = None, _user: dict = Depends(require_admin)):
    reason = data.get('reason', 'admin_terminated') if data else 'admin_terminated'
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.sessions.update_one(
        {'id': session_id},
        {'$set': {'status': 'terminated', 'last_activity': now_utc().isoformat()}}
    )
    await log_event(session_id, session.get('business_id', ''), 'session_terminated', {'reason': reason})
    return {'status': 'terminated'}

# ========== ADMIN: Stats ==========
@api_router.get("/admin/stats")
async def admin_stats(business_id: str = None, _user: dict = Depends(require_admin)):
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
async def admin_get_routes(_user: dict = Depends(require_admin_or_trainer)):
    routes = await db.routes.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(routes)

@api_router.post("/admin/routes")
async def admin_create_route(data: dict, _user: dict = Depends(require_admin_or_trainer)):
    route = {
        'id': gen_id(),
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'start_type': data.get('start_type', 'custom'),
        'start_label': data.get('start_label', ''),
        'difficulty': data.get('difficulty', 'easy'),
        'estimated_time_minutes': data.get('estimated_time_minutes', 15),
        'distance_value': data.get('distance_value', 0.0),
        'distance_unit': data.get('distance_unit', 'km'),
        'distance_label': data.get('distance_label', ''),
        'route_video_media_id': data.get('route_video_media_id', ''),
        'offline_pack_enabled': data.get('offline_pack_enabled', False),
        'checkpoint_count': 0,
        'status': data.get('status', 'draft'),
        'created_by': data.get('created_by', ''),
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat()
    }
    await db.routes.insert_one(route)
    return serialize_doc(route)

@api_router.put("/admin/routes/{route_id}")
async def admin_update_route(route_id: str, data: dict, _user: dict = Depends(require_admin_or_trainer)):
    data['updated_at'] = now_utc().isoformat()
    data.pop('id', None)
    data.pop('_id', None)
    result = await db.routes.update_one({'id': route_id}, {'$set': data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    route = await db.routes.find_one({'id': route_id}, {'_id': 0})
    return serialize_doc(route)

@api_router.delete("/admin/routes/{route_id}")
async def admin_delete_route(route_id: str, _user: dict = Depends(require_admin)):
    result = await db.routes.delete_one({'id': route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    await db.checkpoints.delete_many({'route_id': route_id})
    return {'status': 'deleted'}

@api_router.post("/admin/routes/{route_id}/duplicate")
async def admin_duplicate_route(route_id: str, _user: dict = Depends(require_admin_or_trainer)):
    """Duplicate a route and all its checkpoints."""
    route = await db.routes.find_one({'id': route_id}, {'_id': 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    new_route_id = gen_id()
    new_route = {
        **route,
        'id': new_route_id,
        'name': f"{route['name']} (Copy)",
        'status': 'draft',
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat(),
    }
    await db.routes.insert_one(new_route)
    # Duplicate checkpoints
    cps = await db.checkpoints.find({'route_id': route_id}, {'_id': 0}).to_list(200)
    if cps:
        for cp in cps:
            cp['id'] = gen_id()
            cp['route_id'] = new_route_id
            cp['created_at'] = now_utc().isoformat()
            cp['updated_at'] = now_utc().isoformat()
        await db.checkpoints.insert_many(cps)
    new_route['checkpoint_count'] = len(cps)
    await db.routes.update_one({'id': new_route_id}, {'$set': {'checkpoint_count': len(cps)}})
    return serialize_doc(new_route)

@api_router.get("/admin/routes/{route_id}/export")
async def admin_export_route(route_id: str, _user: dict = Depends(require_admin_or_trainer)):
    """Export a route and its checkpoints as JSON."""
    route = await db.routes.find_one({'id': route_id}, {'_id': 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    cps = await db.checkpoints.find({'route_id': route_id}, {'_id': 0}).sort('order', 1).to_list(200)
    return {'route': serialize_doc(route), 'checkpoints': serialize_doc(cps)}

@api_router.post("/admin/routes/import")
async def admin_import_route(data: dict, _user: dict = Depends(require_admin_or_trainer)):
    """Import a route from JSON. Creates new IDs."""
    route_data = data.get('route', {})
    cps_data = data.get('checkpoints', [])
    if not route_data.get('name'):
        raise HTTPException(status_code=400, detail="Route name is required in import data")
    new_route_id = gen_id()
    new_route = {
        'id': new_route_id,
        'name': route_data.get('name', ''),
        'description': route_data.get('description', ''),
        'start_type': route_data.get('start_type', 'custom'),
        'start_label': route_data.get('start_label', ''),
        'difficulty': route_data.get('difficulty', 'easy'),
        'estimated_time_minutes': route_data.get('estimated_time_minutes', 15),
        'checkpoint_count': 0,
        'status': 'draft',
        'created_by': _user.get('username', ''),
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat(),
    }
    await db.routes.insert_one(new_route)
    imported_cps = []
    for cp in cps_data:
        new_cp = {
            'id': gen_id(),
            'route_id': new_route_id,
            'order': cp.get('order', len(imported_cps) + 1),
            'name': cp.get('name', ''),
            'short_instruction': cp.get('short_instruction', ''),
            'long_instruction': cp.get('long_instruction', ''),
            'landmark_description': cp.get('landmark_description', ''),
            'what_to_look_for': cp.get('what_to_look_for', ''),
            'photo_url': cp.get('photo_url', ''),
            'video_url': cp.get('video_url', ''),
            'arrow_map_url': cp.get('arrow_map_url', ''),
            'direction': cp.get('direction', 'straight'),
            'indoor': cp.get('indoor', False),
            'floor_context': cp.get('floor_context', ''),
            'is_critical': cp.get('is_critical', True),
            'risk_level': cp.get('risk_level', 'low'),
            'fallback_text': cp.get('fallback_text', ''),
            'heading': cp.get('heading', 0.0),
            'lat': cp.get('lat', 0.0),
            'lng': cp.get('lng', 0.0),
            'created_at': now_utc().isoformat(),
            'updated_at': now_utc().isoformat(),
        }
        imported_cps.append(new_cp)
    if imported_cps:
        await db.checkpoints.insert_many(imported_cps)
    new_route['checkpoint_count'] = len(imported_cps)
    await db.routes.update_one({'id': new_route_id}, {'$set': {'checkpoint_count': len(imported_cps)}})
    return serialize_doc(new_route)

# ========== ADMIN: Checkpoints Management ==========
@api_router.get("/admin/checkpoints")
async def admin_get_checkpoints(route_id: str = None, _user: dict = Depends(require_admin_or_trainer)):
    query = {}
    if route_id:
        query['route_id'] = route_id
    cps = await db.checkpoints.find(query, {'_id': 0}).sort('order', 1).to_list(200)
    return serialize_doc(cps)

@api_router.post("/admin/checkpoints")
async def admin_create_checkpoint(data: dict, _user: dict = Depends(require_admin_or_trainer)):
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
        'recovery_tags': data.get('recovery_tags', []),
        'recovery_image_urls': data.get('recovery_image_urls', []),
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
async def admin_update_checkpoint(checkpoint_id: str, data: dict, _user: dict = Depends(require_admin_or_trainer)):
    data['updated_at'] = now_utc().isoformat()
    data.pop('id', None)
    data.pop('_id', None)
    result = await db.checkpoints.update_one({'id': checkpoint_id}, {'$set': data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    cp = await db.checkpoints.find_one({'id': checkpoint_id}, {'_id': 0})
    return serialize_doc(cp)

@api_router.delete("/admin/checkpoints/{checkpoint_id}")
async def admin_delete_checkpoint(checkpoint_id: str, _user: dict = Depends(require_admin_or_trainer)):
    cp = await db.checkpoints.find_one({'id': checkpoint_id})
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    await db.checkpoints.delete_one({'id': checkpoint_id})
    count = await db.checkpoints.count_documents({'route_id': cp['route_id']})
    await db.routes.update_one({'id': cp['route_id']}, {'$set': {'checkpoint_count': count}})
    return {'status': 'deleted'}

@api_router.post("/admin/checkpoints/reorder")
async def admin_reorder_checkpoints(data: dict, _user: dict = Depends(require_admin_or_trainer)):
    """Bulk update checkpoint order. Expects {order: [{id: ..., order: ...}]}."""
    items = data.get('order', [])
    if not items:
        raise HTTPException(status_code=400, detail="No order data provided")
    for item in items:
        await db.checkpoints.update_one(
            {'id': item['id']},
            {'$set': {'order': item['order'], 'updated_at': now_utc().isoformat()}}
        )
    return {'status': 'ok', 'updated': len(items)}

@api_router.post("/admin/checkpoints/{checkpoint_id}/duplicate")
async def admin_duplicate_checkpoint(checkpoint_id: str, _user: dict = Depends(require_admin_or_trainer)):
    """Duplicate a checkpoint within the same route, placed after the original."""
    cp = await db.checkpoints.find_one({'id': checkpoint_id}, {'_id': 0})
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    # Shift subsequent checkpoints
    await db.checkpoints.update_many(
        {'route_id': cp['route_id'], 'order': {'$gt': cp['order']}},
        {'$inc': {'order': 1}}
    )
    new_cp = {
        **cp,
        'id': gen_id(),
        'name': f"{cp['name']} (Copy)",
        'order': cp['order'] + 1,
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat(),
    }
    await db.checkpoints.insert_one(new_cp)
    count = await db.checkpoints.count_documents({'route_id': cp['route_id']})
    await db.routes.update_one({'id': cp['route_id']}, {'$set': {'checkpoint_count': count}})
    return serialize_doc(new_cp)

# ========== ADMIN: Users ==========
@api_router.get("/admin/users")
async def admin_get_users(_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(users)

@api_router.post("/admin/users")
async def admin_create_user(data: dict, _user: dict = Depends(require_admin)):
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
async def admin_toggle_user(user_id: str, _user: dict = Depends(require_admin)):
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_status = not user.get('active', True)
    await db.users.update_one({'id': user_id}, {'$set': {'active': new_status}})
    return {'active': new_status}

# ========== ADMIN: OTP Generation ==========
@api_router.post("/admin/otp/generate")
async def admin_generate_otp(data: dict, _user: dict = Depends(require_admin)):
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
async def admin_update_gold_rates(req: GoldRateUpdateRequest, _user: dict = Depends(require_admin)):
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
async def admin_get_gallery(_user: dict = Depends(require_admin)):
    items = await db.gallery_items.find({}, {'_id': 0}).to_list(100)
    return serialize_doc(items)

@api_router.post("/admin/gallery")
async def admin_create_gallery_item(data: dict, _user: dict = Depends(require_admin)):
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
async def admin_delete_gallery_item(item_id: str, _user: dict = Depends(require_admin)):
    result = await db.gallery_items.delete_one({'id': item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return {'status': 'deleted'}

# ========== ADMIN: QR Sources ==========
@api_router.get("/admin/qr-sources")
async def admin_get_qr_sources(_user: dict = Depends(require_admin)):
    sources = await db.qr_sources.find({}, {'_id': 0}).to_list(100)
    
    # Batch fetch businesses to avoid N+1
    biz_ids = list(set(s.get('business_id', '') for s in sources if s.get('business_id')))
    biz_lookup = {}
    if biz_ids:
        bizs = await db.businesses.find({'id': {'$in': biz_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(biz_ids))
        biz_lookup = {b['id']: b['name'] for b in bizs}
    
    result = []
    for s in sources:
        result.append({**serialize_doc(s), 'business_name': biz_lookup.get(s.get('business_id', ''), 'Unknown')})
    return result

@api_router.post("/admin/qr-sources")
async def admin_create_qr_source(data: dict, _user: dict = Depends(require_admin)):
    existing = await db.qr_sources.find_one({'code': data.get('code', '')})
    if existing:
        raise HTTPException(status_code=400, detail="QR code already exists")
    source = {
        'id': gen_id(),
        'code': data.get('code', ''),
        'business_id': data.get('business_id', ''),
        'campaign': data.get('campaign', 'default'),
        'description': data.get('description', ''),
        'source_label': data.get('source_label', ''),
        'default_route_id': data.get('default_route_id', ''),
        'entry_mode': data.get('entry_mode', 'fast'),
        'active': True,
        'scan_count': 0,
        'created_at': now_utc().isoformat()
    }
    await db.qr_sources.insert_one(source)
    return serialize_doc(source)

# ========== ADMIN: Businesses ==========
@api_router.get("/admin/businesses")
async def admin_get_businesses(_user: dict = Depends(require_admin)):
    businesses = await db.businesses.find({}, {'_id': 0}).to_list(10)
    return serialize_doc(businesses)

# ========== ADMIN: Analytics ==========
@api_router.get("/admin/analytics")
async def admin_analytics(business_id: str = None, days: int = 30, _user: dict = Depends(require_admin)):
    date_cutoff = (now_utc() - timedelta(days=days)).isoformat()
    
    query = {'created_at': {'$gte': date_cutoff}}
    if business_id:
        query['business_id'] = business_id
    
    # Total sessions (within date range)
    total = await db.sessions.count_documents(query)
    completed = await db.sessions.count_documents({**query, 'status': 'completed'})
    abandoned = await db.sessions.count_documents({**query, 'status': 'abandoned'})
    
    # Events breakdown (within date range)
    event_query = {'timestamp': {'$gte': date_cutoff}}
    if business_id:
        event_query['business_id'] = business_id
    
    pipeline = [
        {'$match': event_query},
        {'$group': {'_id': '$event_type', 'count': {'$sum': 1}}}
    ]
    event_counts = {}
    async for doc in db.session_events.aggregate(pipeline):
        event_counts[doc['_id']] = doc['count']
    
    # Top drop-off checkpoints (within date range, with $lookup to avoid N+1)
    drop_off_pipeline = [
        {'$match': {**event_query, 'event_type': 'cannot_find'}},
        {'$group': {'_id': '$checkpoint_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 5},
        {'$lookup': {
            'from': 'checkpoints',
            'localField': '_id',
            'foreignField': 'id',
            'as': 'checkpoint'
        }},
        {'$unwind': {'path': '$checkpoint', 'preserveNullAndEmptyArrays': True}}
    ]
    drop_offs = []
    async for doc in db.session_events.aggregate(drop_off_pipeline):
        cp = doc.get('checkpoint', {})
        drop_offs.append({
            'checkpoint_id': doc['_id'],
            'checkpoint_name': cp.get('name', 'Unknown'),
            'count': doc['count']
        })
    
    # Helpdesk stats (within date range)
    help_query = {'created_at': {'$gte': date_cutoff}}
    if business_id:
        help_query['business_id'] = business_id
    help_total = await db.helpdesk_cases.count_documents(help_query)
    help_resolved = await db.helpdesk_cases.count_documents({**help_query, 'status': 'resolved'})
    
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
async def admin_get_audit_logs(limit: int = 50, _user: dict = Depends(require_admin)):
    logs = await db.audit_logs.find({}, {'_id': 0}).sort('timestamp', -1).to_list(limit)
    return serialize_doc(logs)

# ========== HELPDESK ==========
@api_router.get("/helpdesk/cases")
async def helpdesk_get_cases(status: str = None, business_id: str = None, _user: dict = Depends(require_admin_or_helpdesk)):
    query = {}
    if status:
        query['status'] = status
    if business_id:
        query['business_id'] = business_id
    cases = await db.helpdesk_cases.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Batch fetch businesses and sessions to avoid N+1
    biz_ids = list(set(c.get('business_id', '') for c in cases if c.get('business_id')))
    session_ids = list(set(c.get('session_id', '') for c in cases if c.get('session_id')))
    
    biz_lookup = {}
    if biz_ids:
        bizs = await db.businesses.find({'id': {'$in': biz_ids}}, {'_id': 0, 'id': 1, 'name': 1, 'slug': 1}).to_list(len(biz_ids))
        biz_lookup = {b['id']: b for b in bizs}
    
    session_lookup = {}
    if session_ids:
        sessions = await db.sessions.find({'id': {'$in': session_ids}}, {'_id': 0, 'id': 1, 'status': 1}).to_list(len(session_ids))
        session_lookup = {s['id']: s for s in sessions}
    
    result = []
    for case in cases:
        biz = biz_lookup.get(case.get('business_id', ''), {})
        sess = session_lookup.get(case.get('session_id', ''), {})
        result.append({
            **serialize_doc(case),
            'business_name': biz.get('name', 'Unknown'),
            'business_slug': biz.get('slug', ''),
            'route_name': '',
            'session_status': sess.get('status', 'unknown')
        })
    return result

@api_router.get("/helpdesk/cases/{case_id}")
async def helpdesk_get_case_detail(case_id: str, _user: dict = Depends(require_admin_or_helpdesk)):
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
async def helpdesk_case_action(case_id: str, req: HelpdeskActionRequest, _user: dict = Depends(require_admin_or_helpdesk)):
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
        'note_added': case.get('status', 'open'),
        'claimed': 'acknowledged',
        'unclaimed': case.get('status', 'open'),
        'whatsapp_sent': 'in_progress',
        'video_attempted': 'in_progress',
    }
    new_status = status_map.get(req.action, case.get('status', 'open'))
    
    case_update = {'status': new_status, 'updated_at': now_utc().isoformat()}
    # Keep assigned_to in sync: claim sets it, unclaim clears it
    if req.action == 'claimed':
        case_update['assigned_to'] = _user.get('id', '')
    elif req.action == 'unclaimed':
        case_update['assigned_to'] = ''
    
    await db.helpdesk_cases.update_one({'id': case_id}, {'$set': case_update})
    
    update = {
        'id': gen_id(),
        'case_id': case_id,
        'action': req.action,
        'note': req.note,
        'performed_by': _user.get('id', ''),
        'timestamp': now_utc().isoformat()
    }
    await db.helpdesk_case_updates.insert_one(update)
    
    return serialize_doc(update)

@api_router.get("/helpdesk/callbacks")
async def helpdesk_get_callbacks(status: str = None, _user: dict = Depends(require_admin_or_helpdesk)):
    query = {}
    if status:
        query['status'] = status
    callbacks = await db.callback_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    # Batch fetch businesses to avoid N+1
    biz_ids = list(set(cb.get('business_id', '') for cb in callbacks if cb.get('business_id')))
    biz_lookup = {}
    if biz_ids:
        bizs = await db.businesses.find({'id': {'$in': biz_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(biz_ids))
        biz_lookup = {b['id']: b['name'] for b in bizs}
    
    result = []
    for cb in callbacks:
        result.append({
            **serialize_doc(cb),
            'business_name': biz_lookup.get(cb.get('business_id', ''), 'Unknown')
        })
    return result

# ========== HELPDESK: SSE Notifications ==========
@api_router.get("/helpdesk/notifications/stream")
async def helpdesk_sse_stream(request: Request, token: str = Query(None), credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """SSE endpoint for helpdesk real-time notifications. Accepts JWT via query param or Authorization header."""
    # SSE connections can't easily use Authorization header, so accept token via query param too
    jwt_token = None
    if credentials:
        jwt_token = credentials.credentials
    elif token:
        jwt_token = token
    
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    payload = decode_jwt(jwt_token)
    user = await db.users.find_one({'id': payload['sub'], 'active': True})
    if not user or user.get('role') not in ('admin', 'helpdesk'):
        raise HTTPException(status_code=403, detail="Admin or Helpdesk access required")
    
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
                    yield ": keepalive\n\n"
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
async def llm_suggest_checkpoint(data: dict, _user: dict = Depends(require_admin_or_trainer)):
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
    
    # Scope checkpoints to the session's selected route
    cp_query = {}
    if session_id:
        session = await db.sessions.find_one({'id': session_id})
        route_id = session.get('route_id', '') if session else ''
        if route_id:
            cp_query['route_id'] = route_id
    
    all_checkpoints = await db.checkpoints.find(cp_query, {'_id': 0}).to_list(200)
    
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

# ========== PUBLIC: Location Consent + Updates ==========
@api_router.post("/sessions/{session_id}/location-consent")
async def update_location_consent(session_id: str, data: dict):
    """Customer grants or denies location permission."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    granted = data.get('granted', False)
    state = 'granted' if granted else 'denied'
    update = {
        'location_consent_granted': granted,
        'location_consent_at': now_utc().isoformat(),
        'location_permission_state': state,
        'last_activity': now_utc().isoformat(),
    }
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    event_type = 'location_consent_granted' if granted else 'location_consent_denied'
    await log_event(session_id, session['business_id'], event_type, {'state': state})
    if granted:
        await notify_helpdesk({
            'type': 'location_consent_granted',
            'session_id': session_id,
            'customer_name': session.get('customer_name', ''),
            'timestamp': now_utc().isoformat(),
        })
    return {'status': 'ok', 'location_permission_state': state}

@api_router.post("/sessions/{session_id}/location-update")
async def update_location(session_id: str, data: dict):
    """Periodic location update from customer."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.get('location_consent_granted'):
        raise HTTPException(status_code=403, detail="Location consent not granted")
    update = {
        'last_known_lat': data.get('lat', 0.0),
        'last_known_lng': data.get('lng', 0.0),
        'last_known_location_text': data.get('location_text', ''),
        'last_location_at': now_utc().isoformat(),
        'location_permission_state': 'granted',
        'last_activity': now_utc().isoformat(),
    }
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    return {'status': 'ok'}

# ========== PUBLIC: Route Selection with Distance ==========
@api_router.post("/sessions/{session_id}/select-route")
async def select_route(session_id: str, data: dict):
    """Customer selects a route. Stores route distance from trainer data."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    route_id = data.get('route_id', '')
    route = await db.routes.find_one({'id': route_id, 'status': 'published'}, {'_id': 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found or not published")
    update = {
        'route_id': route_id,
        'route_distance_value': route.get('distance_value', 0.0),
        'route_distance_unit': route.get('distance_unit', 'km'),
        'started_at': now_utc().isoformat(),
        'last_activity': now_utc().isoformat(),
    }
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    await log_event(session_id, session['business_id'], 'route_selected', {
        'route_id': route_id, 'route_name': route['name'],
        'distance_value': route.get('distance_value', 0),
        'distance_unit': route.get('distance_unit', 'km'),
    })
    await notify_helpdesk({
        'type': 'navigation_started',
        'session_id': session_id,
        'customer_name': session.get('customer_name', ''),
        'route_name': route['name'],
        'business_id': session['business_id'],
        'timestamp': now_utc().isoformat(),
    })
    return {'status': 'ok', 'route': serialize_doc(route)}

# ========== PUBLIC: Session Recovery ==========
@api_router.post("/sessions/{session_id}/recover")
async def session_recover(session_id: str, data: dict):
    """Customer confirms they see a checkpoint — resume navigation from there."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    route_id = session.get('route_id', '')
    if not route_id:
        raise HTTPException(status_code=400, detail="No route selected for this session")
    checkpoint_id = data.get('checkpoint_id', '')
    cp = await db.checkpoints.find_one({'id': checkpoint_id}, {'_id': 0})
    if not cp:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    if cp.get('route_id') != route_id:
        raise HTTPException(status_code=400, detail="Checkpoint does not belong to this session's route")
    update = {
        'current_checkpoint_id': checkpoint_id,
        'current_checkpoint_order': cp.get('order', 0),
        'last_recovery_checkpoint_id': checkpoint_id,
        'last_activity': now_utc().isoformat(),
    }
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    await log_event(session_id, session['business_id'], 'recovery_matched', {
        'checkpoint_id': checkpoint_id, 'checkpoint_name': cp['name'],
    })
    return {'status': 'ok', 'checkpoint': serialize_doc(cp)}

# ========== PUBLIC: Recovery Candidates ==========
@api_router.get("/sessions/{session_id}/recovery-candidates")
async def get_recovery_candidates(session_id: str):
    """Get checkpoint candidates for picture-based recovery."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    route_id = session.get('route_id', '')
    if not route_id:
        raise HTTPException(status_code=400, detail="No route selected")
    cps = await db.checkpoints.find(
        {'route_id': route_id}, {'_id': 0}
    ).sort('order', 1).to_list(100)
    return serialize_doc(cps)

# ========== PUBLIC: Assist Event Logging ==========
@api_router.post("/sessions/{session_id}/assist-event")
async def log_assist_event(session_id: str, data: dict):
    """Log WhatsApp/call/video assist events."""
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    event_type = data.get('event_type', '')
    valid_types = [
        'whatsapp_video_attempted', 'whatsapp_video_fallback_chat',
        'whatsapp_chat', 'phone_call', 'whatsapp_video_started',
        'whatsapp_video_ended',
    ]
    if event_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid assist event type. Valid: {valid_types}")
    # Update assistance mode on session
    mode_map = {
        'whatsapp_video_attempted': 'whatsapp_video',
        'whatsapp_video_started': 'whatsapp_video',
        'whatsapp_chat': 'whatsapp_chat',
        'whatsapp_video_fallback_chat': 'whatsapp_chat',
        'phone_call': 'phone_call',
    }
    status_map = {
        'whatsapp_video_ended': 'ended',
    }
    update = {'last_activity': now_utc().isoformat()}
    if event_type in mode_map:
        update['assistance_mode'] = mode_map[event_type]
        update['assistance_status'] = 'active'
    if event_type in status_map:
        update['assistance_status'] = status_map[event_type]
    await db.sessions.update_one({'id': session_id}, {'$set': update})
    await log_event(session_id, session['business_id'], event_type, data.get('event_data', {}))
    await notify_helpdesk({
        'type': event_type,
        'session_id': session_id,
        'customer_name': session.get('customer_name', ''),
        'business_id': session['business_id'],
        'timestamp': now_utc().isoformat(),
    })
    return {'status': 'ok'}

# ========== HELPDESK: Live Customer Queue ==========
@api_router.get("/helpdesk/live-customers")
async def helpdesk_live_customers(_user: dict = Depends(require_admin_or_helpdesk)):
    """Get all active sessions with enriched data for helpdesk console."""
    sessions = await db.sessions.find({'status': 'active'}, {'_id': 0}).sort('last_activity', -1).to_list(200)
    # Batch lookups
    biz_ids = list(set(s.get('business_id', '') for s in sessions if s.get('business_id')))
    route_ids = list(set(s.get('route_id', '') for s in sessions if s.get('route_id')))
    cp_ids = list(set(s.get('current_checkpoint_id', '') for s in sessions if s.get('current_checkpoint_id')))
    biz_lookup = {}
    if biz_ids:
        for b in await db.businesses.find({'id': {'$in': biz_ids}}, {'_id': 0, 'id': 1, 'name': 1, 'slug': 1, 'contact_phone': 1, 'contact_whatsapp': 1}).to_list(len(biz_ids)):
            biz_lookup[b['id']] = b
    route_lookup = {}
    if route_ids:
        for r in await db.routes.find({'id': {'$in': route_ids}}, {'_id': 0, 'id': 1, 'name': 1, 'distance_value': 1, 'distance_unit': 1, 'distance_label': 1}).to_list(len(route_ids)):
            route_lookup[r['id']] = r
    cp_lookup = {}
    if cp_ids:
        for c in await db.checkpoints.find({'id': {'$in': cp_ids}}, {'_id': 0, 'id': 1, 'name': 1, 'order': 1}).to_list(len(cp_ids)):
            cp_lookup[c['id']] = c
    # Pending help cases
    open_cases = await db.helpdesk_cases.find({'status': {'$in': ['open', 'acknowledged', 'in_progress']}}, {'_id': 0, 'session_id': 1, 'case_type': 1}).to_list(500)
    help_sessions = set(c['session_id'] for c in open_cases)
    result = []
    for s in sessions:
        biz = biz_lookup.get(s.get('business_id', ''), {})
        route = route_lookup.get(s.get('route_id', ''), {})
        cp = cp_lookup.get(s.get('current_checkpoint_id', ''), {})
        result.append({
            **serialize_doc(s),
            'business_name': biz.get('name', ''),
            'business_slug': biz.get('slug', ''),
            'route_name': route.get('name', ''),
            'route_distance_value': route.get('distance_value', 0),
            'route_distance_unit': route.get('distance_unit', ''),
            'route_distance_label': route.get('distance_label', ''),
            'current_checkpoint_name': cp.get('name', ''),
            'current_checkpoint_order': cp.get('order', 0),
            'has_open_help': s.get('id', '') in help_sessions,
            'contact_phone': biz.get('contact_phone', ''),
            'contact_whatsapp': biz.get('contact_whatsapp', ''),
        })
    return result

# ========== HELPDESK: Claim/Unclaim Session ==========
@api_router.post("/helpdesk/sessions/{session_id}/claim")
async def helpdesk_claim_session(session_id: str, _user: dict = Depends(require_admin_or_helpdesk)):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    user_id = _user.get('id', '')
    await db.sessions.update_one({'id': session_id}, {'$set': {
        'assigned_helpdesk_user_id': user_id,
        'last_activity': now_utc().isoformat(),
    }})
    # Also assign all open cases for this session to the same user
    await db.helpdesk_cases.update_many(
        {'session_id': session_id, 'status': {'$in': ['open', 'acknowledged', 'in_progress']}},
        {'$set': {'assigned_to': user_id, 'updated_at': now_utc().isoformat()}},
    )
    return {'status': 'claimed', 'assigned_to': _user.get('username', '')}

@api_router.post("/helpdesk/sessions/{session_id}/unclaim")
async def helpdesk_unclaim_session(session_id: str, _user: dict = Depends(require_admin_or_helpdesk)):
    session = await db.sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.sessions.update_one({'id': session_id}, {'$set': {
        'assigned_helpdesk_user_id': '',
        'last_activity': now_utc().isoformat(),
    }})
    await db.helpdesk_cases.update_many(
        {'session_id': session_id, 'status': {'$in': ['open', 'acknowledged', 'in_progress']}},
        {'$set': {'assigned_to': '', 'updated_at': now_utc().isoformat()}},
    )
    return {'status': 'unclaimed'}


@api_router.get("/helpdesk/recent-completed")
async def helpdesk_recent_completed(_user: dict = Depends(require_admin_or_helpdesk)):
    """Get recently completed/abandoned sessions (last 2 hours) for helpdesk view."""
    cutoff = (now_utc() - timedelta(hours=2)).isoformat()
    sessions = await db.sessions.find(
        {'status': {'$in': ['completed', 'abandoned', 'terminated']}, 'last_activity': {'$gte': cutoff}},
        {'_id': 0}
    ).sort('last_activity', -1).to_list(50)
    route_ids = list(set(s.get('route_id', '') for s in sessions if s.get('route_id')))
    route_lookup = {}
    if route_ids:
        for r in await db.routes.find({'id': {'$in': route_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(route_ids)):
            route_lookup[r['id']] = r['name']
    result = []
    for s in sessions:
        result.append({**serialize_doc(s), 'route_name': route_lookup.get(s.get('route_id', ''), '')})
    return result


# ========== ADMIN: Reports & Export ==========
@api_router.get("/admin/reports/sessions")
async def admin_report_sessions(
    status: str = None, route_id: str = None, business_id: str = None,
    source_id: str = None, date_from: str = None, date_to: str = None,
    assigned_to: str = None, limit: int = 500,
    _user: dict = Depends(require_admin),
):
    """Session report with filters for admin export."""
    query = {}
    if status:
        query['status'] = status
    if route_id:
        query['route_id'] = route_id
    if business_id:
        query['business_id'] = business_id
    if source_id:
        query['qr_source_id'] = source_id
    if assigned_to:
        query['assigned_helpdesk_user_id'] = assigned_to
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = date_from
        if date_to:
            date_q['$lte'] = date_to
        query['created_at'] = date_q
    sessions = await db.sessions.find(query, {'_id': 0}).sort('created_at', -1).to_list(limit)
    # Enrich with route names
    route_ids = list(set(s.get('route_id', '') for s in sessions if s.get('route_id')))
    route_lookup = {}
    if route_ids:
        for r in await db.routes.find({'id': {'$in': route_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(route_ids)):
            route_lookup[r['id']] = r['name']
    result = []
    for s in sessions:
        result.append({**serialize_doc(s), 'route_name': route_lookup.get(s.get('route_id', ''), '')})
    return result

@api_router.get("/admin/reports/export")
async def admin_export_report(
    format: str = "csv",
    status: str = None, route_id: str = None, business_id: str = None,
    date_from: str = None, date_to: str = None, limit: int = 1000,
    _user: dict = Depends(require_admin),
):
    """Export session data as CSV or XLSX."""
    query = {}
    if status:
        query['status'] = status
    if route_id:
        query['route_id'] = route_id
    if business_id:
        query['business_id'] = business_id
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = date_from
        if date_to:
            date_q['$lte'] = date_to
        query['created_at'] = date_q
    sessions = await db.sessions.find(query, {'_id': 0}).sort('created_at', -1).to_list(limit)
    # Enrich
    route_ids = list(set(s.get('route_id', '') for s in sessions if s.get('route_id')))
    route_lookup = {}
    if route_ids:
        for r in await db.routes.find({'id': {'$in': route_ids}}, {'_id': 0, 'id': 1, 'name': 1}).to_list(len(route_ids)):
            route_lookup[r['id']] = r['name']
    columns = [
        'id', 'customer_name', 'customer_phone', 'business_slug', 'route_name',
        'route_distance_value', 'route_distance_unit', 'status',
        'entry_source_label', 'entry_campaign', 'started_at', 'completed_at',
        'location_permission_state', 'assigned_helpdesk_user_id', 'created_at',
    ]
    rows = []
    for s in sessions:
        row = {c: s.get(c, '') for c in columns}
        row['route_name'] = route_lookup.get(s.get('route_id', ''), '')
        rows.append(row)
    if format == 'xlsx':
        try:
            import openpyxl
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = 'Sessions'
            ws.append(columns)
            for row in rows:
                ws.append([row.get(c, '') for c in columns])
            buf = io.BytesIO()
            wb.save(buf)
            buf.seek(0)
            return Response(
                content=buf.getvalue(),
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={'Content-Disposition': 'attachment; filename="sessions_report.xlsx"'},
            )
        except ImportError:
            raise HTTPException(status_code=500, detail="openpyxl not installed for XLSX export")
    else:
        import csv as csv_mod
        buf = io.StringIO()
        writer = csv_mod.DictWriter(buf, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
        return Response(
            content=buf.getvalue(),
            media_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename="sessions_report.csv"'},
        )

# ========== ADMIN: Enhanced Stats ==========
@api_router.get("/admin/stats/enhanced")
async def admin_enhanced_stats(business_id: str = None, _user: dict = Depends(require_admin)):
    """Central KPIs for admin dashboard."""
    query = {}
    if business_id:
        query['business_id'] = business_id
    total = await db.sessions.count_documents(query)
    active = await db.sessions.count_documents({**query, 'status': 'active'})
    completed = await db.sessions.count_documents({**query, 'status': 'completed'})
    abandoned = await db.sessions.count_documents({**query, 'status': 'abandoned'})
    terminated = await db.sessions.count_documents({**query, 'status': 'terminated'})
    help_pending = await db.helpdesk_cases.count_documents({
        **({'business_id': business_id} if business_id else {}),
        'status': {'$in': ['open', 'acknowledged']},
    })
    assisted = await db.sessions.count_documents({**query, 'status': 'active', 'assistance_status': 'active'})
    # Route-wise usage
    route_pipeline = [
        {'$match': {**query, 'route_id': {'$ne': ''}}},
        {'$group': {'_id': '$route_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10},
    ]
    route_usage = []
    async for doc in db.sessions.aggregate(route_pipeline):
        route = await db.routes.find_one({'id': doc['_id']}, {'_id': 0, 'name': 1})
        route_usage.append({'route_id': doc['_id'], 'route_name': route.get('name', '') if route else '', 'count': doc['count']})
    # Source-wise usage
    source_pipeline = [
        {'$match': {**query, 'qr_source_id': {'$ne': ''}}},
        {'$group': {'_id': '$qr_source_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10},
    ]
    source_usage = []
    async for doc in db.sessions.aggregate(source_pipeline):
        qr = await db.qr_sources.find_one({'id': doc['_id']}, {'_id': 0, 'code': 1, 'source_label': 1, 'campaign': 1})
        source_usage.append({
            'source_id': doc['_id'],
            'source_code': qr.get('code', '') if qr else '',
            'source_label': qr.get('source_label', '') if qr else '',
            'count': doc['count'],
        })
    return {
        'total_sessions': total,
        'active_sessions': active,
        'completed_sessions': completed,
        'abandoned_sessions': abandoned,
        'terminated_sessions': terminated,
        'help_pending': help_pending,
        'currently_assisted': assisted,
        'route_usage': route_usage,
        'source_usage': source_usage,
    }

# ========== ADMIN: User Performance ==========
@api_router.get("/admin/users/{user_id}/performance")
async def admin_user_performance(user_id: str, _user: dict = Depends(require_admin)):
    """Helpdesk user performance metrics."""
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    customers_handled = await db.sessions.count_documents({'assigned_helpdesk_user_id': user_id})
    cases_handled = await db.helpdesk_cases.count_documents({'assigned_to': user_id})
    cases_resolved = await db.helpdesk_cases.count_documents({'assigned_to': user_id, 'status': 'resolved'})
    completions_assisted = await db.sessions.count_documents({
        'assigned_helpdesk_user_id': user_id, 'status': 'completed',
    })
    return {
        'user': serialize_doc(user),
        'customers_handled': customers_handled,
        'cases_handled': cases_handled,
        'cases_resolved': cases_resolved,
        'completions_assisted': completions_assisted,
    }

# ========== Root ==========
@api_router.get("/")
async def root():
    return {"message": "Yash Ornaments WayFinder API", "version": "3.0.0"}

# ========== PUBLIC: Visiting Card Upload (Yash-only, optional) ==========
@api_router.post("/public/upload-card")
async def public_upload_card(file: UploadFile = File(...)):
    """Public endpoint for customers to upload a visiting card photo. No auth required."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'png'
    if file_ext not in {'jpg', 'jpeg', 'png', 'webp'}:
        raise HTTPException(status_code=400, detail="Only image files accepted (jpg, png, webp)")
    # 5 MB limit for cards
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")
    media_id = gen_id()
    filename = f"{media_id}_card.{file_ext}"
    file_path = ORIGINALS_DIR / filename
    file_path.write_bytes(contents)
    media_record = {
        'id': media_id,
        'filename': filename,
        'original_filename': file.filename,
        'media_type': 'visiting_card',
        'file_ext': file_ext,
        'file_size': len(contents),
        'route_id': '',
        'checkpoint_id': '',
        'uploaded_by': 'customer',
        'watermarked': False,
        'created_at': now_utc().isoformat(),
    }
    await db.media_files.insert_one(media_record)
    return serialize_doc(media_record)

# ========== MEDIA UPLOAD + WATERMARK ==========
@api_router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    route_id: str = Form(""),
    checkpoint_id: str = Form(""),
    media_type: str = Form("checkpoint_image"),  # checkpoint_image, arrow_map, route_image, route_video
    uploaded_by: str = Form(""),
    _user: dict = Depends(require_admin_or_trainer),
):
    """Upload media with automatic watermarking."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'png'
    allowed_exts = {'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'mp4', 'mov', 'avi', 'webm'}
    if file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File type .{file_ext} not allowed. Supported: {', '.join(sorted(allowed_exts))}")
    
    media_id = gen_id()
    original_filename = f"{media_id}_original.{file_ext}"
    watermarked_filename = f"{media_id}_watermarked.{file_ext}"
    
    # Read file content
    content = await file.read()
    max_size = 50 * 1024 * 1024  # 50 MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large ({len(content) // (1024*1024)}MB). Maximum is 50MB.")
    
    # Save original
    original_path = ORIGINALS_DIR / original_filename
    with open(original_path, 'wb') as f:
        f.write(content)
    
    # Get branding config from DB
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    config = get_branding_config(branding)
    
    watermark_applied = False
    watermarked_path_str = str(WATERMARKED_DIR / watermarked_filename)
    
    # Apply watermark for images
    if file_ext in ('jpg', 'jpeg', 'png', 'webp', 'bmp'):
        try:
            apply_watermark_to_image(
                str(original_path),
                watermarked_path_str,
                watermark_text=config['watermark_text'],
                opacity=config['watermark_opacity'],
                font_size=config.get('watermark_font_size', 36),
                rotation=int(config.get('watermark_rotation', -30)),
                spacing=int(config.get('watermark_spacing', 200)),
            )
            watermark_applied = True
        except Exception as e:
            logger.error(f"Watermark failed: {e}")
            shutil.copy2(str(original_path), watermarked_path_str)
    else:
        # For non-image files (video etc), just copy for now
        shutil.copy2(str(original_path), watermarked_path_str)
    
    # Store metadata in DB
    media_doc = {
        'id': media_id,
        'filename': file.filename,
        'file_ext': file_ext,
        'media_type': media_type,
        'route_id': route_id,
        'checkpoint_id': checkpoint_id,
        'uploaded_by': uploaded_by,
        'upload_timestamp': now_utc().isoformat(),
        'watermark_applied': watermark_applied,
        'watermark_text': config['watermark_text'],
        'original_file': original_filename,
        'watermarked_file': watermarked_filename,
        'file_size': len(content),
        'content_type': file.content_type or 'application/octet-stream',
    }
    await db.media_files.insert_one(media_doc)
    
    return serialize_doc(media_doc)

@api_router.get("/media/{media_id}/serve")
async def serve_media(media_id: str, original: bool = False, credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Serve watermarked media (or original for admin preview)."""
    # Auth check FIRST for original media requests
    if original:
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required for original media")
        payload = decode_jwt(credentials.credentials)
        user = await db.users.find_one({'id': payload['sub'], 'active': True})
        if not user or user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required for original media")
    
    media = await db.media_files.find_one({'id': media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if original:
        file_path = ORIGINALS_DIR / media['original_file']
    else:
        file_path = WATERMARKED_DIR / media['watermarked_file']
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    content_type = media.get('content_type', 'application/octet-stream')
    ext = media.get('file_ext', 'png')
    if ext in ('jpg', 'jpeg'):
        content_type = 'image/jpeg'
    elif ext == 'png':
        content_type = 'image/png'
    elif ext == 'webp':
        content_type = 'image/webp'
    
    # Add headers to prevent direct downloading/hotlinking
    headers = {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
    }
    
    return Response(
        content=file_path.read_bytes(),
        media_type=content_type,
        headers=headers,
    )

@api_router.get("/media/{media_id}/preview-watermark")
async def preview_watermark(media_id: str):
    """Preview what the watermarked version looks like."""
    media = await db.media_files.find_one({'id': media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    wm_path = WATERMARKED_DIR / media['watermarked_file']
    if not wm_path.exists():
        raise HTTPException(status_code=404, detail="Watermarked file not found")
    
    ext = media.get('file_ext', 'png')
    ct = 'image/jpeg' if ext in ('jpg', 'jpeg') else 'image/png'
    
    return Response(content=wm_path.read_bytes(), media_type=ct)

@api_router.get("/media/placeholder/{label}")
async def get_placeholder_image(label: str = "Checkpoint"):
    """Generate a watermarked placeholder image on-the-fly."""
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    config = get_branding_config(branding)
    
    img_bytes = generate_placeholder_watermarked(
        label=label.replace('-', ' '),
        watermark_text=config['watermark_text'],
        opacity=config['watermark_opacity'],
    )
    return Response(content=img_bytes, media_type="image/jpeg")

# ========== ADMIN: Media Management ==========
@api_router.get("/admin/media")
async def admin_get_media(
    media_type: str = None, route_id: str = None, checkpoint_id: str = None,
    search: str = None, _user: dict = Depends(require_admin_or_trainer),
):
    query = {}
    if media_type and media_type != 'all':
        query['media_type'] = media_type
    if route_id and route_id != 'all':
        query['route_id'] = route_id
    if checkpoint_id:
        query['checkpoint_id'] = checkpoint_id
    if search:
        query['filename'] = {'$regex': search, '$options': 'i'}
    media = await db.media_files.find(query, {'_id': 0}).sort('upload_timestamp', -1).to_list(500)
    return serialize_doc(media)

@api_router.delete("/admin/media/{media_id}")
async def admin_delete_media(media_id: str, _user: dict = Depends(require_admin)):
    media = await db.media_files.find_one({'id': media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Delete files
    for fname_key in ['original_file', 'watermarked_file']:
        fname = media.get(fname_key, '')
        if fname:
            for d in [ORIGINALS_DIR, WATERMARKED_DIR]:
                fp = d / fname
                if fp.exists():
                    fp.unlink()
    
    await db.media_files.delete_one({'id': media_id})
    return {'status': 'deleted'}

# ========== ADMIN: Branding Settings ==========
@api_router.get("/admin/branding")
async def admin_get_branding(_user: dict = Depends(require_admin)):
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    if not branding:
        branding = {
            'id': gen_id(),
            'watermark_text': 'YASH ORNAMENTS',
            'watermark_opacity': 0.20,
            'watermark_font_size': 36,
            'watermark_rotation': -30,
            'watermark_spacing': 200,
            'branding_footer': 'Navigation powered by YASH ORNAMENTS',
            'app_name': 'Yash Ornaments WayFinder',
            'updated_at': now_utc().isoformat(),
        }
        await db.branding_settings.insert_one(branding)
    return serialize_doc(branding)

@api_router.put("/admin/branding")
async def admin_update_branding(data: dict, _user: dict = Depends(require_admin)):
    existing = await db.branding_settings.find_one({})
    data['updated_at'] = now_utc().isoformat()
    data.pop('_id', None)
    
    if existing:
        await db.branding_settings.update_one({'_id': existing['_id']}, {'$set': data})
    else:
        data['id'] = gen_id()
        await db.branding_settings.insert_one(data)
    
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    return serialize_doc(branding)

# ========== ADMIN: QR Code Generation ==========
@api_router.post("/admin/qr/generate")
async def admin_generate_qr(data: dict, _user: dict = Depends(require_admin)):
    """Generate a QR code for AJPL or Yash Ornaments."""
    business_id = data.get('business_id', '')
    campaign = data.get('campaign', 'qr-generated')
    description = data.get('description', '')
    
    if not business_id:
        raise HTTPException(status_code=400, detail="business_id required")
    
    business = await db.businesses.find_one({'id': business_id})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Generate unique QR code
    qr_code = f"{business['slug'].upper()}-{secrets.token_hex(4).upper()}"
    
    # Create QR source in DB
    qr_source = {
        'id': gen_id(),
        'code': qr_code,
        'business_id': business_id,
        'campaign': campaign,
        'description': description or f"Generated QR for {business['name']}",
        'active': True,
        'scan_count': 0,
        'created_at': now_utc().isoformat(),
    }
    await db.qr_sources.insert_one(qr_source)
    
    # Generate QR code image
    # The QR should encode a URL that includes the code
    frontend_url = os.environ.get('FRONTEND_URL', 'https://checkpoint-recovery-3.preview.emergentagent.com')
    scan_url = f"{frontend_url}/scan/{qr_code}"
    
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(scan_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR image
    qr_filename = f"qr_{qr_code}.png"
    qr_path = QR_DIR / qr_filename
    img.save(str(qr_path))
    
    # Convert to bytes for response
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    import base64
    qr_base64 = base64.b64encode(img_bytes.getvalue()).decode('utf-8')
    
    return {
        'qr_source': serialize_doc(qr_source),
        'qr_code': qr_code,
        'scan_url': scan_url,
        'qr_image_base64': qr_base64,
        'business_name': business['name'],
        'business_slug': business['slug'],
    }

@api_router.get("/admin/qr/{qr_code}/image")
async def admin_get_qr_image(qr_code: str, _user: dict = Depends(require_admin)):
    """Serve QR code image."""
    qr_filename = f"qr_{qr_code}.png"
    qr_path = QR_DIR / qr_filename
    if not qr_path.exists():
        raise HTTPException(status_code=404, detail="QR image not found")
    return Response(content=qr_path.read_bytes(), media_type="image/png")

# ========== PUBLIC: Scan QR entry (for the new customer flow) ==========
@api_router.get("/scan/{qr_code}/info")
async def get_qr_info(qr_code: str):
    """Get QR code info for the customer landing page."""
    qr = await db.qr_sources.find_one({'code': qr_code, 'active': True})
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    
    business = await db.businesses.find_one({'id': qr['business_id']})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    
    # Fetch default route info if set
    default_route = None
    if qr.get('default_route_id'):
        default_route = await db.routes.find_one({'id': qr['default_route_id'], 'status': 'published'}, {'_id': 0})
    
    return {
        'qr_code': qr_code,
        'business': serialize_doc(business),
        'branding_footer': branding.get('branding_footer', 'Navigation powered by YASH ORNAMENTS') if branding else 'Navigation powered by YASH ORNAMENTS',
        'entry_mode': qr.get('entry_mode', 'fast'),
        'source_label': qr.get('source_label', ''),
        'default_route': serialize_doc(default_route),
    }

@api_router.post("/scan/{qr_code}/register")
async def register_from_scan(qr_code: str, data: dict):
    """Register customer from QR scan landing page (name + phone)."""
    customer_name = data.get('customer_name', '')
    customer_phone = data.get('customer_phone', '')
    
    if not customer_name or not customer_phone:
        raise HTTPException(status_code=400, detail="Name and phone number required")
    
    qr = await db.qr_sources.find_one({'code': qr_code, 'active': True})
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid QR code")
    
    business = await db.businesses.find_one({'id': qr['business_id']})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Increment scan count
    await db.qr_sources.update_one({'code': qr_code}, {'$inc': {'scan_count': 1}})
    
    preselected_route_id = qr.get('default_route_id', '')
    route_distance_value = 0.0
    route_distance_unit = ''
    if preselected_route_id:
        route = await db.routes.find_one({'id': preselected_route_id, 'status': 'published'}, {'_id': 0})
        if route:
            route_distance_value = route.get('distance_value', 0.0)
            route_distance_unit = route.get('distance_unit', 'km')
    
    session = {
        'id': gen_id(),
        'business_id': business['id'],
        'business_slug': business['slug'],
        'qr_source_id': qr['id'],
        'campaign': qr.get('campaign', ''),
        'entry_source_type': 'qr',
        'entry_source_id': qr['id'],
        'entry_source_label': qr.get('source_label', '') or qr.get('description', ''),
        'entry_campaign': qr.get('campaign', ''),
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'customer_card_media_id': data.get('customer_card_media_id', ''),
        'route_id': preselected_route_id,
        'route_distance_value': route_distance_value,
        'route_distance_unit': route_distance_unit,
        'current_checkpoint_id': '',
        'current_checkpoint_order': 0,
        'status': 'active',
        'arrived_building': False,
        'arrived_destination': False,
        'device_info': data.get('device_info', ''),
        'started_at': '',
        'completed_at': '',
        'abandoned_at': '',
        'help_requested': False,
        'callback_requested': False,
        'location_consent_granted': False,
        'location_consent_at': '',
        'location_permission_state': 'unknown',
        'last_known_lat': 0.0,
        'last_known_lng': 0.0,
        'last_known_location_text': '',
        'last_location_at': '',
        'assigned_helpdesk_user_id': '',
        'assistance_mode': '',
        'assistance_status': '',
        'last_recovery_checkpoint_id': '',
        'last_activity': now_utc().isoformat(),
        'created_at': now_utc().isoformat(),
    }
    await db.sessions.insert_one(session)
    
    await log_event(session['id'], business['id'], 'customer_opened', {
        'qr_code': qr_code, 'campaign': qr.get('campaign', ''),
        'customer_name': customer_name,
        'entry_mode': 'assisted',
    })
    
    await notify_helpdesk({
        'type': 'customer_opened',
        'session_id': session['id'],
        'business_name': business['name'],
        'business_id': business['id'],
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'source_label': qr.get('source_label', '') or qr.get('description', ''),
        'timestamp': now_utc().isoformat(),
    })
    
    return {
        'session': serialize_doc(session),
        'business': serialize_doc(business),
        'entry_mode': qr.get('entry_mode', 'fast'),
        'default_route_id': preselected_route_id,
    }

# ========== PUBLIC: Branding info ==========
@api_router.get("/branding")
async def get_public_branding():
    branding = await db.branding_settings.find_one({}, {'_id': 0})
    if not branding:
        return {
            'branding_footer': 'Navigation powered by YASH ORNAMENTS',
            'app_name': 'Yash Ornaments WayFinder',
        }
    return {
        'branding_footer': branding.get('branding_footer', 'Navigation powered by YASH ORNAMENTS'),
        'app_name': branding.get('app_name', 'Yash Ornaments WayFinder'),
    }

# ========== ADMIN: Tutorial PDF Download ==========
@api_router.get("/admin/tutorial/download")
async def admin_download_tutorial(_user: dict = Depends(require_admin_or_trainer)):
    """Generate and download the bilingual tutorial PDF."""
    from tutorial_pdf import build_tutorial_pdf
    pdf_bytes = build_tutorial_pdf()
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': 'attachment; filename="YashOrnaments_WayFinder_Tutorial.pdf"'},
    )

# ========== Health Check ==========
@api_router.get("/health")
async def health_check():
    """JSON health endpoint for monitoring."""
    try:
        await db.command('ping')
        db_ok = True
    except Exception:
        db_ok = False
    return {
        'status': 'healthy' if db_ok else 'degraded',
        'database': 'connected' if db_ok else 'disconnected',
        'version': '2.1.0',
        'app': 'Yash Ornaments WayFinder',
    }

# ========== PUBLIC: Schematic Map Data ==========
@api_router.get("/map/schematic")
async def get_schematic_map():
    """Return schematic map data for the customer map UI. DB-driven, not hardcoded."""
    map_data = await db.schematic_map.find_one({'active': True}, {'_id': 0})
    if not map_data:
        # Auto-generate from published routes & checkpoints
        routes = await db.routes.find({'status': 'published'}, {'_id': 0}).to_list(20)
        destination = {'id': 'destination', 'label': 'Yash Complex\n5th Floor', 'x': 500, 'y': 400, 'type': 'destination'}
        nodes = [destination]
        edges = []
        route_paths = []
        # Layout origins in a fan around the destination
        import math
        origin_count = len([r for r in routes if r.get('start_type') != 'building_entrance'])
        angle_step = math.pi / max(origin_count + 1, 2)
        origin_idx = 0
        for route in routes:
            if route.get('start_type') == 'building_entrance':
                continue
            cps = await db.checkpoints.find({'route_id': route['id']}, {'_id': 0}).sort('order', 1).to_list(50)
            if not cps:
                continue
            angle = math.pi - angle_step * (origin_idx + 1)
            radius = 320
            ox = 500 + radius * math.cos(angle)
            oy = 400 - radius * math.sin(angle)
            origin_node = {'id': f"origin-{route['id'][:8]}", 'label': route.get('start_label') or route['name'], 'x': round(ox), 'y': round(oy), 'type': 'origin', 'route_id': route['id']}
            nodes.append(origin_node)
            path_node_ids = [origin_node['id']]
            total = len(cps)
            for i, cp in enumerate(cps):
                if i == 0 or i == total - 1:
                    continue
                t = (i) / max(total - 1, 1)
                nx = round(ox + (500 - ox) * t)
                ny = round(oy + (400 - oy) * t)
                nid = f"cp-{cp['id'][:8]}"
                nodes.append({'id': nid, 'label': cp['name'], 'x': nx, 'y': ny, 'type': 'checkpoint', 'checkpoint_id': cp['id'], 'route_id': route['id'], 'order': cp['order']})
                path_node_ids.append(nid)
            path_node_ids.append('destination')
            for j in range(len(path_node_ids) - 1):
                edges.append({'from': path_node_ids[j], 'to': path_node_ids[j + 1], 'route_id': route['id']})
            route_paths.append({'route_id': route['id'], 'route_name': route['name'], 'start_type': route.get('start_type', ''), 'color': _route_color(route.get('start_type', '')), 'node_ids': path_node_ids})
            origin_idx += 1
        return {'nodes': nodes, 'edges': edges, 'route_paths': route_paths, 'generated': True}
    return serialize_doc(map_data)

def _route_color(start_type):
    colors = {'metro': '#2563EB', 'red_fort': '#DC2626', 'omaxe': '#16A34A', 'gurudwara': '#D97706', 'town_hall': '#7C3AED', 'building_entrance': '#6B7280'}
    return colors.get(start_type, '#6B7280')

# Include router
app.include_router(api_router)

# Mount static media (with no-cache headers)
app.mount("/media-files", StaticFiles(directory=str(WATERMARKED_DIR)), name="watermarked_media")

# CORS — strict origin allowlist (no wildcard with credentials)
_cors_raw = os.environ.get('CORS_ORIGINS', '')
if _cors_raw and _cors_raw.strip() != '*':
    _allowed_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
else:
    _allowed_origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_credentials=(_allowed_origins != ['*']),  # credentials only when not wildcard
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

