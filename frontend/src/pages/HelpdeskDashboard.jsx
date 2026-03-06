import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { helpdeskGetCases, helpdeskCaseAction, helpdeskGetCallbacks, createHelpdeskSSE } from '@/lib/api';
import { StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Headphones, Bell, Phone, CheckCircle2, MessageCircle, MapPin, Clock, ArrowLeft, AlertTriangle, User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpdeskDashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logoutUser } = useApp();
  const [cases, setCases] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseFilter, setCaseFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [actionNote, setActionNote] = useState('');
  const sseRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 10000);
    
    // Start SSE
    try {
      sseRef.current = createHelpdeskSSE();
      sseRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setNotifications(prev => [data, ...prev.slice(0, 19)]);
          toast.info(`${data.type?.replace(/_/g, ' ')} - ${data.business_name} - ${data.checkpoint_name || 'Unknown'}`, { duration: 5000 });
          loadData();
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (sseRef.current) sseRef.current.close();
    };
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    loadCases();
  }, [caseFilter]);

  const loadData = async () => {
    await Promise.all([loadCases(), loadCallbacks()]);
    setLoading(false);
  };

  const loadCases = async () => {
    try {
      const res = await helpdeskGetCases(caseFilter === 'all' ? null : caseFilter);
      setCases(res.data);
    } catch (e) {}
  };

  const loadCallbacks = async () => {
    try {
      const res = await helpdeskGetCallbacks('pending');
      setCallbacks(res.data);
    } catch (e) {}
  };

  const handleAction = async (caseId, action) => {
    try {
      await helpdeskCaseAction(caseId, action, actionNote);
      toast.success(`Action: ${action.replace(/_/g, ' ')}`);
      setActionNote('');
      loadData();
    } catch (e) { toast.error('Action failed'); }
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'N/A';
    const diff = (new Date() - new Date(timestamp)) / 1000 / 60;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60)}m ago`;
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-[hsl(var(--brand))]" />
            <div>
              <h1 className="font-semibold">WayFinder Helpdesk</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.display_name || 'Agent'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} data-testid="go-admin">
              Admin
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logoutUser(); navigate('/login'); }} data-testid="helpdesk-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Recent Notifications ({notifications.length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {notifications.length === 0 ? (
                <Card><CardContent className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">No new notifications</CardContent></Card>
              ) : notifications.map((n, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-l-4" style={{ borderLeftColor: n.business_name === 'AJPL' ? '#E53E3E' : '#1E5EFF' }}>
                    <CardContent className="p-3">
                      <p className="text-xs font-medium">{n.type?.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {n.business_name} • {n.checkpoint_name || 'Unknown'}
                        {n.customer_phone && ` • ${n.customer_phone}`}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{getTimeSince(n.timestamp)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pending Callbacks */}
            <h3 className="text-sm font-semibold mt-6 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Pending Callbacks ({callbacks.length})
            </h3>
            <div className="space-y-2">
              {callbacks.length === 0 ? (
                <Card><CardContent className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">No pending callbacks</CardContent></Card>
              ) : callbacks.map(cb => (
                <Card key={cb.id} data-testid="callback-item">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{cb.customer_name || 'Anonymous'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${cb.business_name === 'AJPL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{cb.business_name}</span>
                    </div>
                    {cb.customer_phone && (
                      <a href={`tel:${cb.customer_phone}`} className="text-xs text-[hsl(var(--info))] font-mono">{cb.customer_phone}</a>
                    )}
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{cb.issue_type?.replace(/_/g, ' ')} • {getTimeSince(cb.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cases List */}
          <div className="lg:col-span-2">
            <Tabs value={caseFilter} onValueChange={setCaseFilter} className="mb-4">
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-20 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)
              ) : cases.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No cases found</CardContent></Card>
              ) : cases.map(c => (
                <Card key={c.id} className="hover:shadow-md transition-shadow" data-testid="helpdesk-case-row">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${c.business_slug === 'ajpl' ? 'dot-ajpl' : 'dot-yash'}`} />
                        <span className="text-sm font-medium">{c.customer_name || 'Anonymous'}</span>
                        <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{c.id.slice(0, 8)}</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] mb-2">
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {c.case_type?.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.last_checkpoint_name || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getTimeSince(c.created_at)}</span>
                      {c.customer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.customer_phone}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(c.id, 'acknowledged')} data-testid="acknowledge-case">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Acknowledge
                        </Button>
                      )}
                      {['open', 'acknowledged'].includes(c.status) && c.customer_phone && (
                        <a href={`tel:${c.customer_phone}`}>
                          <Button size="sm" variant="outline" onClick={() => handleAction(c.id, 'called')} data-testid="call-customer">
                            <Phone className="w-3 h-3 mr-1" /> Call
                          </Button>
                        </a>
                      )}
                      {['open', 'acknowledged', 'in_progress'].includes(c.status) && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(c.id, 'guided')} data-testid="guide-customer">
                          <MessageCircle className="w-3 h-3 mr-1" /> Guided
                        </Button>
                      )}
                      {c.status !== 'resolved' && c.status !== 'closed' && (
                        <Button size="sm" onClick={() => handleAction(c.id, 'resolved')} data-testid="resolve-case">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
