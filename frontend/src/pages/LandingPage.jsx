import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { createSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Navigation, Phone, MessageCircle, HelpCircle, Compass, Shield, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const { session, business, startSession } = useApp();
  const [qrInput, setQrInput] = useState(qrCode || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (qrCode && !session) {
      handleStart(qrCode);
    }
  }, [qrCode]);

  const handleStart = async (code) => {
    if (!code) { toast.error('Please enter a QR code'); return; }
    setLoading(true);
    try {
      const res = await createSession(code, navigator.userAgent);
      startSession(res.data.session, res.data.business);
      toast.success(`Welcome! Navigating to ${res.data.business.destination_label || res.data.business.name}`);
      navigate('/hub');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  // Session active - show navigation hub
  if (session && business) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[hsl(var(--primary))]" />
          <div className="noise absolute inset-0" />
          <div className="relative max-w-[480px] mx-auto px-4 py-8 text-[hsl(var(--primary-foreground))]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[hsl(var(--gold))]" />
                <span className="text-xs font-medium text-[hsl(var(--gold))]">WayFinder</span>
              </div>
              <h1 className="font-display text-3xl font-bold mb-1" data-testid="landing-business-name">
                {business.full_name}
              </h1>
              <p className="text-sm opacity-80 mb-4" data-testid="landing-destination-label">{business.address}</p>
              <div className="flex items-center gap-3 text-xs opacity-70">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Offline Ready</span>
                <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Helpdesk Available</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-[480px] mx-auto px-4 -mt-4 pb-32">
          {/* Main Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="mb-4 shadow-lg border-[hsl(var(--gold)/0.2)]">
              <CardContent className="p-5">
                <h2 className="font-semibold text-lg mb-3">Start Your Journey</h2>
                <Button
                  className="w-full h-12 text-base mb-3 bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:opacity-90"
                  onClick={() => navigate('/hub')}
                  data-testid="landing-start-navigation-button"
                >
                  <Navigation className="w-5 h-5 mr-2" /> Start Navigation
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => navigate('/where-am-i')} data-testid="landing-where-am-i-button">
                    <Compass className="w-4 h-4 mr-2" /> Where Am I?
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => navigate('/map')} data-testid="landing-treasure-map-button">
                    <Navigation className="w-4 h-4 mr-2" /> View Map
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Support Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Need Help?</h3>
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${business.contact_phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors" data-testid="landing-call-button">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  <a href={`https://wa.me/${business.contact_whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors" data-testid="landing-whatsapp-button">
                    <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp
                  </a>
                  <Button variant="outline" size="sm" onClick={() => navigate('/help')} data-testid="landing-help-button">
                    <HelpCircle className="w-4 h-4 mr-1" /> Help Me
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/help-guide')} data-testid="landing-help-guide-button">
                    <HelpCircle className="w-4 h-4 mr-1" /> Help Guide
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // No session yet - QR entry
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-[hsl(var(--primary-foreground))]" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Yash Ornaments</h1>
            <h2 className="font-display text-xl text-[hsl(var(--gold))]">WayFinder</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">Step-by-step guidance to your destination</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Enter Your Code</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Enter the code from your QR scan or invitation</p>
              <div className="space-y-3">
                <Input
                  value={qrInput}
                  onChange={e => setQrInput(e.target.value.toUpperCase())}
                  placeholder="e.g. AJPL-DEFAULT"
                  className="h-12 text-center font-mono text-lg tracking-wider"
                  data-testid="qr-input"
                />
                <Button
                  className="w-full h-12"
                  onClick={() => handleStart(qrInput)}
                  disabled={loading || !qrInput}
                  data-testid="qr-submit-button"
                >
                  {loading ? 'Starting...' : 'Start Navigation'}
                </Button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mb-2">Quick start codes for testing:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['AJPL-DEFAULT', 'YASH-DEFAULT'].map(code => (
                    <button
                      key={code}
                      onClick={() => { setQrInput(code); handleStart(code); }}
                      className="px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))] text-xs font-mono hover:bg-[hsl(var(--border))] transition-colors"
                      data-testid={`quick-start-${code.toLowerCase()}`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <button onClick={() => navigate('/help-guide')} className="text-sm text-[hsl(var(--brand))] hover:text-[hsl(var(--foreground))] transition-colors block mx-auto" data-testid="pre-session-help-guide-link">
              Help Guide
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
