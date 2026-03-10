import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetBranding, adminUpdateBranding } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Paintbrush, Save, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBrandingSettings() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [branding, setBranding] = useState({
    watermark_text: 'YASH ORNAMENTS',
    watermark_opacity: 0.20,
    watermark_font_size: 36,
    watermark_rotation: -30,
    watermark_spacing: 200,
    branding_footer: 'Navigation powered by YASH ORNAMENTS',
    app_name: 'Yash Ornaments WayFinder',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    adminGetBranding().then(r => {
      setBranding(prev => ({ ...prev, ...r.data }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateBranding(branding);
      toast.success('Branding settings saved');
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="branding" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Branding Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Configure watermark and branding for navigation media</p>

          {loading ? (
            <div className="h-48 bg-[hsl(var(--muted))] animate-pulse rounded-xl" />
          ) : (
            <div className="space-y-6">
              {/* App Name */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-[hsl(var(--brand))]" /> App Name
                  </h3>
                  <Input
                    value={branding.app_name}
                    onChange={e => setBranding({ ...branding, app_name: e.target.value })}
                    placeholder="Yash Ornaments WayFinder"
                    data-testid="branding-app-name"
                  />
                </CardContent>
              </Card>

              {/* Watermark Settings */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-4">Watermark Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Watermark Text</label>
                      <Input
                        value={branding.watermark_text}
                        onChange={e => setBranding({ ...branding, watermark_text: e.target.value })}
                        placeholder="YASH ORNAMENTS"
                        data-testid="branding-watermark-text"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[hsl(var(--muted-foreground))] mb-2 block">
                        Opacity: {Math.round(branding.watermark_opacity * 100)}%
                      </label>
                      <Slider
                        value={[branding.watermark_opacity * 100]}
                        onValueChange={v => setBranding({ ...branding, watermark_opacity: v[0] / 100 })}
                        min={5}
                        max={50}
                        step={1}
                        className="w-full"
                        data-testid="branding-opacity-slider"
                      />
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Recommended: 15-25%</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Font Size (px)</label>
                        <Input
                          type="number"
                          value={branding.watermark_font_size}
                          onChange={e => setBranding({ ...branding, watermark_font_size: parseInt(e.target.value) || 36 })}
                          data-testid="branding-font-size"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Rotation (degrees)</label>
                        <Input
                          type="number"
                          value={branding.watermark_rotation}
                          onChange={e => setBranding({ ...branding, watermark_rotation: parseInt(e.target.value) || -30 })}
                          data-testid="branding-rotation"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Spacing Between Repetitions (px)</label>
                      <Input
                        type="number"
                        value={branding.watermark_spacing}
                        onChange={e => setBranding({ ...branding, watermark_spacing: parseInt(e.target.value) || 200 })}
                        data-testid="branding-spacing"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Branding */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-3">Navigation Footer Branding</h3>
                  <Input
                    value={branding.branding_footer}
                    onChange={e => setBranding({ ...branding, branding_footer: e.target.value })}
                    placeholder="Navigation powered by YASH ORNAMENTS"
                    data-testid="branding-footer-text"
                  />
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Appears on all customer navigation screens</p>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="border-dashed">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Watermark Preview
                  </h3>
                  <div className="relative bg-[hsl(var(--muted))] rounded-lg h-48 overflow-hidden" data-testid="watermark-preview">
                    {/* Simulated watermark preview */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Checkpoint Image Area</p>
                    </div>
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <p
                          key={i}
                          className="absolute text-sm font-bold whitespace-nowrap"
                          style={{
                            top: `${i * 30 - 10}%`,
                            left: `${(i % 2) * 15 - 20}%`,
                            transform: `rotate(${branding.watermark_rotation}deg)`,
                            opacity: branding.watermark_opacity,
                            color: 'white',
                            textShadow: '0 0 4px rgba(0,0,0,0.3)',
                            fontSize: `${Math.max(12, branding.watermark_font_size * 0.4)}px`,
                          }}
                        >
                          {branding.watermark_text} &nbsp;&nbsp;&nbsp; {branding.watermark_text} &nbsp;&nbsp;&nbsp; {branding.watermark_text}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full h-11" onClick={handleSave} disabled={saving} data-testid="save-branding">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Branding Settings</>}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
