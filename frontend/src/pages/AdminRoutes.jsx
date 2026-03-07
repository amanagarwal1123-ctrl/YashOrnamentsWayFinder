import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetRoutes, adminGetCheckpoints, adminCreateRoute, adminDeleteRoute, adminCreateCheckpoint, adminUpdateCheckpoint, adminDeleteCheckpoint, uploadMedia, serveMediaUrl } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Route, Plus, MapPin, Clock, Trash2, Edit3, Image, Video, Compass, Upload, Save, ChevronUp, ChevronDown, ArrowUpRight, Eye, Loader2, Camera, Navigation as NavIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DIRECTIONS = [
  { value: 'straight', label: 'Straight / Forward', icon: '↑' },
  { value: 'left', label: 'Turn Left', icon: '←' },
  { value: 'right', label: 'Turn Right', icon: '→' },
  { value: 'u_turn', label: 'U-Turn', icon: '↶' },
  { value: 'enter', label: 'Enter Building', icon: '⎆' },
  { value: 'climb', label: 'Climb Stairs/Lift', icon: '↑↑' },
  { value: 'destination', label: 'Destination Reached', icon: '★' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High (Confusion Point)', color: 'bg-red-100 text-red-700' },
];

const emptyCheckpoint = {
  name: '', short_instruction: '', long_instruction: '', landmark_description: '',
  what_to_look_for: '', direction: 'straight', indoor: false, floor_context: '',
  is_critical: true, risk_level: 'low', fallback_text: '', heading: 0, lat: 0, lng: 0,
};

export default function AdminRoutes() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCpEditor, setShowCpEditor] = useState(false);
  const [editingCp, setEditingCp] = useState(null);
  const [cpForm, setCpForm] = useState({ ...emptyCheckpoint });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [newRoute, setNewRoute] = useState({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15 });
  const [cpTab, setCpTab] = useState('details');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRoutes();
  }, [isLoggedIn, navigate]);

  const loadRoutes = async () => {
    try { const res = await adminGetRoutes(); setRoutes(res.data); } catch (e) {}
    setLoading(false);
  };

  const loadCheckpoints = useCallback(async (routeId) => {
    try { const res = await adminGetCheckpoints(routeId); setCheckpoints(res.data); } catch (e) { setCheckpoints([]); }
  }, []);

  const handleSelectRoute = (route) => { setSelectedRoute(route); loadCheckpoints(route.id); };

  const handleCreateRoute = async () => {
    if (!newRoute.name) { toast.error('Route name is required'); return; }
    try {
      const res = await adminCreateRoute({ ...newRoute, status: 'draft' });
      toast.success('Route created!');
      setShowCreateRoute(false);
      setNewRoute({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15 });
      loadRoutes();
      handleSelectRoute(res.data);
    } catch (e) { toast.error('Failed to create route'); }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Delete this route and ALL checkpoints?')) return;
    try {
      await adminDeleteRoute(routeId);
      toast.success('Route deleted');
      if (selectedRoute?.id === routeId) { setSelectedRoute(null); setCheckpoints([]); }
      loadRoutes();
    } catch (e) { toast.error('Failed to delete'); }
  };

  // ---- Checkpoint CRUD ----
  const openAddCheckpoint = () => {
    const nextOrder = checkpoints.length > 0 ? Math.max(...checkpoints.map(c => c.order)) + 1 : 1;
    setCpForm({ ...emptyCheckpoint, order: nextOrder });
    setEditingCp(null);
    setCpTab('details');
    setShowCpEditor(true);
  };

  const openEditCheckpoint = (cp) => {
    setCpForm({ ...cp });
    setEditingCp(cp);
    setCpTab('details');
    setShowCpEditor(true);
  };

  const handleSaveCheckpoint = async () => {
    if (!cpForm.name) { toast.error('Checkpoint name is required'); return; }
    if (!cpForm.short_instruction) { toast.error('Short instruction is required'); return; }
    setSaving(true);
    try {
      if (editingCp) {
        await adminUpdateCheckpoint(editingCp.id, { ...cpForm });
        toast.success('Checkpoint updated!');
      } else {
        await adminCreateCheckpoint({ ...cpForm, route_id: selectedRoute.id });
        toast.success('Checkpoint added!');
      }
      loadCheckpoints(selectedRoute.id);
      loadRoutes();
      setShowCpEditor(false);
    } catch (e) { toast.error('Failed to save checkpoint'); }
    setSaving(false);
  };

  const handleDeleteCheckpoint = async (cpId) => {
    if (!window.confirm('Delete this checkpoint?')) return;
    try {
      await adminDeleteCheckpoint(cpId);
      toast.success('Checkpoint deleted');
      loadCheckpoints(selectedRoute.id);
      loadRoutes();
    } catch (e) { toast.error('Failed to delete'); }
  };

  // ---- Media Upload for Checkpoint ----
  const handleMediaUpload = async (file, mediaType, fieldKey) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('route_id', selectedRoute?.id || '');
      formData.append('checkpoint_id', editingCp?.id || '');
      formData.append('media_type', mediaType);
      formData.append('uploaded_by', 'admin');
      const res = await uploadMedia(formData);
      const url = serveMediaUrl(res.data.id);
      setCpForm(prev => ({ ...prev, [fieldKey]: url }));
      toast.success(`${mediaType.replace(/_/g, ' ')} uploaded & watermarked!`);
    } catch (e) { toast.error('Upload failed'); }
    setUploading(prev => ({ ...prev, [fieldKey]: false }));
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="routes" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Route & Checkpoint Manager</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Create routes, add checkpoints with photos, videos, arrow maps & AR waypoints</p>
            </div>
            <Dialog open={showCreateRoute} onOpenChange={setShowCreateRoute}>
              <DialogTrigger asChild>
                <Button data-testid="create-route-button"><Plus className="w-4 h-4 mr-2" /> New Route</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Route</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Route Name *</label>
                  <Input value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} placeholder="e.g. From Metro Gate 5" data-testid="new-route-name" /></div>
                  <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Description</label>
                  <Input value={newRoute.description} onChange={e => setNewRoute({...newRoute, description: e.target.value})} placeholder="Brief route description" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Start Type</label>
                    <Select value={newRoute.start_type} onValueChange={v => setNewRoute({...newRoute, start_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['metro', 'red_fort', 'omaxe', 'town_hall', 'building_entrance', 'custom'].map(t => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select></div>
                    <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Difficulty</label>
                    <Select value={newRoute.difficulty} onValueChange={v => setNewRoute({...newRoute, difficulty: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['easy', 'moderate', 'hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  </div>
                  <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Start Label</label>
                  <Input value={newRoute.start_label} onChange={e => setNewRoute({...newRoute, start_label: e.target.value})} placeholder="e.g. Chandni Chowk Metro - Gate 5" /></div>
                  <div><label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Estimated Time (minutes)</label>
                  <Input type="number" value={newRoute.estimated_time_minutes} onChange={e => setNewRoute({...newRoute, estimated_time_minutes: parseInt(e.target.value)||15})} /></div>
                  <Button className="w-full" onClick={handleCreateRoute} data-testid="submit-route">Create Route</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Routes List - 2 cols */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">Routes ({routes.length})</h3>
              {loading ? [1,2,3].map(i => <div key={i} className="h-16 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />) : routes.map(route => (
                <Card key={route.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedRoute?.id === route.id ? 'ring-2 ring-[hsl(var(--brand))]' : ''}`}
                  onClick={() => handleSelectRoute(route)} data-testid="admin-route-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Route className="w-5 h-5 text-[hsl(var(--brand))] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{route.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <span><MapPin className="w-3 h-3 inline" /> {route.checkpoint_count} CPs</span>
                        <span><Clock className="w-3 h-3 inline" /> {route.estimated_time_minutes}m</span>
                      </div>
                    </div>
                    <StatusBadge status={route.status} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); handleDeleteRoute(route.id); }}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Checkpoints - 3 cols */}
            <div className="lg:col-span-3">
              {selectedRoute ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{selectedRoute.name} — Checkpoints ({checkpoints.length})</h3>
                    <Button size="sm" onClick={openAddCheckpoint} data-testid="add-checkpoint-button">
                      <Plus className="w-3 h-3 mr-1" /> Add Checkpoint
                    </Button>
                  </div>
                  {checkpoints.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <MapPin className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">No checkpoints yet. Add your first checkpoint to start building the route.</p>
                        <Button onClick={openAddCheckpoint}><Plus className="w-4 h-4 mr-2" /> Add First Checkpoint</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {checkpoints.map((cp, idx) => (
                        <motion.div key={cp.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
                          <Card className="hover:shadow-md transition-shadow" data-testid="admin-checkpoint-card">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <span className="w-8 h-8 rounded-full bg-[hsl(var(--brand)/0.15)] text-[hsl(var(--brand))] text-sm font-bold flex items-center justify-center">
                                    {cp.order}
                                  </span>
                                  {idx < checkpoints.length - 1 && <div className="w-0.5 h-6 bg-[hsl(var(--border))] mt-1" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold">{cp.name}</p>
                                    <span className="text-lg">{DIRECTIONS.find(d => d.value === cp.direction)?.icon || '↑'}</span>
                                  </div>
                                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{cp.short_instruction}</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${RISK_LEVELS.find(r => r.value === cp.risk_level)?.color || 'bg-gray-100'}`}>
                                      {cp.risk_level} risk
                                    </span>
                                    {cp.indoor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Indoor</span>}
                                    {cp.floor_context && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{cp.floor_context}</span>}
                                    {cp.photo_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"><Image className="w-2 h-2 inline" /> Photo</span>}
                                    {cp.video_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700"><Video className="w-2 h-2 inline" /> Video</span>}
                                    {cp.arrow_map_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Arrow Map</span>}
                                    {cp.heading > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700"><Compass className="w-2 h-2 inline" /> {cp.heading}°</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditCheckpoint(cp)} data-testid="edit-checkpoint">
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteCheckpoint(cp.id)} data-testid="delete-checkpoint">
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Card><CardContent className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  <Route className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Select a route from the left to view and manage its checkpoints
                </CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ======= CHECKPOINT EDITOR DIALOG ======= */}
      <Dialog open={showCpEditor} onOpenChange={setShowCpEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCp ? `Edit Checkpoint #${editingCp.order}` : 'Add New Checkpoint'}</DialogTitle>
          </DialogHeader>

          <Tabs value={cpTab} onValueChange={setCpTab}>
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Photo & Video</TabsTrigger>
              <TabsTrigger value="arrow" className="text-xs">Arrow Map</TabsTrigger>
              <TabsTrigger value="ar" className="text-xs">AR / Compass</TabsTrigger>
            </TabsList>

            {/* TAB 1: Details */}
            <TabsContent value="details" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Checkpoint Name *</label>
                  <Input value={cpForm.name} onChange={e => setCpForm({...cpForm, name: e.target.value})} placeholder="e.g. Metro Gate 5 Exit" data-testid="cp-name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Order</label>
                  <Input type="number" value={cpForm.order} onChange={e => setCpForm({...cpForm, order: parseInt(e.target.value)||1})} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Direction *</label>
                  <Select value={cpForm.direction} onValueChange={v => setCpForm({...cpForm, direction: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.icon} {d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Short Instruction * (shown as main text)</label>
                <Input value={cpForm.short_instruction} onChange={e => setCpForm({...cpForm, short_instruction: e.target.value})} placeholder="e.g. Exit from Gate 5 of Metro Station" data-testid="cp-instruction" />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Long Instruction (detailed)</label>
                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={cpForm.long_instruction} onChange={e => setCpForm({...cpForm, long_instruction: e.target.value})} placeholder="Detailed step-by-step..." />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Landmark Description</label>
                <Input value={cpForm.landmark_description} onChange={e => setCpForm({...cpForm, landmark_description: e.target.value})} placeholder="e.g. Yellow gate with metro sign" />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">What to Look For</label>
                <Input value={cpForm.what_to_look_for} onChange={e => setCpForm({...cpForm, what_to_look_for: e.target.value})} placeholder="e.g. Look for the yellow Gate 5 sign" />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Fallback Text (offline/no-media)</label>
                <Input value={cpForm.fallback_text} onChange={e => setCpForm({...cpForm, fallback_text: e.target.value})} placeholder="Simple text if images don't load" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Risk Level</label>
                  <Select value={cpForm.risk_level} onValueChange={v => setCpForm({...cpForm, risk_level: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Floor (if indoor)</label>
                  <Input value={cpForm.floor_context} onChange={e => setCpForm({...cpForm, floor_context: e.target.value})} placeholder="e.g. 5th Floor" />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={cpForm.indoor} onCheckedChange={v => setCpForm({...cpForm, indoor: v})} />
                  <label className="text-xs">Indoor checkpoint</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={cpForm.is_critical} onCheckedChange={v => setCpForm({...cpForm, is_critical: v})} />
                  <label className="text-xs">Critical checkpoint</label>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Photo & Video */}
            <TabsContent value="media" className="space-y-4">
              <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
                Upload checkpoint photos and short videos. All uploads are automatically watermarked with "YASH ORNAMENTS".
              </div>
              {/* Photo Upload */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block flex items-center gap-1"><Image className="w-3 h-3" /> Checkpoint Photo</label>
                {cpForm.photo_url && (
                  <div className="mb-2 rounded-lg overflow-hidden border">
                    <img src={cpForm.photo_url} alt="Checkpoint" className="w-full h-40 object-cover" onContextMenu={e => e.preventDefault()} />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleMediaUpload(e.target.files?.[0], 'checkpoint_image', 'photo_url')} />
                    <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors text-xs">
                      {uploading.photo_url ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> {cpForm.photo_url ? 'Replace Photo' : 'Upload Photo'}</>}
                    </div>
                  </label>
                  {cpForm.photo_url && <Button variant="outline" size="sm" onClick={() => setCpForm({...cpForm, photo_url: ''})}>Remove</Button>}
                </div>
              </div>
              {/* Video Upload */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block flex items-center gap-1"><Video className="w-3 h-3" /> Short Video Clip</label>
                {cpForm.video_url && (
                  <div className="mb-2 p-2 rounded-lg border bg-[hsl(var(--muted))] text-xs">
                    <Video className="w-4 h-4 inline mr-1" /> Video uploaded: <span className="font-mono">{cpForm.video_url.split('/').pop()}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input type="file" accept="video/*" className="hidden" onChange={e => handleMediaUpload(e.target.files?.[0], 'route_video', 'video_url')} />
                    <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors text-xs">
                      {uploading.video_url ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> {cpForm.video_url ? 'Replace Video' : 'Upload Video'}</>}
                    </div>
                  </label>
                  {cpForm.video_url && <Button variant="outline" size="sm" onClick={() => setCpForm({...cpForm, video_url: ''})}>Remove</Button>}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Arrow Map */}
            <TabsContent value="arrow" className="space-y-4">
              <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
                Upload a directional arrow map image showing the path from this checkpoint. This helps customers understand which direction to walk.
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">Arrow Map Image</label>
                {cpForm.arrow_map_url && (
                  <div className="mb-2 rounded-lg overflow-hidden border">
                    <img src={cpForm.arrow_map_url} alt="Arrow Map" className="w-full h-40 object-cover" onContextMenu={e => e.preventDefault()} />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleMediaUpload(e.target.files?.[0], 'arrow_map', 'arrow_map_url')} />
                    <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors text-xs">
                      {uploading.arrow_map_url ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> {cpForm.arrow_map_url ? 'Replace Arrow Map' : 'Upload Arrow Map'}</>}
                    </div>
                  </label>
                  {cpForm.arrow_map_url && <Button variant="outline" size="sm" onClick={() => setCpForm({...cpForm, arrow_map_url: ''})}>Remove</Button>}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: AR / Compass */}
            <TabsContent value="ar" className="space-y-4">
              <div className="p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
                Set the compass heading (0-360°) for AR camera guidance. When a customer opens camera mode, the app uses this heading to show directional arrows overlaid on the camera feed.
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Compass Heading (degrees)</label>
                  <Input type="number" min="0" max="360" value={cpForm.heading} onChange={e => setCpForm({...cpForm, heading: parseFloat(e.target.value)||0})} data-testid="cp-heading" />
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">0° = North, 90° = East, 180° = South, 270° = West</p>
                </div>
                <div className="w-24 h-24 rounded-full border-2 border-[hsl(var(--border))] relative flex items-center justify-center bg-[hsl(var(--muted))]">
                  <div className="absolute text-[9px] text-[hsl(var(--muted-foreground))]" style={{ top: 4 }}>N</div>
                  <div className="absolute text-[9px] text-[hsl(var(--muted-foreground))]" style={{ right: 6, top: '50%', transform: 'translateY(-50%)' }}>E</div>
                  <div className="absolute text-[9px] text-[hsl(var(--muted-foreground))]" style={{ bottom: 4 }}>S</div>
                  <div className="absolute text-[9px] text-[hsl(var(--muted-foreground))]" style={{ left: 6, top: '50%', transform: 'translateY(-50%)' }}>W</div>
                  <div className="w-0.5 h-8 bg-red-500 origin-bottom" style={{ transform: `rotate(${cpForm.heading}deg)`, transformOrigin: 'bottom center', position: 'absolute', bottom: '50%' }} />
                  <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Latitude (approx)</label>
                  <Input type="number" step="0.0001" value={cpForm.lat} onChange={e => setCpForm({...cpForm, lat: parseFloat(e.target.value)||0})} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Longitude (approx)</label>
                  <Input type="number" step="0.0001" value={cpForm.lng} onChange={e => setCpForm({...cpForm, lng: parseFloat(e.target.value)||0})} />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <Camera className="w-4 h-4 inline mr-1" /> <strong>How AR works:</strong> When customer opens camera mode, the compass heading you set here is compared with the device compass. An arrow overlay shows "Walk this way", "Turn left", etc. Latitude/longitude help with approximate positioning.
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button className="flex-1" onClick={handleSaveCheckpoint} disabled={saving} data-testid="save-checkpoint">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> {editingCp ? 'Update Checkpoint' : 'Add Checkpoint'}</>}
            </Button>
            <Button variant="outline" onClick={() => setShowCpEditor(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
