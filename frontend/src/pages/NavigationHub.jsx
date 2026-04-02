import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getRoutes, getRoute, getRouteCheckpoints, selectRoute, updateLocationConsent, updateLocation, serveMediaUrl, logAssistEvent } from '@/lib/api';
import { BrandHeader, BottomActionBar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, MapPin, Map, Phone, MessageCircle, Loader2, ChevronRight, Locate, PlayCircle, ArrowRight, Download, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cacheRouteOffline, ensureServiceWorkerReady } from '@/lib/offline';

export default function NavigationHub() {
  const navigate = useNavigate();
  const { session, business, updateSession } = useApp();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!session) { navigate('/'); return; }
    loadRoutes();
    ensureServiceWorkerReady().then(setSwReady);
    // Auto-request location immediately
    requestLocation();
    return () => {
      if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    };
  }, [session, navigate]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation || !session) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationActive(true);
        updateLocationConsent(session.id, true).catch(() => {});
        updateSession({ location_consent_granted: true, location_permission_state: 'granted' });
        updateLocation(session.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        // Start continuous tracking
        watchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            updateLocation(session.id, p.coords.latitude, p.coords.longitude).catch(() => {});
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
      },
      () => {
        // Permission denied or unavailable - continue without location
        setLocationActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [session?.id, updateSession]);

  const loadRoutes = async () => {
    try {
      const res = await getRoutes();
      setRoutes(res.data);
      if (session?.route_id) {
        const routeRes = await getRoute(session.route_id);
        setSelectedRoute(routeRes.data);
      }
    } catch (e) {
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = async (route) => {
    setSelectedRoute(route);
  };

  const handleStartNavigation = async () => {
    if (!selectedRoute) { toast.error('Please select a route'); return; }
    setStarting(true);
    try {
      await selectRoute(session.id, selectedRoute.id);
      updateSession({
        route_id: selectedRoute.id,
        route_distance_value: selectedRoute.distance_value,
        route_distance_unit: selectedRoute.distance_unit,
        started_at: new Date().toISOString(),
      });
      navigate('/navigate');
    } catch (e) {
      toast.error('Failed to start navigation');
    } finally {
      setStarting(false);
    }
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700'
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-28">
      <BrandHeader showBack title={business?.full_name || 'Navigation'} subtitle={business?.address} />

      <div className="max-w-[480px] mx-auto px-4 py-4">
        {/* Location Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs font-medium ${
          locationActive
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`} data-testid="location-status">
          <Locate className="w-3.5 h-3.5" />
          {locationActive ? 'Location tracking active' : 'Location unavailable - using checkpoint mode'}
        </div>

        {/* Selected Route Info */}
        {selectedRoute ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-4 shadow-lg border-[hsl(var(--gold)/0.2)]" data-testid="selected-route-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg" data-testid="route-name">{selectedRoute.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${difficultyColors[selectedRoute.difficulty] || ''}`}>
                    {selectedRoute.difficulty}
                  </span>
                </div>
                {selectedRoute.description && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{selectedRoute.description}</p>
                )}

                {/* Route Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-[hsl(var(--muted))] rounded-lg">
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--brand))]" />
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Distance</p>
                    <p className="text-sm font-semibold" data-testid="route-distance">
                      {selectedRoute.distance_label || (selectedRoute.distance_value > 0
                        ? `${selectedRoute.distance_value} ${selectedRoute.distance_unit}`
                        : 'N/A')}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-[hsl(var(--muted))] rounded-lg">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--brand))]" />
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Est. Time</p>
                    <p className="text-sm font-semibold" data-testid="route-time">~{selectedRoute.estimated_time_minutes} min</p>
                  </div>
                  <div className="text-center p-2 bg-[hsl(var(--muted))] rounded-lg">
                    <Navigation className="w-4 h-4 mx-auto mb-1 text-[hsl(var(--brand))]" />
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Steps</p>
                    <p className="text-sm font-semibold" data-testid="route-steps">{selectedRoute.checkpoint_count}</p>
                  </div>
                </div>

                {/* Route Video */}
                {selectedRoute.route_video_media_id && (
                  <a
                    href={serveMediaUrl(selectedRoute.route_video_media_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 mb-4 hover:bg-blue-100 transition-colors"
                    data-testid="route-video-link"
                  >
                    <PlayCircle className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">Watch Route Guide</p>
                      <p className="text-xs text-blue-600">Video walkthrough of this route</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                  </a>
                )}

                {/* Quick Map Preview */}
                <button
                  onClick={() => navigate('/schematic')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] transition-colors"
                  data-testid="map-preview-link"
                >
                  <Map className="w-5 h-5 text-[hsl(var(--brand))]" />
                  <span className="text-sm font-medium">View Route on Map</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-[hsl(var(--muted-foreground))]" />
                </button>

                {routes.length > 1 && (
                  <button
                    onClick={() => setSelectedRoute(null)}
                    className="w-full text-center text-xs text-[hsl(var(--brand))] mt-3 hover:underline"
                    data-testid="change-route-button"
                  >
                    Change starting point
                  </button>
                )}

                {/* Offline Save */}
                {swReady && selectedRoute.offline_pack_enabled !== false && (
                  <button
                    onClick={async () => {
                      setSavingOffline(true);
                      try {
                        const cpRes = await getRouteCheckpoints(selectedRoute.id);
                        const success = await cacheRouteOffline(selectedRoute.id, cpRes.data);
                        if (success) { setOfflineSaved(true); toast.success('Route saved for offline use!'); }
                        else { toast.info('Could not save offline. Try again later.'); }
                      } catch (e) { toast.error('Failed to save offline'); }
                      setSavingOffline(false);
                    }}
                    disabled={savingOffline || offlineSaved}
                    className="w-full flex items-center justify-center gap-2 mt-3 px-3 py-2 rounded-lg bg-[hsl(var(--muted))] text-xs font-medium hover:bg-[hsl(var(--border))] transition-colors disabled:opacity-50"
                    data-testid="save-offline-button"
                  >
                    {offlineSaved ? (
                      <><WifiOff className="w-3.5 h-3.5" /> Saved for Offline</>
                    ) : savingOffline ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Save for Offline</>
                    )}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Contact / Support */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Need Help Before You Start?</h3>
                <div className="flex flex-wrap gap-2">
                  {business?.contact_phone && (
                    <a href={`tel:${business.contact_phone}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors" data-testid="hub-call-button">
                      <Phone className="w-4 h-4" /> Call
                    </a>
                  )}
                  {business?.contact_whatsapp && (
                    <a href={`https://wa.me/${business.contact_whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors" data-testid="hub-whatsapp-button">
                      <MessageCircle className="w-4 h-4 text-green-600" /> WhatsApp
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Route Selection */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-semibold text-lg mb-1">Where are you starting from?</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Select your starting point and we'll guide you step by step.</p>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[hsl(var(--muted))] animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route, idx) => (
                  <motion.div key={route.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => handleSelectRoute(route)}
                      data-testid="route-select-card"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--brand)/0.1)] flex items-center justify-center">
                            <Navigation className="w-5 h-5 text-[hsl(var(--brand))]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-0.5">{route.name}</h3>
                            {route.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{route.description}</p>}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                <Clock className="w-3 h-3" /> ~{route.estimated_time_minutes} min
                              </span>
                              {route.distance_value > 0 && (
                                <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                  <MapPin className="w-3 h-3" /> {route.distance_label || `${route.distance_value} ${route.distance_unit}`}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                                {route.checkpoint_count} steps
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${difficultyColors[route.difficulty] || ''}`}>
                                {route.difficulty}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] mt-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bottom Action - Start Navigation */}
      {selectedRoute && (
        <BottomActionBar>
          <Button
            className="flex-1 h-12 text-base bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:opacity-90"
            onClick={handleStartNavigation}
            disabled={starting}
            data-testid="start-navigation-button"
          >
            {starting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
            ) : (
              <><Navigation className="w-5 h-5 mr-2" /> Start Navigation</>
            )}
          </Button>
        </BottomActionBar>
      )}
    </div>
  );
}
