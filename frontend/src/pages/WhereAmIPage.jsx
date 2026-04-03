import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRoutes, getRouteCheckpoints } from '@/lib/api';
import { BrandHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Locate, MapPin, Navigation, Loader2, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export default function WhereAmIPage() {
  const navigate = useNavigate();
  const { session } = useApp();
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState('');
  const [nearbyCheckpoints, setNearbyCheckpoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('Location not available on this device');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (!userPos) return;
    loadNearby();
  }, [userPos]);

  const loadNearby = async () => {
    setLoading(true);
    try {
      const routesRes = await getRoutes();
      setRoutes(routesRes.data);

      const allCps = [];
      for (const route of routesRes.data) {
        try {
          const cpRes = await getRouteCheckpoints(route.id);
          cpRes.data.forEach(cp => {
            if (cp.lat && cp.lng) {
              const dist = getDistanceKm(userPos.lat, userPos.lng, cp.lat, cp.lng);
              allCps.push({ ...cp, routeName: route.name, routeId: route.id, distance: dist });
            }
          });
        } catch {}
      }

      allCps.sort((a, b) => a.distance - b.distance);
      setNearbyCheckpoints(allCps.slice(0, 15));
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <BrandHeader showBack title="Where Am I?" subtitle="Nearest checkpoints to you" />

      <div className="max-w-[480px] mx-auto px-4 py-4">
        {/* Location status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-medium ${
          userPos ? 'bg-green-50 text-green-700 border border-green-200' :
          locError ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`} data-testid="where-am-i-status">
          <Locate className="w-3.5 h-3.5" />
          {locating ? 'Getting your location...' : locError ? locError : 'Location found'}
        </div>

        {locating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        )}

        {loading && !locating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
            <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))]">Finding nearby checkpoints...</span>
          </div>
        )}

        {!locating && !loading && nearbyCheckpoints.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              {nearbyCheckpoints.length} checkpoint{nearbyCheckpoints.length !== 1 ? 's' : ''} found near you
            </p>
            <div className="space-y-2">
              {nearbyCheckpoints.map((cp, i) => (
                <Card key={`${cp.routeId}-${cp.id}`} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    if (session?.route_id === cp.routeId) {
                      navigate('/navigate');
                    } else {
                      navigate('/hub');
                    }
                  }}
                  data-testid={`nearby-cp-${i}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--brand)/0.1)] flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[hsl(var(--brand))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{cp.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{cp.routeName}</p>
                        {cp.short_instruction && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{cp.short_instruction}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[hsl(var(--brand))]">{formatDist(cp.distance)}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">away</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {!locating && !loading && userPos && nearbyCheckpoints.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
              <p className="text-sm font-medium mb-1">No checkpoints with coordinates found</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Checkpoints need GPS coordinates set by the trainer.</p>
            </CardContent>
          </Card>
        )}

        {!locating && locError && (
          <Card>
            <CardContent className="p-6 text-center">
              <Locate className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
              <p className="text-sm font-medium mb-2">Location Required</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">Enable location access to see nearby checkpoints.</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
