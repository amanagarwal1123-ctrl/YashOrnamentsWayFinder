import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import {
  adminGetRoutes, adminGetCheckpoints, adminCreateRoute, adminUpdateRoute,
  adminDeleteRoute, adminCreateCheckpoint, adminUpdateCheckpoint,
  adminDeleteCheckpoint, adminReorderCheckpoints, adminDuplicateRoute,
  adminDuplicateCheckpoint, adminExportRoute, adminImportRoute,
  uploadMedia, serveMediaUrl,
} from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Route as RouteIcon, Plus, MapPin, Clock, Trash2, Edit3, Image, Video,
  Compass, Upload, Save, GripVertical, Eye, Loader2, Camera,
  MoreVertical, Copy, Download, UploadCloud, Archive, FileJson, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DIRECTIONS = [
  { value: 'straight', label: 'Straight', icon: '\u2191' },
  { value: 'left', label: 'Turn Left', icon: '\u2190' },
  { value: 'right', label: 'Turn Right', icon: '\u2192' },
  { value: 'u_turn', label: 'U-Turn', icon: '\u21B6' },
  { value: 'enter', label: 'Enter Building', icon: '\u2386' },
  { value: 'climb', label: 'Stairs/Lift', icon: '\u2191\u2191' },
  { value: 'destination', label: 'Destination', icon: '\u2605' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
];

const START_TYPES = ['metro', 'red_fort', 'omaxe', 'gurudwara', 'town_hall', 'building_entrance', 'custom'];

const emptyCheckpoint = {
  name: '', short_instruction: '', long_instruction: '', landmark_description: '',
  what_to_look_for: '', direction: 'straight', indoor: false, floor_context: '',
  is_critical: true, risk_level: 'low', fallback_text: '', heading: 0, lat: 0, lng: 0,
};

/* ───────── Sortable Checkpoint Row ───────── */
function SortableCheckpointRow({ cp, idx, total, onEdit, onDelete, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cp.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };

  return (
    <div ref={setNodeRef} style={style} data-testid="admin-checkpoint-card">
      <Card className={`transition-shadow ${isDragging ? 'shadow-lg ring-2 ring-primary' : 'hover:shadow-md'}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted" data-testid="checkpoint-drag-handle">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex flex-col items-center">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{cp.order}</span>
              {idx < total - 1 && <div className="w-0.5 h-5 bg-border mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold truncate">{cp.name}</p>
                <span className="text-base">{DIRECTIONS.find(d => d.value === cp.direction)?.icon || '\u2191'}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{cp.short_instruction}</p>
              <div className="flex items-center gap-1 flex-wrap mt-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${RISK_LEVELS.find(r => r.value === cp.risk_level)?.color}`}>{cp.risk_level}</span>
                {cp.indoor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Indoor</span>}
                {cp.floor_context && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{cp.floor_context}</span>}
                {cp.photo_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"><Image className="w-2 h-2 inline" /> Photo</span>}
                {cp.video_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700"><Video className="w-2 h-2 inline" /> Video</span>}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid="checkpoint-actions-menu"><MoreVertical className="w-3.5 h-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(cp)} data-testid="edit-checkpoint"><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(cp.id)} data-testid="duplicate-checkpoint"><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(cp)} data-testid="delete-checkpoint"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function AdminRoutes() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useApp();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Route dialogs
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeForm, setRouteForm] = useState({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15, status: 'draft' });

  // Checkpoint dialogs
  const [showCpEditor, setShowCpEditor] = useState(false);
  const [editingCp, setEditingCp] = useState(null);
  const [cpForm, setCpForm] = useState({ ...emptyCheckpoint });
  const [cpTab, setCpTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState(null);

  // Validation errors
  const [routeErrors, setRouteErrors] = useState({});
  const [cpErrors, setCpErrors] = useState({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRoutes();
  }, [isLoggedIn, navigate]);

  const loadRoutes = async () => {
    try { const res = await adminGetRoutes(); setRoutes(res.data); } catch (e) { toast.error('Failed to load routes'); }
    setLoading(false);
  };

  const loadCheckpoints = useCallback(async (routeId) => {
    try { const res = await adminGetCheckpoints(routeId); setCheckpoints(res.data); } catch { setCheckpoints([]); }
  }, []);

  const handleSelectRoute = (route) => { setSelectedRoute(route); loadCheckpoints(route.id); };

  /* ─── Route CRUD ─── */
  const openCreateRoute = () => { setEditingRoute(null); setRouteForm({ name: '', description: '', start_type: 'metro', start_label: '', difficulty: 'easy', estimated_time_minutes: 15, status: 'draft' }); setRouteErrors({}); setShowRouteForm(true); };
  const openEditRoute = (route) => { setEditingRoute(route); setRouteForm({ name: route.name, description: route.description || '', start_type: route.start_type || 'metro', start_label: route.start_label || '', difficulty: route.difficulty || 'easy', estimated_time_minutes: route.estimated_time_minutes || 15, status: route.status || 'draft' }); setRouteErrors({}); setShowRouteForm(true); };

  const validateRoute = () => {
    const errs = {};
    if (!routeForm.name.trim()) errs.name = 'Route name is required';
    setRouteErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveRoute = async () => {
    if (!validateRoute()) return;
    setSaving(true);
    try {
      if (editingRoute) {
        const res = await adminUpdateRoute(editingRoute.id, routeForm);
        toast.success('Route updated');
        setSelectedRoute(res.data);
      } else {
        const res = await adminCreateRoute(routeForm);
        toast.success('Route created');
        handleSelectRoute(res.data);
      }
      setShowRouteForm(false);
      loadRoutes();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save route'); }
    setSaving(false);
  };

  const handleStatusChange = async (routeId, newStatus) => {
    try {
      await adminUpdateRoute(routeId, { status: newStatus });
      toast.success(`Route ${newStatus}`);
      loadRoutes();
      if (selectedRoute?.id === routeId) setSelectedRoute(prev => ({ ...prev, status: newStatus }));
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update status'); }
  };

  const requestDeleteRoute = (route) => setConfirmAction({ type: 'delete-route', id: route.id, label: route.name });
  const handleDeleteRoute = async (routeId) => {
    try {
      await adminDeleteRoute(routeId);
      toast.success('Route deleted');
      if (selectedRoute?.id === routeId) { setSelectedRoute(null); setCheckpoints([]); }
      loadRoutes();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete'); }
  };

  const handleDuplicateRoute = async (routeId) => {
    try {
      const res = await adminDuplicateRoute(routeId);
      toast.success('Route duplicated');
      loadRoutes();
      handleSelectRoute(res.data);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to duplicate'); }
  };

  const handleExportRoute = async (routeId) => {
    try {
      const res = await adminExportRoute(routeId);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `route-${res.data.route?.name?.replace(/\s+/g, '-')}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Route exported');
    } catch (e) { toast.error('Export failed'); }
  };

  const handleImportRoute = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.route || !data.checkpoints) { toast.error('Invalid route JSON format'); return; }
      const res = await adminImportRoute(data);
      toast.success(`Route "${res.data.name}" imported`);
      loadRoutes();
      handleSelectRoute(res.data);
    } catch (e) { toast.error(e.response?.data?.detail || 'Import failed - check JSON format'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ─── Checkpoint CRUD ─── */
  const openAddCheckpoint = () => {
    const nextOrder = checkpoints.length > 0 ? Math.max(...checkpoints.map(c => c.order)) + 1 : 1;
    setCpForm({ ...emptyCheckpoint, order: nextOrder });
    setEditingCp(null); setCpTab('details'); setCpErrors({}); setShowCpEditor(true);
  };

  const openEditCheckpoint = (cp) => { setCpForm({ ...cp }); setEditingCp(cp); setCpTab('details'); setCpErrors({}); setShowCpEditor(true); };

  const validateCp = () => {
    const errs = {};
    if (!cpForm.name.trim()) errs.name = 'Name is required';
    if (!cpForm.short_instruction.trim()) errs.short_instruction = 'Short instruction is required';
    setCpErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCheckpoint = async () => {
    if (!validateCp()) { setCpTab('details'); return; }
    setSaving(true);
    try {
      if (editingCp) {
        await adminUpdateCheckpoint(editingCp.id, cpForm);
        toast.success('Checkpoint updated');
      } else {
        await adminCreateCheckpoint({ ...cpForm, route_id: selectedRoute.id });
        toast.success('Checkpoint added');
      }
      loadCheckpoints(selectedRoute.id);
      loadRoutes();
      setShowCpEditor(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    setSaving(false);
  };

  const requestDeleteCheckpoint = (cp) => setConfirmAction({ type: 'delete-cp', id: cp.id, label: cp.name });
  const handleDeleteCheckpoint = async (cpId) => {
    try { await adminDeleteCheckpoint(cpId); toast.success('Checkpoint deleted'); loadCheckpoints(selectedRoute.id); loadRoutes(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete'); }
  };

  const handleDuplicateCheckpoint = async (cpId) => {
    try { await adminDuplicateCheckpoint(cpId); toast.success('Checkpoint duplicated'); loadCheckpoints(selectedRoute.id); loadRoutes(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to duplicate'); }
  };

  /* ─── Drag & Drop Reorder ─── */
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = checkpoints.findIndex(c => c.id === active.id);
    const newIndex = checkpoints.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...checkpoints];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const withNewOrder = reordered.map((cp, i) => ({ ...cp, order: i + 1 }));
    setCheckpoints(withNewOrder);
    try {
      await adminReorderCheckpoints(withNewOrder.map(cp => ({ id: cp.id, order: cp.order })));
      toast.success('Order saved');
    } catch { toast.error('Failed to save order'); loadCheckpoints(selectedRoute.id); }
  };

  /* ─── Media Upload ─── */
  const handleMediaUpload = async (file, mediaType, fieldKey) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('route_id', selectedRoute?.id || '');
      formData.append('checkpoint_id', editingCp?.id || '');
      formData.append('media_type', mediaType);
      const res = await uploadMedia(formData);
      setCpForm(prev => ({ ...prev, [fieldKey]: serveMediaUrl(res.data.id) }));
      toast.success('Uploaded & watermarked');
    } catch { toast.error('Upload failed'); }
    setUploading(prev => ({ ...prev, [fieldKey]: false }));
  };

  /* ─── Confirm Dialog Handler ─── */
  const executeConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete-route') await handleDeleteRoute(confirmAction.id);
    else if (confirmAction.type === 'delete-cp') await handleDeleteCheckpoint(confirmAction.id);
    setConfirmAction(null);
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminSidebar active="routes" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* ─── Header ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div>
              <h1 className="text-2xl font-bold" data-testid="routes-page-title">Route & Checkpoint CMS</h1>
              <p className="text-sm text-muted-foreground">Full route lifecycle: create, edit, reorder, publish, export</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportRoute} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="import-route-button">
                <UploadCloud className="w-4 h-4 mr-1.5" /> Import
              </Button>
              <Button size="sm" onClick={openCreateRoute} data-testid="create-route-button">
                <Plus className="w-4 h-4 mr-1.5" /> New Route
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ─── Routes List ─── */}
            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Routes ({routes.length})</h3>
              {loading ? [1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />) : routes.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No routes yet. Create your first route above.</CardContent></Card>
              ) : routes.map(route => (
                <Card key={route.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedRoute?.id === route.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleSelectRoute(route)} data-testid="admin-route-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <RouteIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{route.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span><MapPin className="w-3 h-3 inline" /> {route.checkpoint_count} CPs</span>
                        <span><Clock className="w-3 h-3 inline" /> {route.estimated_time_minutes}m</span>
                      </div>
                    </div>
                    <StatusBadge status={route.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid="route-actions-menu"><MoreVertical className="w-3.5 h-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEditRoute(route)} data-testid="edit-route"><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        {route.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(route.id, 'published')} data-testid="publish-route"><Check className="w-3.5 h-3.5 mr-2" /> Publish</DropdownMenuItem>}
                        {route.status === 'published' && <DropdownMenuItem onClick={() => handleStatusChange(route.id, 'draft')} data-testid="unpublish-route"><X className="w-3.5 h-3.5 mr-2" /> Unpublish</DropdownMenuItem>}
                        {route.status !== 'archived' && <DropdownMenuItem onClick={() => handleStatusChange(route.id, 'archived')} data-testid="archive-route"><Archive className="w-3.5 h-3.5 mr-2" /> Archive</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleDuplicateRoute(route.id)} data-testid="duplicate-route"><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportRoute(route.id)} data-testid="export-route"><Download className="w-3.5 h-3.5 mr-2" /> Export JSON</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isAdmin && <DropdownMenuItem className="text-destructive" onClick={() => requestDeleteRoute(route)} data-testid="delete-route"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ─── Checkpoints Panel ─── */}
            <div className="lg:col-span-3">
              {selectedRoute ? (
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold">{selectedRoute.name}</h3>
                      <p className="text-xs text-muted-foreground">{checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} &middot; {selectedRoute.status} &middot; Drag to reorder</p>
                    </div>
                    <Button size="sm" onClick={openAddCheckpoint} data-testid="add-checkpoint-button">
                      <Plus className="w-3 h-3 mr-1" /> Add Checkpoint
                    </Button>
                  </div>
                  {checkpoints.length === 0 ? (
                    <Card><CardContent className="p-8 text-center">
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">No checkpoints yet.</p>
                      <Button onClick={openAddCheckpoint}><Plus className="w-4 h-4 mr-2" /> Add First Checkpoint</Button>
                    </CardContent></Card>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={checkpoints.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {checkpoints.map((cp, idx) => (
                            <SortableCheckpointRow key={cp.id} cp={cp} idx={idx} total={checkpoints.length}
                              onEdit={openEditCheckpoint} onDelete={requestDeleteCheckpoint} onDuplicate={handleDuplicateCheckpoint} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ) : (
                <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
                  <RouteIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Select a route to manage its checkpoints
                </CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ═══ Route Form Dialog ═══ */}
      <Dialog open={showRouteForm} onOpenChange={setShowRouteForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRoute ? 'Edit Route' : 'Create New Route'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Route Name *</label>
              <Input value={routeForm.name} onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} placeholder="e.g. From Metro Gate 5" data-testid="route-form-name" className={routeErrors.name ? 'border-destructive' : ''} />
              {routeErrors.name && <p className="text-xs text-destructive mt-1">{routeErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input value={routeForm.description} onChange={e => setRouteForm({ ...routeForm, description: e.target.value })} placeholder="Brief route description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Type</label>
                <Select value={routeForm.start_type} onValueChange={v => setRouteForm({ ...routeForm, start_type: v })}>
                  <SelectTrigger data-testid="route-form-start-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {START_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                <Select value={routeForm.difficulty} onValueChange={v => setRouteForm({ ...routeForm, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['easy', 'moderate', 'hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Label</label>
              <Input value={routeForm.start_label} onChange={e => setRouteForm({ ...routeForm, start_label: e.target.value })} placeholder="e.g. Chandni Chowk Metro - Gate 5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Est. Time (min)</label>
                <Input type="number" value={routeForm.estimated_time_minutes} onChange={e => setRouteForm({ ...routeForm, estimated_time_minutes: parseInt(e.target.value) || 15 })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={routeForm.status} onValueChange={v => setRouteForm({ ...routeForm, status: v })}>
                  <SelectTrigger data-testid="route-form-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['draft', 'published', 'archived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveRoute} disabled={saving} data-testid="route-form-submit">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingRoute ? 'Update Route' : 'Create Route'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Checkpoint Editor Dialog ═══ */}
      <Dialog open={showCpEditor} onOpenChange={setShowCpEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCp ? `Edit Checkpoint #${editingCp.order}` : 'Add New Checkpoint'}</DialogTitle></DialogHeader>
          <Tabs value={cpTab} onValueChange={setCpTab}>
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Photo & Video</TabsTrigger>
              <TabsTrigger value="arrow" className="text-xs">Arrow Map</TabsTrigger>
              <TabsTrigger value="ar" className="text-xs">AR / Compass</TabsTrigger>
            </TabsList>

            {/* TAB: Details */}
            <TabsContent value="details" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                  <Input value={cpForm.name} onChange={e => setCpForm({ ...cpForm, name: e.target.value })} placeholder="e.g. Metro Gate 5 Exit" data-testid="cp-name" className={cpErrors.name ? 'border-destructive' : ''} />
                  {cpErrors.name && <p className="text-xs text-destructive mt-0.5">{cpErrors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Order</label>
                  <Input type="number" value={cpForm.order} onChange={e => setCpForm({ ...cpForm, order: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction</label>
                  <Select value={cpForm.direction} onValueChange={v => setCpForm({ ...cpForm, direction: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.icon} {d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Instruction *</label>
                <Input value={cpForm.short_instruction} onChange={e => setCpForm({ ...cpForm, short_instruction: e.target.value })} placeholder="One-line direction" data-testid="cp-instruction" className={cpErrors.short_instruction ? 'border-destructive' : ''} />
                {cpErrors.short_instruction && <p className="text-xs text-destructive mt-0.5">{cpErrors.short_instruction}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Long Instruction</label>
                <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={cpForm.long_instruction} onChange={e => setCpForm({ ...cpForm, long_instruction: e.target.value })} placeholder="Detailed step-by-step..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Landmark Description</label>
                <Input value={cpForm.landmark_description} onChange={e => setCpForm({ ...cpForm, landmark_description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">What to Look For</label>
                <Input value={cpForm.what_to_look_for} onChange={e => setCpForm({ ...cpForm, what_to_look_for: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fallback Text</label>
                <Input value={cpForm.fallback_text} onChange={e => setCpForm({ ...cpForm, fallback_text: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Risk Level</label>
                  <Select value={cpForm.risk_level} onValueChange={v => setCpForm({ ...cpForm, risk_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Floor</label>
                  <Input value={cpForm.floor_context} onChange={e => setCpForm({ ...cpForm, floor_context: e.target.value })} placeholder="e.g. 5th Floor" />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-1">
                <div className="flex items-center gap-2"><Switch checked={cpForm.indoor} onCheckedChange={v => setCpForm({ ...cpForm, indoor: v })} /><label className="text-xs">Indoor</label></div>
                <div className="flex items-center gap-2"><Switch checked={cpForm.is_critical} onCheckedChange={v => setCpForm({ ...cpForm, is_critical: v })} /><label className="text-xs">Critical</label></div>
              </div>
            </TabsContent>

            {/* TAB: Photo & Video */}
            <TabsContent value="media" className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">Uploads are automatically watermarked.</div>
              <MediaField label="Checkpoint Photo" icon={<Image className="w-3 h-3" />} value={cpForm.photo_url} fieldKey="photo_url" accept="image/*" mediaType="checkpoint_image" uploading={uploading} onUpload={handleMediaUpload} onClear={() => setCpForm({ ...cpForm, photo_url: '' })} isImage />
              <MediaField label="Short Video Clip" icon={<Video className="w-3 h-3" />} value={cpForm.video_url} fieldKey="video_url" accept="video/*" mediaType="route_video" uploading={uploading} onUpload={handleMediaUpload} onClear={() => setCpForm({ ...cpForm, video_url: '' })} />
            </TabsContent>

            {/* TAB: Arrow Map */}
            <TabsContent value="arrow" className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">Upload a directional arrow map image.</div>
              <MediaField label="Arrow Map Image" value={cpForm.arrow_map_url} fieldKey="arrow_map_url" accept="image/*" mediaType="arrow_map" uploading={uploading} onUpload={handleMediaUpload} onClear={() => setCpForm({ ...cpForm, arrow_map_url: '' })} isImage />
            </TabsContent>

            {/* TAB: AR / Compass */}
            <TabsContent value="ar" className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">Set compass heading (0-360) for AR camera guidance.</div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Compass Heading</label>
                  <Input type="number" min="0" max="360" value={cpForm.heading} onChange={e => setCpForm({ ...cpForm, heading: parseFloat(e.target.value) || 0 })} data-testid="cp-heading" />
                  <p className="text-[10px] text-muted-foreground mt-1">0=N, 90=E, 180=S, 270=W</p>
                </div>
                <div className="w-20 h-20 rounded-full border-2 border-border relative flex items-center justify-center bg-muted">
                  <div className="absolute text-[9px] text-muted-foreground" style={{ top: 2 }}>N</div>
                  <div className="w-0.5 h-6 bg-red-500 origin-bottom absolute" style={{ transform: `rotate(${cpForm.heading}deg)`, transformOrigin: 'bottom center', bottom: '50%' }} />
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Latitude</label><Input type="number" step="0.0001" value={cpForm.lat} onChange={e => setCpForm({ ...cpForm, lat: parseFloat(e.target.value) || 0 })} /></div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Longitude</label><Input type="number" step="0.0001" value={cpForm.lng} onChange={e => setCpForm({ ...cpForm, lng: parseFloat(e.target.value) || 0 })} /></div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button className="flex-1" onClick={handleSaveCheckpoint} disabled={saving} data-testid="save-checkpoint">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingCp ? 'Update' : 'Add'} Checkpoint
            </Button>
            <Button variant="outline" onClick={() => setShowCpEditor(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Confirm Dialog ═══ */}
      <AlertDialog open={!!confirmAction} onOpenChange={open => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {confirmAction?.type === 'delete-route' ? 'Route' : 'Checkpoint'} Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{confirmAction?.label}</strong>?
              {confirmAction?.type === 'delete-route' && ' This will also delete all its checkpoints.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────── Reusable Media Upload Field ───────── */
function MediaField({ label, icon, value, fieldKey, accept, mediaType, uploading, onUpload, onClear, isImage }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">{icon} {label}</label>
      {value && isImage && (
        <div className="mb-2 rounded-lg overflow-hidden border"><img src={value} alt={label} className="w-full h-40 object-cover" onContextMenu={e => e.preventDefault()} /></div>
      )}
      {value && !isImage && (
        <div className="mb-2 p-2 rounded-lg border bg-muted text-xs"><Video className="w-4 h-4 inline mr-1" /> Uploaded</div>
      )}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <input type="file" accept={accept} className="hidden" onChange={e => onUpload(e.target.files?.[0], mediaType, fieldKey)} />
          <div className="flex items-center justify-center h-10 rounded-md border border-dashed border-border hover:bg-muted transition-colors text-xs">
            {uploading[fieldKey] ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> {value ? 'Replace' : 'Upload'}</>}
          </div>
        </label>
        {value && <Button variant="outline" size="sm" onClick={onClear}>Remove</Button>}
      </div>
    </div>
  );
}
