import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRouteCheckpoints } from '@/lib/api';
import { BrandHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle2, Circle, Navigation, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TreasureMapPage() {
  const navigate = useNavigate();
  const { session, business } = useApp();
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.route_id) { navigate('/routes'); return; }
    getRouteCheckpoints(session.route_id).then(r => {
      setCheckpoints(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [session, navigate]);

  const currentOrder = session?.current_checkpoint_order || 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <BrandHeader showBack title="Route Map" subtitle={business?.destination_label} />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        {/* Treasure Map Style */}
        <div className="treasure-map-bg rounded-2xl p-4 mb-4 relative overflow-hidden" data-testid="treasure-map-container">
          <h3 className="text-center font-display text-sm font-semibold mb-4 relative z-10">
            Your Route to {business?.destination_label || 'Destination'}
          </h3>
          
          <div className="relative z-10">
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {checkpoints.map((cp, idx) => {
                  const isCompleted = cp.order <= currentOrder;
                  const isCurrent = cp.order === currentOrder + 1;
                  const isFuture = cp.order > currentOrder + 1;
                  
                  return (
                    <motion.div
                      key={cp.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Line connector */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] pulse-dot' :
                            'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : cp.order}
                          </div>
                          {idx < checkpoints.length - 1 && (
                            <div className={`w-0.5 h-8 ${
                              isCompleted ? 'bg-green-400' : 'bg-[hsl(var(--border))]'
                            }`} />
                          )}
                        </div>
                        
                        {/* Checkpoint info */}
                        <div className={`flex-1 pb-2 ${isFuture ? 'opacity-50' : ''}`}>
                          <p className={`text-sm font-medium ${isCompleted ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>
                            {cp.name}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {cp.short_instruction}
                          </p>
                          {cp.risk_level === 'high' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 mt-1 inline-block">
                              Confusing area
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => navigate('/navigate')} data-testid="back-to-navigation">
            <Navigation className="w-4 h-4 mr-2" /> Back to Navigation
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)} data-testid="map-back-button">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
