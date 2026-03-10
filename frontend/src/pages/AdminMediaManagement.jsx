import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetMedia, adminDeleteMedia, uploadMedia, serveMediaUrl, adminGetRoutes } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Image, Upload, Trash2, Eye, Check, Shield, Loader2, FileImage } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMediaManagement() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [media, setMedia] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ route_id: '', checkpoint_id: '', media_type: 'checkpoint_image' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadData();
  }, [isLoggedIn, navigate]);

  const loadData = async () => {
    try {
      const [mediaRes, routesRes] = await Promise.all([
        adminGetMedia(),
        adminGetRoutes(),
      ]);
      setMedia(mediaRes.data);
      setRoutes(routesRes.data);
    } catch (e) {}
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('route_id', uploadForm.route_id);
      formData.append('checkpoint_id', uploadForm.checkpoint_id);
      formData.append('media_type', uploadForm.media_type);
      formData.append('uploaded_by', 'admin');
      
      await uploadMedia(formData);
      toast.success('Media uploaded and watermarked!');
      setShowUpload(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      loadData();
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Delete this media?')) return;
    try {
      await adminDeleteMedia(mediaId);
      toast.success('Media deleted');
      loadData();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const mediaTypeLabels = {
    checkpoint_image: 'Checkpoint Image',
    arrow_map: 'Arrow Map',
    route_image: 'Route Image',
    route_video: 'Route Video',
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="media" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Media Management</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage watermarked navigation media</p>
            </div>
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
              <DialogTrigger asChild>
                <Button data-testid="upload-media-button"><Upload className="w-4 h-4 mr-2" /> Upload Media</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Upload Navigation Media</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Media Type</label>
                    <Select value={uploadForm.media_type} onValueChange={v => setUploadForm({ ...uploadForm, media_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(mediaTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Route (optional)</label>
                    <Select value={uploadForm.route_id} onValueChange={v => setUploadForm({ ...uploadForm, route_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Select File</label>
                    <Input type="file" accept="image/*,video/*" onChange={handleFileChange} data-testid="media-file-input" />
                  </div>

                  {previewUrl && (
                    <div>
                      <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Preview (watermark will be applied)</label>
                      <div className="relative rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                        <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
                        {/* Simulated watermark preview overlay */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <p
                              key={i}
                              className="absolute text-xs font-bold whitespace-nowrap"
                              style={{
                                top: `${i * 25 - 10}%`,
                                left: `${(i % 2) * 10 - 15}%`,
                                transform: 'rotate(-30deg)',
                                opacity: 0.25,
                                color: 'white',
                                textShadow: '0 0 3px rgba(0,0,0,0.5)',
                              }}
                            >
                              YASH ORNAMENTS &nbsp;&nbsp; YASH ORNAMENTS &nbsp;&nbsp; YASH ORNAMENTS
                            </p>
                          ))}
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 text-white text-[10px]">
                          <Shield className="w-3 h-3" /> Watermark will be applied
                        </div>
                      </div>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleUpload} disabled={uploading || !selectedFile} data-testid="submit-upload">
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading & Watermarking...</> : <><Upload className="w-4 h-4 mr-2" /> Upload & Watermark</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Media Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="aspect-video bg-[hsl(var(--muted))] animate-pulse rounded-xl" />)}
            </div>
          ) : media.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileImage className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
                <h3 className="font-semibold mb-1">No Media Uploaded</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Upload navigation media to get started. Watermarks are applied automatically.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map(m => (
                <Card key={m.id} className="overflow-hidden group" data-testid="media-card">
                  <div className="relative aspect-video bg-[hsl(var(--muted))]">
                    {m.file_ext && ['jpg', 'jpeg', 'png', 'webp'].includes(m.file_ext) ? (
                      <img
                        src={serveMediaUrl(m.id)}
                        alt={m.filename}
                        className="w-full h-full object-cover"
                        onContextMenu={e => e.preventDefault()}
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                      </div>
                    )}
                    {/* Watermark badge */}
                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${m.watermark_applied ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                      {m.watermark_applied ? <><Check className="w-2 h-2 inline mr-0.5" />Watermarked</> : 'No Watermark'}
                    </div>
                    {/* Delete hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)} data-testid="delete-media">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-[10px] font-medium truncate">{m.filename}</p>
                    <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                      {mediaTypeLabels[m.media_type] || m.media_type} • {(m.file_size / 1024).toFixed(0)}KB
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
