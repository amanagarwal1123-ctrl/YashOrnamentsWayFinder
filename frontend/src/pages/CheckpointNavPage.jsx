import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRouteCheckpoints, addSessionEvent, updateLocation } from '@/lib/api';
import { BrandHeader, DirectionIcon, BrandingFooter } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChevronRight, MapPin, Phone, CheckCircle2, Map, MessageCircle, Locate, Navigation, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowOverlayRenderer } from '@/components/ArrowOverlay';

const CONTACT = '+919958113991';

export default function CheckpointNavPage() {
  const navigate = useNavigate();
  const { session, business, updateSession } = useApp();
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!session?.route_id) { navigate('/hub'); return; }
    getRouteCheckpoints(session.route_id).then(r => {
      setCheckpoints(r.data);
      setLoading(false);
      if (session.current_checkpoint_order > 0) {
        const idx = r.data.findIndex(cp => cp.order > session.current_checkpoint_order);
        if (idx > 0) setCurrentIdx(idx);
      }
    }).catch(() => setLoading(false));

    // Auto-request location tracking
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          setLocationActive(true);
          try { await updateLocation(session.id, pos.coords.latitude, pos.coords.longitude); } catch (e) { /* silent */ }
        },
        () => { setLocationActive(false); },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [session, navigate]);

  const cp = checkpoints[currentIdx];
  const progress = checkpoints.length > 0 ? ((currentIdx) / checkpoints.length) * 100 : 0;

  const confirmCheckpoint = async () => {
    if (!cp || confirming) return;
    setConfirming(true);
    try {
      await addSessionEvent(session.id, 'checkpoint_confirmed', { order: cp.order, name: cp.name }, cp.id);
      updateSession({ current_checkpoint_id: cp.id, current_checkpoint_order: cp.order });
      if (currentIdx === checkpoints.length - 1) {
        await addSessionEvent(session.id, 'arrived_destination', {});
        navigate('/arrived');
      } else {
        if (cp.direction === 'enter') {
          await addSessionEvent(session.id, 'arrived_building', {});
        }
        setCurrentIdx(prev => prev + 1);
      }
    } catch (e) {
      toast.error('Failed to log progress');
    }
    setConfirming(false);
  };

  if (loading || !cp) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <BrandHeader showBack title="Loading..." />
        <div className="max-w-[480px] mx-auto px-4 py-8">
          <div className="h-48 rounded-xl bg-[hsl(var(--muted))] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-36">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-[480px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate('/hub')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="nav-back-button">
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                locationActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`} data-testid="nav-location-indicator">
                <Locate className="w-2.5 h-2.5" />
                {locationActive ? 'GPS' : 'No GPS'}
              </span>
              <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]" data-testid="checkpoint-progress-label">
                Step {currentIdx + 1} of {checkpoints.length}
              </span>
            </div>
            <button onClick={() => navigate('/schematic')} className="text-sm text-[hsl(var(--brand))]" data-testid="nav-map-button">
              <Map className="w-4 h-4" />
            </button>
          </div>
          <Progress value={progress} className="h-1.5" data-testid="checkpoint-progress-bar" />
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={cp.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* Checkpoint Card */}
            <Card className="mb-4 shadow-lg" data-testid="checkpoint-step-card">
              <CardContent className="p-0">
                {/* Image */}
                {cp.photo_url ? (
                  <div className="aspect-video rounded-t-xl overflow-hidden bg-[hsl(var(--muted))] relative">
                    <img src={cp.photo_url} alt={cp.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    <ArrowOverlayRenderer arrows={cp.direction_arrows || []} containerWidth={480} containerHeight={270} />
                  </div>
                ) : (
                  <div className="checkpoint-placeholder aspect-video rounded-t-xl">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                      <p className="font-medium">{cp.name}</p>
                      <p className="text-xs mt-1 opacity-70">Checkpoint {cp.order}</p>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <DirectionIcon direction={cp.direction} size={56} />
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg" data-testid="checkpoint-name">{cp.name}</h2>
                      {cp.floor_context && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{cp.floor_context}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[hsl(var(--muted))] rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium" data-testid="checkpoint-instruction">{cp.short_instruction}</p>
                    {cp.long_instruction && cp.long_instruction !== cp.short_instruction && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{cp.long_instruction}</p>
                    )}
                  </div>

                  {cp.what_to_look_for && (
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--foreground))]">Look for:</span> {cp.what_to_look_for}
                      </p>
                    </div>
                  )}

                  {cp.risk_level === 'high' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-700 font-medium">Confusion point - Pay close attention here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <BrandingFooter />
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-md border-t border-[hsl(var(--border))]">
        <div className="max-w-[480px] mx-auto">
          {/* Quick actions */}
          <div className="px-4 pt-2 pb-1 flex items-center gap-1.5">
            <a
              href={`tel:${CONTACT}`}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
              data-testid="quick-call"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={`https://wa.me/${CONTACT.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
              data-testid="quick-whatsapp"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button
              onClick={() => navigate('/where-am-i')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
              data-testid="quick-where-am-i"
            >
              <Locate className="w-3.5 h-3.5" /> Where Am I?
            </button>
          </div>

          {/* Main CTA */}
          <div className="px-4 pb-3 pt-1">
            <Button
              className="w-full h-12 bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:opacity-90"
              onClick={confirmCheckpoint}
              disabled={confirming}
              data-testid="checkpoint-next-button"
            >
              {confirming ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Confirming...</>
              ) : currentIdx === checkpoints.length - 1 ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> I've Arrived!</>
              ) : (
                <><ChevronRight className="w-5 h-5 mr-2" /> I'm Here - Next Step</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
