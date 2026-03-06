import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetSessions, adminGetSessionDetail, adminTerminateSession } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation, Clock, User, XCircle, ArrowLeft, Phone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSessions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useApp();
  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadSessions();
  }, [isLoggedIn, statusFilter, navigate]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) loadDetail(id);
  }, [searchParams]);

  const loadSessions = async () => {
    try {
      const res = await adminGetSessions(statusFilter);
      setSessions(res.data);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const loadDetail = async (sessionId) => {
    try {
      const res = await adminGetSessionDetail(sessionId);
      setDetail(res.data);
      setSelectedSession(sessionId);
    } catch (e) {
      toast.error('Failed to load session detail');
    }
  };

  const handleTerminate = async (sessionId) => {
    if (!window.confirm('Terminate this session?')) return;
    try {
      await adminTerminateSession(sessionId, 'admin_terminated');
      toast.success('Session terminated');
      loadSessions();
      if (selectedSession === sessionId) setDetail(null);
    } catch (e) { toast.error('Failed to terminate'); }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="sessions" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Sessions</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Monitor customer navigation sessions</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sessions List */}
            <div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="abandoned">Abandoned</TabsTrigger>
                  <TabsTrigger value="terminated">Terminated</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-2">
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="h-16 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)
                ) : sessions.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No sessions found</CardContent></Card>
                ) : sessions.map(s => (
                  <Card key={s.id} className={`cursor-pointer hover:shadow-md transition-all ${selectedSession === s.id ? 'ring-2 ring-[hsl(var(--brand))]' : ''}`}
                    onClick={() => loadDetail(s.id)} data-testid="session-list-item">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.business_slug === 'ajpl' ? 'dot-ajpl' : 'dot-yash'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.customer_name || 'Anonymous'} <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{s.id.slice(0, 8)}</span></p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">Step {s.current_checkpoint_order || 0} • {s.business_slug?.toUpperCase()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {s.help_requested && <AlertTriangle className="w-3 h-3 text-red-500" />}
                          <StatusBadge status={s.status} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Detail */}
            <div>
              {detail ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Session Detail</h3>
                      {detail.session?.status === 'active' && (
                        <Button variant="destructive" size="sm" onClick={() => handleTerminate(detail.session.id)} data-testid="terminate-session">
                          <XCircle className="w-3 h-3 mr-1" /> Terminate
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Business</span><span className="font-medium">{detail.business?.name}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Status</span><StatusBadge status={detail.session?.status} /></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Name</span><span>{detail.session?.customer_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Phone</span><span>{detail.session?.customer_phone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Route</span><span>{detail.route?.name || 'Not selected'}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Step</span><span>{detail.session?.current_checkpoint_order || 0}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Building</span><span>{detail.session?.arrived_building ? 'Yes' : 'No'}</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Destination</span><span>{detail.session?.arrived_destination ? 'Yes' : 'No'}</span></div>
                    </div>

                    {/* Event Timeline */}
                    <h4 className="font-semibold text-sm mt-4 mb-2">Event Timeline</h4>
                    <div className="max-h-[300px] overflow-auto space-y-1">
                      {detail.events?.map(e => (
                        <div key={e.id} className="flex items-start gap-2 py-1 border-b border-[hsl(var(--border))] last:border-0">
                          <span className="w-2 h-2 rounded-full bg-[hsl(var(--brand))] mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium">{e.event_type?.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(e.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card><CardContent className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Select a session to view details</CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
