import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetEnhancedStats, adminGetLiveSessions, adminGetBusinesses, adminGetUsers, adminGetUserPerformance } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users, Navigation, AlertTriangle, Phone, MapPin, Activity, Eye,
  TrendingUp, CheckCircle2, XCircle, UserCheck, BarChart3, Locate, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useApp();
  const [stats, setStats] = useState(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [businessFilter, setBusinessFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPerf, setUserPerf] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') { navigate('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, navigate, user]);

  const loadData = async () => {
    try {
      const [statsRes, liveRes, bizRes, usersRes] = await Promise.all([
        adminGetEnhancedStats(), adminGetLiveSessions(), adminGetBusinesses(), adminGetUsers()
      ]);
      setStats(statsRes.data);
      setLiveSessions(liveRes.data);
      setBusinesses(bizRes.data);
      setUsers(usersRes.data.filter(u => u.role === 'helpdesk'));
    } catch (e) {}
    setLoading(false);
  };

  const viewUserPerformance = async (u) => {
    setSelectedUser(u);
    try {
      const res = await adminGetUserPerformance(u.id);
      setUserPerf(res.data);
    } catch (e) { setUserPerf(null); }
  };

  const filteredSessions = businessFilter === 'all'
    ? liveSessions
    : liveSessions.filter(s => s.business_slug === businessFilter);

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="dashboard" />

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="admin-dashboard-title">WayFinder Dashboard</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Yash Ornaments Navigation System</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-green-100 text-green-700">
                <Activity className="w-3 h-3" /> Live
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/reports')} data-testid="admin-reports-link">
                <BarChart3 className="w-4 h-4 mr-1" /> Reports
              </Button>
            </div>
          </div>

          {/* Enhanced KPIs */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { icon: Users, label: 'Total Customers', value: stats.total_sessions, color: 'text-slate-600' },
                { icon: Navigation, label: 'Active Now', value: stats.active_sessions, color: 'text-green-600' },
                { icon: CheckCircle2, label: 'Successful Visits', value: stats.completed_sessions, color: 'text-blue-600' },
                { icon: XCircle, label: 'Incomplete', value: stats.abandoned_sessions + stats.terminated_sessions, color: 'text-gray-500' },
                { icon: AlertTriangle, label: 'Help Pending', value: stats.help_pending, color: 'text-red-600' },
                { icon: UserCheck, label: 'Being Assisted', value: stats.currently_assisted, color: 'text-purple-600' },
              ].map((kpi, idx) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">{kpi.label}</span>
                      </div>
                      <p className="text-2xl font-bold tabular-nums" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, '-')}`}>{kpi.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Route Usage */}
            {stats?.route_usage?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Navigation className="w-4 h-4" /> Route Usage</h3>
                  <div className="space-y-2">
                    {stats.route_usage.map((r, idx) => (
                      <div key={r.route_id} className="flex items-center justify-between">
                        <span className="text-xs truncate flex-1">{r.route_name || r.route_id.slice(0,8)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(var(--brand))] rounded-full" style={{ width: `${(r.count / (stats.route_usage[0]?.count || 1)) * 100}%` }} />
                          </div>
                          <span className="text-xs font-mono tabular-nums w-8 text-right">{r.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Source Usage */}
            {stats?.source_usage?.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Source Usage</h3>
                  <div className="space-y-2">
                    {stats.source_usage.map((s) => (
                      <div key={s.source_id} className="flex items-center justify-between">
                        <span className="text-xs truncate flex-1">{s.source_label || s.source_code || s.source_id.slice(0,8)}</span>
                        <span className="text-xs font-mono tabular-nums">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Helpdesk Workload */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Helpdesk Team</h3>
                {users.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">No helpdesk users</p>
                ) : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                        onClick={() => viewUserPerformance(u)}
                        data-testid={`user-perf-${u.username}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-xs font-medium">{u.display_name || u.username}</span>
                        </div>
                        <Eye className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Sessions — location-based monitoring */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Live Customer Monitoring</h2>
                <div className="flex items-center gap-2">
                  <Tabs value={businessFilter} onValueChange={setBusinessFilter}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
                      <TabsTrigger value="ajpl" className="text-xs h-7">
                        <span className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] mr-1" /> AJPL
                      </TabsTrigger>
                      <TabsTrigger value="yash" className="text-xs h-7">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-1" /> Yash
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="flex items-center justify-center h-[120px] text-sm text-[hsl(var(--muted-foreground))]" data-testid="admin-live-session-map">
                  <MapPin className="w-5 h-5 mr-2" /> No active sessions
                </div>
              ) : (
                <div className="overflow-auto max-h-[460px]" data-testid="admin-live-session-map">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[hsl(var(--card))]">
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">Customer</th>
                        <th className="text-left py-2 px-2 font-medium">Checkpoint</th>
                        <th className="text-left py-2 px-2 font-medium">GPS</th>
                        <th className="text-left py-2 px-2 font-medium">Last Location</th>
                        <th className="text-left py-2 px-2 font-medium">Activity</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map(s => {
                        const hasGps = s.last_known_lat && s.last_known_lat !== 0;
                        const timeSince = s.last_activity ? (() => {
                          const d = (Date.now() - new Date(s.last_activity).getTime()) / 60000;
                          return d < 1 ? 'now' : d < 60 ? `${Math.floor(d)}m` : `${Math.floor(d/60)}h`;
                        })() : '-';
                        return (
                          <tr key={s.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors" data-testid="live-session-row">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.business_slug === 'ajpl' ? 'dot-ajpl' : 'dot-yash'}`} />
                                <span className="font-medium truncate max-w-[100px]">{s.customer_name || 'Anon'}</span>
                              </div>
                              {s.customer_phone && <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5">{s.customer_phone}</p>}
                            </td>
                            <td className="py-2 px-2">
                              <span className="truncate max-w-[120px] block">{s.current_checkpoint_name || 'Not started'}</span>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Step {s.current_checkpoint_order || 0}</span>
                            </td>
                            <td className="py-2 px-2">
                              {hasGps ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 text-green-700"><Locate className="w-3 h-3" /> On</span>
                                  <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5">
                                    {s.last_known_lat.toFixed(4)}, {s.last_known_lng.toFixed(4)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[hsl(var(--muted-foreground))]">
                                  {s.location_permission_state === 'denied' ? 'Denied' : s.location_permission_state === 'granted' ? 'Pending' : 'Unknown'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <span className="truncate max-w-[140px] block text-[hsl(var(--muted-foreground))]">
                                {s.last_known_location_text || (hasGps ? 'Coordinates only' : '-')}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeSince}</span>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                {s.help_requested && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">HELP</span>}
                                {s.callback_requested && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px]">CB</span>}
                                <StatusBadge status={s.status} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/routes')} data-testid="admin-quick-routes">
              <div className="text-center"><Navigation className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Manage Routes</span></div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/users')} data-testid="admin-quick-users">
              <div className="text-center"><Users className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Manage Users</span></div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/admin/reports')} data-testid="admin-quick-reports">
              <div className="text-center"><BarChart3 className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Reports & Export</span></div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/helpdesk')} data-testid="admin-quick-helpdesk">
              <div className="text-center"><Phone className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Helpdesk</span></div>
            </Button>
          </div>
        </div>
      </main>

      {/* User Performance Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setUserPerf(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedUser?.display_name || selectedUser?.username} - Performance</DialogTitle>
          </DialogHeader>
          {userPerf ? (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="text-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                <p className="text-2xl font-bold">{userPerf.customers_handled}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Customers Handled</p>
              </div>
              <div className="text-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                <p className="text-2xl font-bold">{userPerf.cases_handled}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Cases Handled</p>
              </div>
              <div className="text-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                <p className="text-2xl font-bold">{userPerf.cases_resolved}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Cases Resolved</p>
              </div>
              <div className="text-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                <p className="text-2xl font-bold">{userPerf.completions_assisted}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Completions Assisted</p>
              </div>
            </div>
          ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
