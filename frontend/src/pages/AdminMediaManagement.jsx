import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetMedia, adminDeleteMedia, uploadMedia, serveMediaUrl, adminGetRoutes } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Upload, Trash2, Check, Shield, Loader2, FileImage, Search, X, Grid3X3,
  List, Eye, RotateCcw, XCircle, Image, Video, File,
} from 'lucide-react';
import { toast } from 'sonner';

const MEDIA_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'checkpoint_image', label: 'Checkpoint Image' },
  { value: 'arrow_map', label: 'Arrow Map' },
  { value: 'route_image', label: 'Route Image' },
  { value: 'route_video', label: 'Route Video' },
];

const TYPE_LABELS = { checkpoint_image: 'Checkpoint', arrow_map: 'Arrow Map', route_image: 'Route', route_video: 'Video' };
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatSize(bytes) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / (1024 * 1024)).toFixed(1)}MB`; }
function isImageExt(ext) { return ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext); }

/* ───── Upload Queue Item ───── */
function UploadQueueItem({ item, onRetry, onCancel }) {
  const icon = item.file.type.startsWith('video') ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />;
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50" data-testid="upload-queue-item">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatSize(item.file.size)}</p>
        {item.status === 'uploading' && <Progress value={item.progress} className="h-1 mt-1" />}
        {item.status === 'error' && <p className="text-[10px] text-destructive mt-0.5">{item.error}</p>}
      </div>
      {item.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {item.status === 'done' && <Check className="w-4 h-4 text-green-600" />}
      {item.status === 'error' && (
        <div className="flex gap-1">
          <button onClick={() => onRetry(item.id)} className="p-1 hover:bg-muted rounded" data-testid="upload-retry"><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={() => onCancel(item.id)} className="p-1 hover:bg-muted rounded" data-testid="upload-cancel-item"><XCircle className="w-3.5 h-3.5 text-destructive" /></button>
        </div>
      )}
      {item.status === 'pending' && (
        <button onClick={() => onCancel(item.id)} className="p-1 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );
}

/* ───── Main Component ───── */
export default function AdminMediaManagement() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useApp();
  const isAdmin = user?.role === 'admin';
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  const [media, setMedia] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterRoute, setFilterRoute] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload queue
  const [queue, setQueue] = useState([]);
  const [uploadConfig, setUploadConfig] = useState({ route_id: '', media_type: 'checkpoint_image' });
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Preview & delete
  const [previewMedia, setPreviewMedia] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRoutes();
    loadMedia();
  }, [isLoggedIn, navigate]);

  const loadRoutes = async () => {
    try { const res = await adminGetRoutes(); setRoutes(res.data); } catch {}
  };

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') params.media_type = filterType;
      if (filterRoute !== 'all') params.route_id = filterRoute;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await adminGetMedia(params);
      setMedia(res.data);
    } catch { toast.error('Failed to load media'); }
    setLoading(false);
  }, [filterType, filterRoute, searchTerm]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  /* ─── Drag & Drop Zone ─── */
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  /* ─── File Selection ─── */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFilesToQueue(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFilesToQueue = (files) => {
    const items = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: exceeds 50MB limit`);
        continue;
      }
      items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, status: 'pending', progress: 0, error: '' });
    }
    if (items.length) {
      setQueue(prev => [...prev, ...items]);
      setShowUploadPanel(true);
    }
  };

  /* ─── Upload Processing ─── */
  const processQueue = async () => {
    const pending = queue.filter(i => i.status === 'pending');
    if (!pending.length) return;

    for (const item of pending) {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 10 } : q));
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('route_id', uploadConfig.route_id);
        formData.append('media_type', uploadConfig.media_type);
        // Simulate progress since axios doesn't give real progress for small files
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 50 } : q));
        await uploadMedia(formData);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done', progress: 100 } : q));
      } catch (e) {
        const msg = e.response?.data?.detail || 'Upload failed';
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: msg } : q));
      }
    }
    loadMedia();
  };

  const retryItem = (id) => setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'pending', progress: 0, error: '' } : q));
  const cancelItem = (id) => setQueue(prev => prev.filter(q => q.id !== id));
  const clearQueue = () => { setQueue([]); setShowUploadPanel(false); };

  const pendingCount = queue.filter(i => i.status === 'pending').length;
  const uploadingCount = queue.filter(i => i.status === 'uploading').length;

  /* ─── Delete ─── */
  const executeDelete = async () => {
    if (!deleteTarget) return;
    try { await adminDeleteMedia(deleteTarget.id); toast.success('Media deleted'); loadMedia(); }
    catch { toast.error('Delete failed'); }
    setDeleteTarget(null);
  };

  const routeLookup = Object.fromEntries(routes.map(r => [r.id, r.name]));

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminSidebar active="media" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* ─── Header ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
            <div>
              <h1 className="text-2xl font-bold" data-testid="media-page-title">Media Library</h1>
              <p className="text-sm text-muted-foreground">{media.length} files &middot; Drag & drop to upload</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} data-testid="upload-media-button">
                <Upload className="w-4 h-4 mr-1.5" /> Upload
              </Button>
            </div>
          </div>

          {/* ─── Filters ─── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by filename..." className="pl-9 h-9" data-testid="media-search" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-9" data-testid="media-filter-type"><SelectValue /></SelectTrigger>
              <SelectContent>{MEDIA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterRoute} onValueChange={setFilterRoute}>
              <SelectTrigger className="w-[160px] h-9" data-testid="media-filter-route"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-l-md`} data-testid="view-grid"><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-r-md`} data-testid="view-list"><List className="w-4 h-4" /></button>
            </div>
          </div>

          {/* ─── Drop Zone / Upload Panel ─── */}
          {showUploadPanel && (
            <Card className="mb-4" data-testid="upload-panel">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Upload Queue ({queue.length})</h3>
                  <div className="flex items-center gap-2">
                    <Select value={uploadConfig.media_type} onValueChange={v => setUploadConfig(p => ({ ...p, media_type: v }))}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MEDIA_TYPES.filter(t => t.value !== 'all').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={uploadConfig.route_id || 'none'} onValueChange={v => setUploadConfig(p => ({ ...p, route_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="none">No Route</SelectItem>{routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {queue.map(item => <UploadQueueItem key={item.id} item={item} onRetry={retryItem} onCancel={cancelItem} />)}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={processQueue} disabled={!pendingCount || uploadingCount > 0} data-testid="start-upload">
                    {uploadingCount > 0 ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-1" /> Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearQueue}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Drag Zone Overlay + Content ─── */}
          <div ref={dropRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="relative">
            {dragging && (
              <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center" data-testid="drop-overlay">
                <div className="text-center"><Upload className="w-10 h-10 mx-auto mb-2 text-primary" /><p className="text-sm font-medium text-primary">Drop files here to upload</p></div>
              </div>
            )}

            {/* ─── Media Grid / List ─── */}
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2'}>
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className={`${viewMode === 'grid' ? 'aspect-video' : 'h-14'} bg-muted animate-pulse rounded-lg`} />)}
              </div>
            ) : media.length === 0 ? (
              <div onDragOver={handleDragOver} onDrop={handleDrop} className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()} data-testid="empty-drop-zone">
                <FileImage className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No Media Found</h3>
                <p className="text-sm text-muted-foreground mb-3">{searchTerm || filterType !== 'all' || filterRoute !== 'all' ? 'Try different filters' : 'Drag & drop files or click to upload'}</p>
                <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Browse Files</Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {media.map(m => (
                  <Card key={m.id} className="overflow-hidden group cursor-pointer" onClick={() => setPreviewMedia(m)} data-testid="media-card">
                    <div className="relative aspect-video bg-muted">
                      {isImageExt(m.file_ext) ? (
                        <img src={serveMediaUrl(m.id)} alt={m.filename} className="w-full h-full object-cover" loading="lazy" onContextMenu={e => e.preventDefault()} draggable={false} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><File className="w-8 h-8 text-muted-foreground" /><span className="text-xs ml-1 uppercase">{m.file_ext}</span></div>
                      )}
                      <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${m.watermark_applied ? 'bg-green-600/90 text-white' : 'bg-yellow-500/90 text-black'}`}>
                        {m.watermark_applied ? <><Check className="w-2 h-2 inline mr-0.5" />WM</> : 'No WM'}
                      </div>
                      {isAdmin && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setPreviewMedia(m); }} data-testid="preview-media"><Eye className="w-3 h-3" /></Button>
                          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(m); }} data-testid="delete-media"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-[10px] font-medium truncate">{m.filename}</p>
                      <p className="text-[9px] text-muted-foreground">{TYPE_LABELS[m.media_type] || m.media_type} &middot; {formatSize(m.file_size)}{m.route_id ? ` &middot; ${routeLookup[m.route_id] || 'Route'}` : ''}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* ─── List View ─── */
              <div className="space-y-1">
                {media.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group" onClick={() => setPreviewMedia(m)} data-testid="media-list-item">
                    <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {isImageExt(m.file_ext) ? (
                        <img src={serveMediaUrl(m.id)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : <div className="w-full h-full flex items-center justify-center"><File className="w-5 h-5 text-muted-foreground" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.filename}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[m.media_type]} &middot; {formatSize(m.file_size)}{m.route_id ? ` &middot; ${routeLookup[m.route_id] || ''}` : ''} &middot; {new Date(m.upload_timestamp).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.watermark_applied ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {m.watermark_applied ? 'Watermarked' : 'No WM'}
                    </span>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setDeleteTarget(m); }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ═══ Preview Dialog ═══ */}
      <Dialog open={!!previewMedia} onOpenChange={open => { if (!open) setPreviewMedia(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="truncate">{previewMedia?.filename}</DialogTitle></DialogHeader>
          {previewMedia && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border bg-muted">
                {isImageExt(previewMedia.file_ext) ? (
                  <img src={serveMediaUrl(previewMedia.id)} alt={previewMedia.filename} className="w-full max-h-[60vh] object-contain" onContextMenu={e => e.preventDefault()} />
                ) : (
                  <div className="p-8 text-center"><File className="w-12 h-12 mx-auto mb-2 text-muted-foreground" /><p className="text-sm">{previewMedia.file_ext.toUpperCase()} file</p></div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Type:</span> {TYPE_LABELS[previewMedia.media_type] || previewMedia.media_type}</div>
                <div><span className="text-muted-foreground">Size:</span> {formatSize(previewMedia.file_size)}</div>
                <div><span className="text-muted-foreground">Route:</span> {routeLookup[previewMedia.route_id] || 'None'}</div>
                <div><span className="text-muted-foreground">Uploaded:</span> {new Date(previewMedia.upload_timestamp).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Watermark:</span> {previewMedia.watermark_applied ? 'Applied' : 'Not applied'}</div>
                <div><span className="text-muted-foreground">Extension:</span> .{previewMedia.file_ext}</div>
              </div>
              <div className="flex gap-2">
                {isAdmin && previewMedia.watermark_applied && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded">
                    <Shield className="w-3 h-3" /> Original accessible to admins only
                  </div>
                )}
                {isAdmin && <Button size="sm" variant="destructive" onClick={() => { setPreviewMedia(null); setDeleteTarget(previewMedia); }} data-testid="preview-delete"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirm ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete <strong>{deleteTarget?.filename}</strong>? Both the watermarked and original files will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-media">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
