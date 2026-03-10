import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { downloadTutorialPdf } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminTutorialPdf() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadTutorialPdf();
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'YashOrnaments_WayFinder_Tutorial.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      toast.success('Tutorial PDF downloaded!');
    } catch (e) {
      toast.error('Download failed');
    }
    setDownloading(false);
  };

  if (!isLoggedIn) { navigate('/login'); return null; }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <AdminSidebar active="tutorial-pdf" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2" data-testid="tutorial-pdf-title">Tutorial PDF</h1>
          <p className="text-sm text-muted-foreground mb-6">Download the complete app guide in Hindi + English</p>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Yash Ornaments WayFinder</h2>
              <p className="text-base mb-1">Complete App Tutorial</p>
              <p className="text-sm text-muted-foreground mb-6">Hindi + English / 12 sections with screenshots</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left mb-6">
                {[
                  'App overview / scope',
                  'User roles explained',
                  'How to login',
                  'Adding routes',
                  'Adding checkpoints',
                  'Uploading photos/videos',
                  'Media library usage',
                  'Schematic map guide',
                  'Customer flow walkthrough',
                  'Bug testing checklist',
                  'Quick reference card',
                  'Drag-drop reordering',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              <Button size="lg" onClick={handleDownload} disabled={downloading} className="px-8" data-testid="download-tutorial-btn">
                {downloading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating PDF...</>
                ) : downloaded ? (
                  <><CheckCircle className="w-5 h-5 mr-2" /> Download Again</>
                ) : (
                  <><FileDown className="w-5 h-5 mr-2" /> Download Tutorial PDF</>
                )}
              </Button>

              {downloaded && (
                <p className="text-xs text-green-600 mt-3">PDF downloaded! Check your downloads folder.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
