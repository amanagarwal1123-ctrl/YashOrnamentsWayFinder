import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import {
  helpdeskGetLiveCustomers, helpdeskGetRecentCompleted, helpdeskGetCases,
  helpdeskCaseAction, helpdeskClaimSession, helpdeskUnclaimSession,
  helpdeskGetCallbacks, createHelpdeskSSE, logAssistEvent
} from '@/lib/api';
import { StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Headphones, Bell, Phone, CheckCircle2, MessageCircle, MapPin, Clock,
  AlertTriangle, User, LogOut, Video, Locate, UserCheck, UserX,
  FileText, ChevronRight, Navigation, Shield, Eye, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpdeskDashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logoutUser } = useApp();
  const [liveCustomers, setLiveCustomers] = useState([]);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteSessionId, setNoteSessionId] = useState('');
  const sseRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn || (user?.role !== 'admin' && user?.role !== 'helpdesk')) {
      navigate('/login');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 8000);
    try {
      sseRef.current = createHelpdeskSSE();
      sseRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications(prev => [data, ...prev.slice(0, 29)]);
          toast.info(`${data.type?.replace(/_/g, ' ')} ${data.customer_name ? `- ${data.customer_name}` : ''}`, { duration: 4000 });
          loadData();
        } catch (e) {}
      };
    } catch (e) {}
    return () => { clearInterval(interval); if (sseRef.current) sseRef.current.close(); };
  }, [isLoggedIn, navigate, user]);

  const loadData = async () => {
    try {
      const [liveRes, completedRes] = await Promise.all([
        helpdeskGetLiveCustomers(),
        helpdeskGetRecentCompleted(),
      ]);
      setLiveCustomers(liveRes.data);
      setRecentCompleted(completedRes.data);
    } catch (e) {}
    setLoading(false);
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'N/A';
    const diff = (new Date() - new Date(timestamp)) / 1000 / 60;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60)}m ago`;
  };

  // Categorize live customers
  const categorize = useCallback(() => {
    const newCustomers = [];
    const activeCustomers = [];
    const needsHelp = [];
    const assisted = [];
    liveCustomers.forEach(s => {
      if (s.has_open_help || s.help_requested) {
        needsHelp.push(s);
      } else if (s.assistance_status === 'active' || s.assigned_helpdesk_user_id) {
        assisted.push(s);
      } else if (!s.route_id || !s.started_at) {
        newCustomers.push(s);
      } else {
        activeCustomers.push(s);
      }
    });
    return { newCustomers, activeCustomers, needsHelp, assisted };
  }, [liveCustomers]);

  const { newCustomers, activeCustomers, needsHelp, assisted } = categorize();

  const getFiltered = () => {
    switch (activeTab) {
      case 'new': return newCustomers;
      case 'active': return activeCustomers;
      case 'needs_help': return needsHelp;
      case 'assisted': return assisted;
      case 'completed': return recentCompleted;
      default: return liveCustomers;
    }
  };

  const handleClaim = async (sessionId) => {
    try {
      await helpdeskClaimSession(sessionId);
      toast.success('Session claimed');
      loadData();
    } catch (e) { toast.error('Failed to claim'); }
  };

  const handleUnclaim = async (sessionId) => {
    try {
      await helpdeskUnclaimSession(sessionId);
      toast.success('Session unclaimed');
      loadData();
    } catch (e) { toast.error('Failed to unclaim'); }
  };

  const handleCall = (s) => {
    if (!s.customer_phone) { toast.error('No phone number'); return; }
    logAssistEvent(s.id, 'phone_call', {}).catch(() => {});
    window.open(`tel:${s.customer_phone}`, '_self');
  };

  const handleWhatsApp = (s) => {
    const waNumber = s.contact_whatsapp?.replace(/[^0-9]/g, '') || s.customer_phone?.replace(/[^0-9]/g, '') || '';
    if (!waNumber) return;
    logAssistEvent(s.id, 'whatsapp_chat', {}).catch(() => {});
    const text = encodeURIComponent(`Hi ${s.customer_name || ''}, this is Yash Ornaments helpdesk. How can I help you?`);
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  const handleWhatsAppVideo = (s) => {
    const waNumber = s.contact_whatsapp?.replace(/[^0-9]/g, '') || s.customer_phone?.replace(/[^0-9]/g, '') || '';
    if (!waNumber) return;
    logAssistEvent(s.id, 'whatsapp_video_attempted', {}).catch(() => {});
    const text = encodeURIComponent(`Hi ${s.customer_name || ''}, I'm calling from Yash Ornaments helpdesk for video assistance.`);
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !noteSessionId) return;
    try {
      // Find or create a case for this session to add note
      const cases = await helpdeskGetCases(null);
      const sessionCase = cases.data.find(c => c.session_id === noteSessionId && !['resolved', 'closed'].includes(c.status));
      if (sessionCase) {
        await helpdeskCaseAction(sessionCase.id, 'note_added', noteText);
      }
      toast.success('Note added');
      setShowNoteDialog(false);
      setNoteText('');
    } catch (e) { toast.error('Failed to add note'); }
  };

  if (!isLoggedIn) return null;

  const filtered = getFiltered();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-[hsl(var(--brand))]" />
            <div>
              <h1 className="font-semibold" data-testid="helpdesk-title">Helpdesk Console</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.display_name || user?.username || 'Agent'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative cursor-pointer" data-testid="notification-bell">
              <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {Math.min(notifications.length, 99)}
                </span>
              )}
            </div>
            {/* Live Counter */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-700" data-testid="live-counter">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {liveCustomers.length} live
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate('/manual/helpdesk')} data-testid="helpdesk-manual-link">Manual</Button>
            {user?.role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')} data-testid="go-admin">Admin</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { logoutUser(); navigate('/login'); }} data-testid="helpdesk-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Queue Stats */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { key: 'all', label: 'All Live', count: liveCustomers.length, color: 'bg-slate-100 text-slate-700' },
            { key: 'new', label: 'New', count: newCustomers.length, color: 'bg-blue-100 text-blue-700' },
            { key: 'active', label: 'Active', count: activeCustomers.length, color: 'bg-green-100 text-green-700' },
            { key: 'needs_help', label: 'Needs Help', count: needsHelp.length, color: 'bg-red-100 text-red-700' },
            { key: 'assisted', label: 'Assisted', count: assisted.length, color: 'bg-purple-100 text-purple-700' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-2 rounded-lg text-center transition-all ${activeTab === tab.key ? 'ring-2 ring-[hsl(var(--brand))] shadow' : 'hover:shadow-sm'} ${tab.color}`}
              data-testid={`tab-${tab.key}`}
            >
              <p className="text-lg font-bold tabular-nums">{tab.count}</p>
              <p className="text-[10px] font-medium">{tab.label}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => setActiveTab('completed')}
          className={`mb-4 text-xs font-medium px-3 py-1.5 rounded-full ${activeTab === 'completed' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
          data-testid="tab-completed"
        >
          Recently Completed ({recentCompleted.length})
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customer Queue */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No customers in this queue</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map(s => (
                  <Card
                    key={s.id}
                    className={`hover:shadow-md transition-shadow ${s.has_open_help || s.help_requested ? 'border-l-4 border-l-red-400' : s.assigned_helpdesk_user_id ? 'border-l-4 border-l-purple-400' : ''}`}
                    data-testid="helpdesk-customer-row"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.business_slug === 'ajpl' ? 'bg-[hsl(var(--gold))]' : 'bg-blue-500'}`} />
                          <span className="text-sm font-medium truncate" data-testid="customer-name">{s.customer_name || 'Anonymous'}</span>
                          {s.customer_phone && <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{s.customer_phone}</span>}
                        </div>
                        <StatusBadge status={s.status} />
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))] mb-3">
                        {s.entry_source_label && <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {s.entry_source_label}</span>}
                        {s.route_name && <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {s.route_name}</span>}
                        {s.route_distance_value > 0 && <span>{s.route_distance_label || `${s.route_distance_value} ${s.route_distance_unit}`}</span>}
                        {s.current_checkpoint_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.current_checkpoint_name}</span>}
                        <span className="flex items-center gap-1">
                          <Locate className="w-3 h-3" />
                          {s.location_permission_state === 'granted' ? 'GPS on' : s.location_permission_state === 'denied' ? 'GPS off' : 'GPS unknown'}
                        </span>
                        {s.last_known_location_text && <span>{s.last_known_location_text}</span>}
                        {s.assigned_helpdesk_user_id && <span className="flex items-center gap-1 text-purple-600"><UserCheck className="w-3 h-3" /> Claimed</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getTimeSince(s.last_activity || s.created_at)}</span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-1.5">
                        {s.customer_phone && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCall(s)} data-testid="hd-call">
                            <Phone className="w-3 h-3 mr-1" /> Call
                          </Button>
                        )}
                        {(s.contact_whatsapp || s.customer_phone) && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleWhatsApp(s)} data-testid="hd-whatsapp">
                              <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleWhatsAppVideo(s)} data-testid="hd-video">
                              <Video className="w-3 h-3 mr-1" /> Video
                            </Button>
                          </>
                        )}
                        {!s.assigned_helpdesk_user_id ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleClaim(s.id)} data-testid="hd-claim">
                            <UserCheck className="w-3 h-3 mr-1" /> Claim
                          </Button>
                        ) : s.assigned_helpdesk_user_id === user?.id ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUnclaim(s.id)} data-testid="hd-unclaim">
                            <UserX className="w-3 h-3 mr-1" /> Unclaim
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setNoteSessionId(s.id); setShowNoteDialog(true); }} data-testid="hd-note">
                          <FileText className="w-3 h-3 mr-1" /> Note
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedSession(s)} data-testid="hd-detail">
                          <Eye className="w-3 h-3 mr-1" /> Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Sidebar */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Live Notifications ({notifications.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {notifications.length === 0 ? (
                <Card><CardContent className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">Waiting for events...</CardContent></Card>
              ) : notifications.map((n, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-l-4" style={{ borderLeftColor: n.type?.includes('help') || n.type?.includes('cannot') ? '#EF4444' : n.type?.includes('video') ? '#22C55E' : '#3B82F6' }}>
                    <CardContent className="p-3">
                      <p className="text-xs font-medium capitalize">{n.type?.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {n.customer_name || 'Anonymous'} {n.checkpoint_name ? `at ${n.checkpoint_name}` : ''}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{getTimeSince(n.timestamp)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <Input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Type your note..."
            className="mt-2"
            data-testid="note-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNote} data-testid="note-submit">Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Detail Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-auto">
          <SheetTitle className="mb-4">Session Details</SheetTitle>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Customer</p>
                <p className="font-medium">{selectedSession.customer_name || 'Anonymous'}</p>
                {selectedSession.customer_phone && <p className="text-sm font-mono">{selectedSession.customer_phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Route</p><p className="text-sm font-medium">{selectedSession.route_name || 'N/A'}</p></div>
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Checkpoint</p><p className="text-sm font-medium">{selectedSession.current_checkpoint_name || 'N/A'}</p></div>
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Location</p><p className="text-sm font-medium">{selectedSession.location_permission_state}</p></div>
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Status</p><StatusBadge status={selectedSession.status} /></div>
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Source</p><p className="text-sm">{selectedSession.entry_source_label || 'N/A'}</p></div>
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Distance</p><p className="text-sm">{selectedSession.route_distance_label || (selectedSession.route_distance_value > 0 ? `${selectedSession.route_distance_value} ${selectedSession.route_distance_unit}` : 'N/A')}</p></div>
              </div>
              {selectedSession.last_known_lat > 0 && (
                <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Last Location</p><p className="text-sm font-mono">{selectedSession.last_known_lat.toFixed(5)}, {selectedSession.last_known_lng.toFixed(5)}</p></div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSession.customer_phone && (
                  <Button size="sm" onClick={() => handleCall(selectedSession)}><Phone className="w-3 h-3 mr-1" /> Call</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => handleWhatsApp(selectedSession)}><MessageCircle className="w-3 h-3 mr-1" /> WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={() => handleWhatsAppVideo(selectedSession)}><Video className="w-3 h-3 mr-1" /> Video</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
