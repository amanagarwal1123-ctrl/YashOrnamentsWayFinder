import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getQRInfo, registerFromScan, createSession } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigation, User, Phone, MapPin, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ScanLandingPage() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const { startSession } = useApp();
  const [qrInfo, setQrInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!qrCode) { navigate('/'); return; }
    getQRInfo(qrCode)
      .then(r => {
        setQrInfo(r.data);
        setLoading(false);
        // Fast mode: create session immediately, skip form
        if (r.data.entry_mode === 'fast') {
          handleFastEntry(r.data);
        }
      })
      .catch(() => { setError('Invalid or expired QR code'); setLoading(false); });
  }, [qrCode]);

  const handleFastEntry = async (info) => {
    setSubmitting(true);
    try {
      const res = await createSession(qrCode, navigator.userAgent);
      startSession(res.data.session, res.data.business);
      toast.success(`Welcome! Let's navigate to ${res.data.business.destination_label || res.data.business.name}`);
      navigate('/hub');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start session');
      setSubmitting(false);
    }
  };

  const handleAssistedSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!phone.trim() || phone.length < 10) { toast.error('Please enter a valid phone number'); return; }
    setSubmitting(true);
    try {
      const res = await registerFromScan(qrCode, {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        device_info: navigator.userAgent,
      });
      startSession(res.data.session, res.data.business);
      toast.success(`Welcome ${name}! Let's navigate to ${res.data.business.destination_label || res.data.business.name}`);
      navigate('/hub');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (qrInfo?.entry_mode === 'fast' && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {qrInfo?.entry_mode === 'fast' ? 'Starting your navigation...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
        <Card className="max-w-[380px] w-full">
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <h2 className="font-semibold text-lg mb-2">Invalid QR Code</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Assisted mode: show name + phone form
  const business = qrInfo?.business;
  const isAjpl = business?.slug === 'ajpl';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred Map Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[hsl(var(--muted))]" />
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <line x1="10%" y1="20%" x2="60%" y2="45%" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.3" />
          <line x1="60%" y1="45%" x2="80%" y2="55%" stroke="hsl(var(--muted-foreground))" strokeWidth="2" opacity="0.3" />
          <circle cx="60%" cy="45%" r="8" fill="hsl(var(--brand))" opacity="0.4" />
          <circle cx="80%" cy="55%" r="6" fill="hsl(var(--destructive))" opacity="0.3" />
        </svg>
        <div className="absolute inset-0 backdrop-blur-md bg-[hsl(var(--background)/0.6)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Brand Badge */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              isAjpl ? 'bg-[hsl(43,72%,52%)]' : 'bg-[hsl(221,100%,56%)]'
            }`}>
              <Navigation className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold" data-testid="scan-business-name">
              {business?.full_name || business?.name}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{business?.address}</p>
            {qrInfo?.source_label && (
              <p className="text-xs text-[hsl(var(--brand))] mt-1">{qrInfo.source_label}</p>
            )}
          </div>

          {/* Registration Card */}
          <Card className="shadow-xl border-[hsl(var(--gold)/0.2)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[hsl(var(--brand))]" />
                <h2 className="font-semibold">Welcome! Let's Get You There</h2>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                Enter your details to start navigation. Our team will be able to assist you better.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10 h-12"
                      data-testid="scan-customer-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      type="tel"
                      className="pl-10 h-12 font-mono"
                      data-testid="scan-customer-phone"
                    />
                  </div>
                </div>

                {qrInfo?.default_route && (
                  <div className="p-3 rounded-lg bg-[hsl(var(--muted))]">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Pre-selected route:</p>
                    <p className="text-sm font-medium">{qrInfo.default_route.name}</p>
                    {qrInfo.default_route.distance_value > 0 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {qrInfo.default_route.distance_label || `${qrInfo.default_route.distance_value} ${qrInfo.default_route.distance_unit}`}
                        {' '} ~ {qrInfo.default_route.estimated_time_minutes} min
                      </p>
                    )}
                  </div>
                )}

                <Button
                  className={`w-full h-12 text-base ${
                    isAjpl
                      ? 'bg-[hsl(43,72%,52%)] text-[hsl(var(--ink))] hover:opacity-90'
                      : 'bg-[hsl(221,100%,56%)] text-white hover:opacity-90'
                  }`}
                  onClick={handleAssistedSubmit}
                  disabled={submitting}
                  data-testid="scan-start-button"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
                  ) : (
                    <><Navigation className="w-5 h-5 mr-2" /> Start Navigation</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[10px] text-[hsl(var(--muted-foreground))] mt-4" data-testid="branding-footer">
            {qrInfo?.branding_footer || 'Navigation powered by YASH ORNAMENTS'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
