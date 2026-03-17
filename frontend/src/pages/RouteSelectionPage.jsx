import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRoutes, selectRoute } from '@/lib/api';
import { BrandHeader, BottomActionBar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Clock, AlertTriangle, MapPin, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RouteSelectionPage() {
  const navigate = useNavigate();
  const { session, business, updateSession } = useApp();
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/'); return; }
    getRoutes().then(r => { setRoutes(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [session, navigate]);

  const handleStart = async () => {
    if (!selected) { toast.error('Please select a route'); return; }
    try {
      await selectRoute(session.id, selected.id);
      updateSession({ route_id: selected.id, route_distance_value: selected.distance_value, route_distance_unit: selected.distance_unit });
      navigate('/navigate');
    } catch (e) {
      toast.error('Failed to start route');
    }
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700'
  };

  const startIcons = {
    metro: '\uD83D\uDE87',
    red_fort: '\uD83C\uDFF0',
    omaxe: '\uD83C\uDFEC',
    town_hall: '\uD83C\uDFDB\uFE0F',
    building_entrance: '\uD83C\uDFE2'
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24">
      <BrandHeader showBack title="Choose Your Route" subtitle={`To ${business?.destination_label || 'Destination'}`} />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Select where you are starting from. We'll guide you step by step.</p>
        
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-[hsl(var(--muted))] animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map((route, idx) => (
              <motion.div key={route.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selected?.id === route.id ? 'ring-2 ring-[hsl(var(--brand))] shadow-md' : ''
                  }`}
                  onClick={() => setSelected(route)}
                  data-testid="route-select-option-card"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                        {startIcons[route.start_type] || '\uD83D\uDCCD'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-0.5">{route.name}</h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{route.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                            <Clock className="w-3 h-3" /> ~{route.estimated_time_minutes} min
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                            <MapPin className="w-3 h-3" /> {route.checkpoint_count} checkpoints
                          </span>
                          {route.distance_value > 0 && (
                            <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {route.distance_label || `${route.distance_value} ${route.distance_unit}`}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${difficultyColors[route.difficulty] || ''}`}>
                            {route.difficulty}
                          </span>
                        </div>
                      </div>
                      {selected?.id === route.id && (
                        <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center">
                          <ArrowRight className="w-3 h-3 text-[hsl(var(--brand-foreground))]" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomActionBar>
        <Button className="flex-1 h-12" onClick={handleStart} disabled={!selected} data-testid="start-route-button">
          <Navigation className="w-5 h-5 mr-2" /> Start Route
        </Button>
      </BottomActionBar>
    </div>
  );
}
