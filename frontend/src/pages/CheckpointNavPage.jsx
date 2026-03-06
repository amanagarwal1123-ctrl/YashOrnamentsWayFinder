import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRouteCheckpoints, addSessionEvent } from '@/lib/api';
import { BrandHeader, BottomActionBar, DirectionIcon } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, MapPin, HelpCircle, Phone, Share2, AlertTriangle, CheckCircle2, Map, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckpointNavPage() {
  const navigate = useNavigate();
  const { session, business, updateSession } = useApp();
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!session?.route_id) { navigate('/routes'); return; }
    getRouteCheckpoints(session.route_id).then(r => {
      setCheckpoints(r.data);
      setLoading(false);
      // Resume from last checkpoint
      if (session.current_checkpoint_order > 0) {
        const idx = r.data.findIndex(cp => cp.order > session.current_checkpoint_order);
        if (idx > 0) setCurrentIdx(idx);
      }
    }).catch(() => setLoading(false));
  }, [session, navigate]);

  const cp = checkpoints[currentIdx];
  const progress = checkpoints.length > 0 ? ((currentIdx) / checkpoints.length) * 100 : 0;

  const confirmCheckpoint = async () => {
    if (!cp) return;
    setConfirming(true);
    try {
      await addSessionEvent(session.id, 'checkpoint_confirmed', { order: cp.order, name: cp.name }, cp.id);
      updateSession({ current_checkpoint_id: cp.id, current_checkpoint_order: cp.order });
      
      if (currentIdx === checkpoints.length - 1) {
        await addSessionEvent(session.id, 'arrived_destination', {});
        navigate('/arrived');
      } else {
        // Check if next is building entrance
        if (cp.direction === 'enter') {
          await addSessionEvent(session.id, 'arrived_building', {});
        }
        setCurrentIdx(prev => prev + 1);
      }
    } catch (e) {
      toast.error('Failed to log progress');
    } finally {
      setConfirming(false);
    }
  };

  const reportCantFind = async () => {
    if (!cp) return;
    try {
      await addSessionEvent(session.id, 'cannot_find', { checkpoint_name: cp.name }, cp.id);
      toast.info('Help has been notified. You can also call or use the Help button.');
    } catch (e) {
      toast.error('Failed to report');
    }
  };

  const requestHelp = async () => {
    try {
      await addSessionEvent(session.id, 'help_requested', { checkpoint_name: cp?.name || '' }, cp?.id || '');
      toast.success('Help request sent! Our team has been notified.');
    } catch (e) {
      toast.error('Failed to send help request');
    }
  };

  const shareCheckpoint = async () => {
    try {
      await addSessionEvent(session.id, 'checkpoint_shared', { checkpoint_name: cp?.name || '' }, cp?.id || '');
      if (navigator.share) {
        await navigator.share({ title: `Checkpoint: ${cp?.name}`, text: cp?.short_instruction });
      }
      toast.success('Checkpoint shared with support');
    } catch (e) {
      toast.success('Checkpoint info shared');
    }
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
    <div className="min-h-screen bg-[hsl(var(--background))] pb-28">
      {/* Progress Header */}
      <div className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-[480px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate(-1)} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="nav-back-button">
              ← Back
            </button>
            <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]" data-testid="checkpoint-progress-label">
              Step {currentIdx + 1} of {checkpoints.length}
            </span>
            <button onClick={() => navigate('/map')} className="text-sm text-[hsl(var(--brand))]" data-testid="nav-map-button">
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
                {/* Placeholder Image */}
                <div className="checkpoint-placeholder aspect-video rounded-t-xl">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                    <p className="font-medium">{cp.name}</p>
                    <p className="text-xs mt-1 opacity-70">Checkpoint {cp.order}</p>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Direction & Name */}
                  <div className="flex items-center gap-4 mb-3">
                    <DirectionIcon direction={cp.direction} size={56} />
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg" data-testid="checkpoint-name">{cp.name}</h2>
                      {cp.floor_context && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{cp.floor_context}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Instruction */}
                  <div className="bg-[hsl(var(--muted))] rounded-lg p-3 mb-3">
                    <p className="text-sm font-medium" data-testid="checkpoint-instruction">{cp.short_instruction}</p>
                    {cp.long_instruction && cp.long_instruction !== cp.short_instruction && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{cp.long_instruction}</p>
                    )}
                  </div>

                  {/* What to look for */}
                  {cp.what_to_look_for && (
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--foreground))]">Look for:</span> {cp.what_to_look_for}
                      </p>
                    </div>
                  )}

                  {/* Risk badge */}
                  {cp.risk_level === 'high' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-700 font-medium">⚠ Confusion point - Pay close attention here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={reportCantFind} data-testid="cant-find-button">
                <AlertTriangle className="w-3 h-3 mr-1" /> Can't find this
              </Button>
              <Button variant="outline" size="sm" onClick={shareCheckpoint} data-testid="share-checkpoint-button">
                <Share2 className="w-3 h-3 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/help')} data-testid="help-me-button">
                <HelpCircle className="w-3 h-3 mr-1" /> Help Me
              </Button>
              {business?.contact_phone && (
                <a href={`tel:${business.contact_phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs hover:bg-[hsl(var(--muted))] transition-colors" data-testid="checkpoint-call-button">
                  <Phone className="w-3 h-3" /> Call
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: Confirm / Next */}
      <BottomActionBar>
        <Button
          className="flex-1 h-12 bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:opacity-90"
          onClick={confirmCheckpoint}
          disabled={confirming}
          data-testid="checkpoint-next-button"
        >
          {confirming ? 'Confirming...' : (
            currentIdx === checkpoints.length - 1 ? (
              <><CheckCircle2 className="w-5 h-5 mr-2" /> I've Arrived!</>
            ) : (
              <><ChevronRight className="w-5 h-5 mr-2" /> I'm Here - Next Step</>
            )
          )}
        </Button>
      </BottomActionBar>
    </div>
  );
}
