import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRecoveryCandidates, recoverSession, logAssistEvent, addSessionEvent } from '@/lib/api';
import { BrandHeader, BottomActionBar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, MessageCircle, HelpCircle, CheckCircle2, XCircle, Loader2, Eye, ArrowRight, Video } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecoveryPage() {
  const navigate = useNavigate();
  const { session, business, updateSession } = useApp();
  const [candidates, setCandidates] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  useEffect(() => {
    if (!session?.route_id) { navigate('/hub'); return; }
    loadCandidates();
  }, [session, navigate]);

  const loadCandidates = async () => {
    try {
      const res = await getRecoveryCandidates(session.id);
      // Filter to checkpoints that have recovery images or are critical
      const withRecovery = res.data.filter(cp => 
        (cp.recovery_image_urls && cp.recovery_image_urls.length > 0) || cp.is_critical || cp.photo_url
      );
      setCandidates(withRecovery.length > 0 ? withRecovery : res.data);
      await addSessionEvent(session.id, 'recovery_started', {});
    } catch (e) {
      toast.error('Failed to load checkpoints');
    } finally {
      setLoading(false);
    }
  };

  const cp = candidates[currentIdx];

  const handleYes = async () => {
    if (!cp) return;
    setRecovering(true);
    try {
      const res = await recoverSession(session.id, cp.id);
      updateSession({
        current_checkpoint_id: cp.id,
        current_checkpoint_order: cp.order,
        last_recovery_checkpoint_id: cp.id,
      });
      toast.success(`Got it! Resuming from "${cp.name}"`);
      navigate('/navigate');
    } catch (e) {
      toast.error('Recovery failed');
    } finally {
      setRecovering(false);
    }
  };

  const handleNo = () => {
    if (currentIdx < candidates.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setNoMatch(true);
    }
  };

  const handleEscalate = async () => {
    try {
      await addSessionEvent(session.id, 'help_requested', { context: 'recovery_failed' });
      toast.success('Help request sent! Our team has been notified.');
    } catch (e) {
      toast.error('Failed to send help request');
    }
  };

  const handleWhatsAppVideo = async () => {
    const waNumber = business?.contact_whatsapp?.replace(/[^0-9]/g, '') || '';
    if (!waNumber) { toast.error('WhatsApp not available'); return; }
    try {
      await logAssistEvent(session.id, 'whatsapp_video_attempted', { context: 'recovery' });
    } catch (e) { /* best effort */ }
    const text = encodeURIComponent(`Hi, I need video help finding my way. Session: ${session.id?.slice(0, 8)}`);
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <BrandHeader showBack title="Finding Your Location..." />
        <div className="max-w-[480px] mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  if (noMatch) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] pb-28">
        <BrandHeader showBack title="Need Help" />
        <div className="max-w-[480px] mx-auto px-4 py-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-4">
              <CardContent className="p-6 text-center">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--warning))]" />
                <h2 className="font-semibold text-lg mb-2" data-testid="recovery-no-match-title">Can't Identify Location</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  Don't worry! Let's connect you with our helpdesk team who can guide you directly.
                </p>
                <div className="space-y-2">
                  {business?.contact_phone && (
                    <a href={`tel:${business.contact_phone}`} className="block">
                      <Button className="w-full h-12" data-testid="recovery-call-button">
                        <Phone className="w-5 h-5 mr-2" /> Call Helpdesk Now
                      </Button>
                    </a>
                  )}
                  {business?.contact_whatsapp && (
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={handleWhatsAppVideo}
                      data-testid="recovery-whatsapp-video-button"
                    >
                      <Video className="w-5 h-5 mr-2 text-green-600" /> WhatsApp Video Call
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleEscalate}
                    data-testid="recovery-help-button"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" /> Alert Helpdesk
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Button variant="ghost" className="w-full" onClick={() => { setCurrentIdx(0); setNoMatch(false); }} data-testid="recovery-retry-button">
              Try Again from Start
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-28">
      <BrandHeader showBack title="Where Are You?" subtitle={`Checkpoint ${currentIdx + 1} of ${candidates.length}`} />

      <div className="max-w-[480px] mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {cp && (
            <motion.div
              key={cp.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="mb-4 shadow-lg" data-testid="recovery-checkpoint-card">
                <CardContent className="p-0">
                  {/* Checkpoint Image */}
                  {(cp.recovery_image_urls?.length > 0 || cp.photo_url) ? (
                    <div className="aspect-video rounded-t-xl overflow-hidden bg-[hsl(var(--muted))]">
                      <img
                        src={cp.recovery_image_urls?.[0] || cp.photo_url}
                        alt={cp.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-t-xl bg-[hsl(var(--muted))] flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                        <p className="font-medium text-sm">{cp.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5 text-[hsl(var(--brand))]" />
                      <h2 className="font-semibold text-lg" data-testid="recovery-question">Do you see this place?</h2>
                    </div>
                    <p className="text-sm font-medium mb-1" data-testid="recovery-checkpoint-name">{cp.name}</p>
                    {cp.landmark_description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{cp.landmark_description}</p>
                    )}
                    {cp.what_to_look_for && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium">Look for:</span> {cp.what_to_look_for}
                      </p>
                    )}
                    {cp.recovery_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cp.recovery_tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[10px] text-[hsl(var(--muted-foreground))]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomActionBar>
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={handleNo}
          data-testid="recovery-no-button"
        >
          <XCircle className="w-5 h-5 mr-2" /> No, Not Here
        </Button>
        <Button
          className="flex-1 h-12 bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))]"
          onClick={handleYes}
          disabled={recovering}
          data-testid="recovery-yes-button"
        >
          {recovering ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Resuming...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5 mr-2" /> Yes, I'm Here!</>
          )}
        </Button>
      </BottomActionBar>
    </div>
  );
}
