import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetRoutes, adminGetCheckpoints, adminCreateRoute, adminDeleteRoute } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Route, Plus, MapPin, Clock, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminRoutes() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoute, setNewRoute] = useState({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15 });

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRoutes();
  }, [isLoggedIn, navigate]);

  const loadRoutes = async () => {
    try {
      const res = await adminGetRoutes();
      setRoutes(res.data);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const loadCheckpoints = async (routeId) => {
    try {
      const res = await adminGetCheckpoints(routeId);
      setCheckpoints(res.data);
    } catch (e) {
      setCheckpoints([]);
    }
  };

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    loadCheckpoints(route.id);
  };

  const handleCreateRoute = async () => {
    try {
      await adminCreateRoute({ ...newRoute, status: 'draft' });
      toast.success('Route created');
      setShowCreate(false);
      setNewRoute({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15 });
      loadRoutes();
    } catch (e) {
      toast.error('Failed to create route');
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Delete this route and all its checkpoints?')) return;
    try {
      await adminDeleteRoute(routeId);
      toast.success('Route deleted');
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null);
        setCheckpoints([]);
      }
      loadRoutes();
    } catch (e) {
      toast.error('Failed to delete route');
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="routes" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Route Management</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage navigation routes and checkpoints</p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button data-testid="create-route-button"><Plus className="w-4 h-4 mr-2" /> New Route</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Route</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="Route name" data-testid="new-route-name" />
                  <Input value={newRoute.description} onChange={e => setNewRoute({...newRoute, description: e.target.value})} placeholder="Description" />
                  <Select value={newRoute.start_type} onValueChange={v => setNewRoute({...newRoute, start_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['metro', 'red_fort', 'omaxe', 'town_hall', 'building_entrance', 'custom'].map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={newRoute.start_label} onChange={e => setNewRoute({...newRoute, start_label: e.target.value})} placeholder="Start label" />
                  <Select value={newRoute.difficulty} onValueChange={v => setNewRoute({...newRoute, difficulty: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['easy', 'moderate', 'hard'].map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={handleCreateRoute} data-testid="submit-route">
                    Create Route
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Routes List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Routes ({routes.length})</h3>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)}</div>
              ) : routes.map(route => (
                <Card key={route.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedRoute?.id === route.id ? 'ring-2 ring-[hsl(var(--brand))]' : ''}`}
                  onClick={() => handleSelectRoute(route)} data-testid="admin-route-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Route className="w-5 h-5 text-[hsl(var(--brand))] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{route.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {route.checkpoint_count} checkpoints</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {route.estimated_time_minutes}m</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={route.status} />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }} data-testid="delete-route-button">
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Checkpoints Detail */}
            <div>
              {selectedRoute ? (
                <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] mb-3">Checkpoints - {selectedRoute.name}</h3>
                  {checkpoints.length === 0 ? (
                    <Card><CardContent className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No checkpoints yet</CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {checkpoints.map(cp => (
                        <Card key={cp.id} data-testid="admin-checkpoint-card">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-full bg-[hsl(var(--brand)/0.15)] text-[hsl(var(--brand))] text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {cp.order}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{cp.name}</p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">{cp.short_instruction}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))]">{cp.direction}</span>
                                  {cp.risk_level === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">High Risk</span>}
                                  {cp.indoor && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Indoor</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Card><CardContent className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Select a route to view checkpoints</CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
