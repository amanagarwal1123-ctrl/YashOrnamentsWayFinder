import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetBusinesses, adminGenerateQR, adminGetQRSources } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Download, Copy, ExternalLink, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminQRGeneration() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [businesses, setBusinesses] = useState([]);
  const [qrSources, setQrSources] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState('');
  const [campaign, setCampaign] = useState('');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    Promise.all([
      adminGetBusinesses().then(r => setBusinesses(r.data)),
      adminGetQRSources().then(r => setQrSources(r.data)),
    ]).finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  const handleGenerate = async () => {
    if (!selectedBiz) { toast.error('Please select a business'); return; }
    setGenerating(true);
    try {
      const res = await adminGenerateQR({
        business_id: selectedBiz,
        campaign: campaign || 'qr-generated',
        description: description,
      });
      setGeneratedQR(res.data);
      // Refresh QR sources list
      adminGetQRSources().then(r => setQrSources(r.data));
      toast.success('QR code generated successfully!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate QR');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!generatedQR?.qr_image_base64) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedQR.qr_image_base64}`;
    link.download = `QR_${generatedQR.qr_code}.png`;
    link.click();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="qr-codes" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">QR Code Generation</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Generate QR codes for AJPL or Yash Ornaments customers</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generator */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-[hsl(var(--brand))]" />
                  <h2 className="font-semibold">Generate New QR Code</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Business</label>
                    <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                      <SelectTrigger data-testid="qr-business-select"><SelectValue placeholder="Select business" /></SelectTrigger>
                      <SelectContent>
                        {businesses.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${b.slug === 'ajpl' ? 'bg-red-500' : 'bg-blue-500'}`} />
                              {b.name} ({b.brand_type})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Campaign (optional)</label>
                    <Input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="e.g. metro-promo, walk-in" data-testid="qr-campaign" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Description (optional)</label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Where will this QR be placed?" data-testid="qr-description" />
                  </div>

                  <Button className="w-full h-11" onClick={handleGenerate} disabled={generating || !selectedBiz} data-testid="generate-qr-button">
                    {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><QrCode className="w-4 h-4 mr-2" /> Generate QR Code</>}
                  </Button>
                </div>

                {/* Generated Result */}
                {generatedQR && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
                    <div className="text-center">
                      <div className="inline-block p-4 bg-white rounded-xl shadow-md mb-4" data-testid="generated-qr-image">
                        <img
                          src={`data:image/png;base64,${generatedQR.qr_image_base64}`}
                          alt="Generated QR Code"
                          className="w-48 h-48"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <p className="text-sm font-medium mb-1">{generatedQR.business_name}</p>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] mb-1" data-testid="generated-qr-code">{generatedQR.qr_code}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-4 break-all">{generatedQR.scan_url}</p>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" onClick={downloadQR} data-testid="download-qr">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyCode(generatedQR.qr_code)} data-testid="copy-qr-code">
                          <Copy className="w-3 h-3 mr-1" /> Copy Code
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(generatedQR.scan_url, '_blank')} data-testid="test-qr-link">
                          <ExternalLink className="w-3 h-3 mr-1" /> Test
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Existing QR Codes */}
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] mb-3">Existing QR Codes ({qrSources.length})</h3>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="h-16 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)
                ) : qrSources.length === 0 ? (
                  <Card><CardContent className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">No QR codes yet</CardContent></Card>
                ) : qrSources.map(qr => (
                  <Card key={qr.id} data-testid="qr-source-card">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-[hsl(var(--brand))] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-medium truncate">{qr.code}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {qr.business_name} • {qr.campaign} • Scans: {qr.scan_count}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyCode(qr.code)} title="Copy code">
                            <Copy className="w-3 h-3" />
                          </Button>
                          {qr.active ? (
                            <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-gray-400" title="Inactive" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
