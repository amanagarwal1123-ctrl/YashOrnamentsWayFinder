import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetStats, adminGetLiveSessions, adminGetBusinesses } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Navigation, AlertTriangle, Phone, MapPin, Activity, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useApp();
  const [stats, setStats] = useState(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [businessFilter, setBusinessFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, navigate]);

  const loadData = async () => {
    try {
      const [statsRes, liveRes, bizRes] = await Promise.all([
        adminGetStats(), adminGetLiveSessions(), adminGetBusinesses()
      ]);
      setStats(statsRes.data);
      setLiveSessions(liveRes.data);
      setBusinesses(bizRes.data);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const filteredSessions = businessFilter === 'all' 
    ? liveSessions 
    : liveSessions.filter(s => s.business_slug === businessFilter);

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="dashboard" />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="admin-dashboard-title">Dashboard</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Navigation System Overview</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-green-100 text-green-700">
                <Activity className="w-3 h-3" /> Live
              </span>
            </div>
          </div>

          {/* KPI Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="w-4 h-4 text-[hsl(var(--brand))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Active Sessions</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" data-testid="stat-active-sessions">{stats.active_sessions}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">AJPL: {stats.ajpl_active}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Yash: {stats.yash_active}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Completed</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" data-testid="stat-completed">{stats.completed_sessions}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Help Pending</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" data-testid="stat-help-pending">{stats.help_pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-[hsl(var(--info))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Callbacks Pending</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums" data-testid="stat-callbacks">{stats.callback_pending}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Live Sessions Map & List */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Live Customer Sessions</h2>
                <Tabs value={businessFilter} onValueChange={setBusinessFilter}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
                    <TabsTrigger value="ajpl" className="text-xs h-7">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1" /> AJPL
                    </TabsTrigger>
                    <TabsTrigger value="yash" className="text-xs h-7">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-1" /> Yash
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Simple Map Visualization */}
              <div className="relative bg-[hsl(var(--muted))] rounded-xl p-4 mb-4 min-h-[200px]" data-testid="admin-live-session-map">
                <div className="absolute top-2 right-2 flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> AJPL</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Yash</span>
                </div>
                {filteredSessions.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-sm text-[hsl(var(--muted-foreground))]">
                    <MapPin className="w-5 h-5 mr-2" /> No active sessions
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 py-4">
                    {filteredSessions.map(s => (
                      <motion.div
                        key={s.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center cursor-pointer group"
                        onClick={() => navigate(`/admin/sessions?id=${s.id}`)}
                        title={`${s.business_slug?.toUpperCase()} | ${s.current_checkpoint_name || 'Starting'} | ${s.customer_name || 'Anonymous'}`}
                      >
                        <div className={`w-5 h-5 rounded-full ${s.business_slug === 'ajpl' ? 'dot-ajpl' : 'dot-yash'} ${s.help_requested ? 'pulse-dot' : ''} group-hover:ring-2 ring-[hsl(var(--foreground))] transition-all`} />
                        <span className="text-[8px] text-[hsl(var(--muted-foreground))] mt-1 truncate max-w-[60px]">
                          {s.current_checkpoint_name || 'Start'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Session List */}
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {filteredSessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors" onClick={() => navigate(`/admin/sessions?id=${s.id}`)} data-testid="live-session-row">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.business_slug === 'ajpl' ? 'dot-ajpl' : 'dot-yash'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.customer_name || 'Anonymous'} 
                        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1 font-mono">{s.id.slice(0, 8)}</span>
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {s.current_checkpoint_name || 'Not started'} • Step {s.current_checkpoint_order || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.help_requested && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">HELP</span>}
                      {s.callback_requested && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">CALLBACK</span>}
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/routes')} data-testid="admin-quick-routes">
              <div className="text-center">
                <Navigation className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Manage Routes</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/users')} data-testid="admin-quick-users">
              <div className="text-center">
                <Users className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Manage Users</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/analytics')} data-testid="admin-quick-analytics">
              <div className="text-center">
                <Activity className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Analytics</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/helpdesk')} data-testid="admin-quick-helpdesk">
              <div className="text-center">
                <Phone className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs">Helpdesk</span>
              </div>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
