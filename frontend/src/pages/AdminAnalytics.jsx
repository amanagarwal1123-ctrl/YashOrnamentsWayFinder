import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetAnalytics, adminGetBusinesses } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    adminGetBusinesses().then(r => setBusinesses(r.data)).catch(() => {});
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    loadAnalytics();
  }, [selectedBiz]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const bizId = selectedBiz === 'all' ? null : selectedBiz;
      const res = await adminGetAnalytics(bizId);
      setAnalytics(res.data);
    } catch (e) {}
    setLoading(false);
  };

  const COLORS = ['#C8A24A', '#1E5EFF', '#22c55e', '#ef4444', '#f59e0b'];

  const sessionData = analytics ? [
    { name: 'Completed', value: analytics.completed_sessions },
    { name: 'Abandoned', value: analytics.abandoned_sessions },
    { name: 'Active', value: analytics.total_sessions - analytics.completed_sessions - analytics.abandoned_sessions },
  ] : [];

  const eventData = analytics?.event_counts ? 
    Object.entries(analytics.event_counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count })) 
    : [];

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="analytics" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Business-segmented insights</p>
            </div>
            <Tabs value={selectedBiz} onValueChange={setSelectedBiz}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {businesses.map(b => (
                  <TabsTrigger key={b.id} value={b.id}>
                    <span className={`w-2 h-2 rounded-full mr-1 ${b.slug === 'ajpl' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    {b.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-40 bg-[hsl(var(--muted))] animate-pulse rounded-xl" />)}
            </div>
          ) : analytics && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-[hsl(var(--brand))]" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Total Sessions</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums" data-testid="analytics-total">{analytics.total_sessions}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Completion Rate</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums" data-testid="analytics-completion">{analytics.completion_rate}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-[hsl(var(--info))]" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Helpdesk Cases</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{analytics.helpdesk_total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Resolution Rate</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{analytics.helpdesk_resolution_rate}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-4">Session Distribution</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={sessionData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                          {sessionData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-4">Top Events</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={eventData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(43, 72%, 52%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Drop-off Table */}
              {analytics.top_drop_offs?.length > 0 && (
                <Card className="mt-6">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">Top Drop-off Checkpoints</h3>
                    <div className="space-y-2">
                      {analytics.top_drop_offs.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                          <span className="text-sm">{d.checkpoint_name}</span>
                          <span className="text-sm font-mono font-bold text-red-600">{d.count} reports</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
