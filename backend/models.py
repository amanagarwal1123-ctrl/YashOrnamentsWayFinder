from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

def gen_id():
    return str(uuid.uuid4())

def now_utc():
    return datetime.now(timezone.utc)

# ---- Businesses ----
class Business(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    name: str
    slug: str  # 'ajpl' or 'yash'
    full_name: str
    description: str = ""
    brand_type: str = "retail"  # retail or wholesale
    destination_label: str = ""
    accent_color: str = "#C8A24A"
    feature_flags: List[str] = []
    contact_phone: str = ""
    contact_whatsapp: str = ""
    address: str = ""
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)

# ---- QR Sources ----
class QRSource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    code: str  # unique QR token
    business_id: str
    campaign: str = "default"
    description: str = ""
    active: bool = True
    scan_count: int = 0
    created_at: datetime = Field(default_factory=now_utc)

# ---- Routes ----
class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    name: str
    description: str = ""
    start_type: str = ""  # metro, red_fort, omaxe, town_hall, building_entrance, custom
    start_label: str = ""
    difficulty: str = "easy"  # easy, moderate, hard
    estimated_time_minutes: int = 15
    checkpoint_count: int = 0
    status: str = "published"  # draft, pending_review, published, archived
    created_by: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

# ---- Checkpoints ----
class Checkpoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    route_id: str
    order: int
    name: str
    short_instruction: str = ""
    long_instruction: str = ""
    landmark_description: str = ""
    what_to_look_for: str = ""
    photo_url: str = ""
    video_url: str = ""
    arrow_map_url: str = ""
    direction: str = "straight"  # straight, left, right, u_turn, enter, climb, destination
    indoor: bool = False
    floor_context: str = ""
    is_critical: bool = True
    risk_level: str = "low"  # low, medium, high
    fallback_text: str = ""
    heading: float = 0.0  # compass heading for AR
    lat: float = 0.0
    lng: float = 0.0
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

# ---- Sessions ----
class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    business_id: str
    business_slug: str = ""
    qr_source_id: str = ""
    campaign: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    route_id: str = ""
    current_checkpoint_id: str = ""
    current_checkpoint_order: int = 0
    status: str = "active"  # active, completed, abandoned, terminated
    arrived_building: bool = False
    arrived_destination: bool = False
    device_info: str = ""
    help_requested: bool = False
    callback_requested: bool = False
    last_activity: datetime = Field(default_factory=now_utc)
    created_at: datetime = Field(default_factory=now_utc)

# ---- Session Events ----
class SessionEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    session_id: str
    business_id: str
    event_type: str  # qr_scan, route_selected, checkpoint_viewed, checkpoint_confirmed, etc.
    event_data: Dict[str, Any] = {}
    checkpoint_id: str = ""
    timestamp: datetime = Field(default_factory=now_utc)

# ---- Callback Requests ----
class CallbackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    session_id: str
    business_id: str
    customer_name: str = ""
    customer_phone: str = ""
    issue_type: str = ""  # cannot_find_lane, cannot_find_building, etc.
    notes: str = ""
    status: str = "pending"  # pending, in_progress, resolved, closed
    last_checkpoint_id: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    resolved_at: Optional[datetime] = None

# ---- Helpdesk Cases ----
class HelpdeskCase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    session_id: str
    business_id: str
    case_type: str = "help_request"  # help_request, callback, location_share, checkpoint_share
    customer_name: str = ""
    customer_phone: str = ""
    last_checkpoint_id: str = ""
    last_checkpoint_name: str = ""
    route_id: str = ""
    status: str = "open"  # open, acknowledged, in_progress, resolved, closed
    assigned_to: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)

# ---- Helpdesk Case Updates ----
class HelpdeskCaseUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    case_id: str
    action: str  # acknowledged, called, no_answer, guided, resolved, closed, note_added
    note: str = ""
    performed_by: str = ""
    timestamp: datetime = Field(default_factory=now_utc)

# ---- Internal Users ----
class InternalUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    username: str
    display_name: str = ""
    role: str = "helpdesk"  # admin, helpdesk, trainer
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)

# ---- OTP Codes ----
class OTPCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    user_id: str
    code: str
    used: bool = False
    expires_at: datetime = Field(default_factory=now_utc)
    created_at: datetime = Field(default_factory=now_utc)

# ---- Gold Rates ----
class GoldRate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    rate_24k: float = 0.0
    rate_22k: float = 0.0
    rate_18k: float = 0.0
    updated_by: str = ""
    updated_at: datetime = Field(default_factory=now_utc)

# ---- Gallery Items ----
class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    title: str = ""
    description: str = ""
    image_url: str = ""
    category: str = ""
    weight: str = ""
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)

# ---- Audit Logs ----
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    user_id: str = ""
    action: str = ""
    entity_type: str = ""
    entity_id: str = ""
    old_value: Dict[str, Any] = {}
    new_value: Dict[str, Any] = {}
    status: str = ""  # draft, pending, published, rejected
    timestamp: datetime = Field(default_factory=now_utc)

# ---- Push Subscriptions ----
class PushSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=gen_id)
    user_id: str
    subscription_info: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=now_utc)

# ---- Request/Response Models ----
class SessionCreateRequest(BaseModel):
    qr_code: str
    device_info: str = ""

class SessionEventRequest(BaseModel):
    event_type: str
    event_data: Dict[str, Any] = {}
    checkpoint_id: str = ""

class CallbackCreateRequest(BaseModel):
    customer_name: str = ""
    customer_phone: str = ""
    issue_type: str = ""
    notes: str = ""

class HelpdeskActionRequest(BaseModel):
    action: str
    note: str = ""

class LoginRequest(BaseModel):
    username: str
    otp: str = ""
    password: str = ""  # alias for otp (backward compat)

class GoldRateUpdateRequest(BaseModel):
    rate_24k: float
    rate_22k: float
    rate_18k: float = 0.0
