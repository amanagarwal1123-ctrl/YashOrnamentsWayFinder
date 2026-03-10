import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getSchematicMap, getRoutes } from '@/lib/api';
import { BrandHeader, BrandingFooter } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Check, List, Map as MapIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const START_TYPE_ICONS = { metro: 'M', red_fort: 'R', omaxe: 'O', gurudwara: 'G', town_hall: 'T' };

export default function SchematicMapPage() {
  const navigate = useNavigate();
  const { session } = useApp();
  const [mapData, setMapData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [viewMode, setViewMode] = useState('map');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mapRes, routesRes] = await Promise.all([getSchematicMap(), getRoutes()]);
        setMapData(mapRes.data);
        setRoutes(routesRes.data);
        // Default to session route or first
        const sessionRoute = session?.route_id;
        if (sessionRoute && mapRes.data.route_paths?.some(rp => rp.route_id === sessionRoute)) {
          setSelectedRouteId(sessionRoute);
        } else if (mapRes.data.route_paths?.length) {
          setSelectedRouteId(mapRes.data.route_paths[0].route_id);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [session]);

  const currentCheckpointId = session?.current_checkpoint_id || '';
  const currentOrder = session?.current_checkpoint_order || 0;

  const selectedPath = useMemo(() => {
    if (!mapData || !selectedRouteId) return null;
    return mapData.route_paths.find(rp => rp.route_id === selectedRouteId);
  }, [mapData, selectedRouteId]);

  const selectedRoute = useMemo(() => routes.find(r => r.id === selectedRouteId), [routes, selectedRouteId]);

  // Compute completed nodes based on currentOrder
  const completedNodeIds = useMemo(() => {
    if (!mapData || !selectedPath || !currentOrder) return new Set();
    const ids = new Set();
    for (const nid of selectedPath.node_ids) {
      const node = mapData.nodes.find(n => n.id === nid);
      if (!node) continue;
      if (node.type === 'origin') { ids.add(nid); continue; }
      if (node.order && node.order < currentOrder) ids.add(nid);
    }
    return ids;
  }, [mapData, selectedPath, currentOrder]);

  const currentNodeId = useMemo(() => {
    if (!mapData || !currentCheckpointId) return '';
    const n = mapData.nodes.find(n => n.checkpoint_id === currentCheckpointId);
    return n?.id || '';
  }, [mapData, currentCheckpointId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader showBack title="Route Map" subtitle="All routes to Yash Complex" />

      <div className="max-w-[640px] mx-auto px-4 py-4">
        {/* Route Selector + View Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
            <SelectTrigger className="flex-1 h-10" data-testid="map-route-selector"><SelectValue placeholder="Select route" /></SelectTrigger>
            <SelectContent>
              {mapData?.route_paths?.map(rp => (
                <SelectItem key={rp.route_id} value={rp.route_id}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: rp.color }} />
                  {rp.route_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md flex-shrink-0">
            <button onClick={() => setViewMode('map')} className={`p-2 ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-l-md`} data-testid="map-view-btn"><MapIcon className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} rounded-r-md`} data-testid="list-view-btn"><List className="w-4 h-4" /></button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <SchematicSVG mapData={mapData} selectedPath={selectedPath} completedNodeIds={completedNodeIds} currentNodeId={currentNodeId} />
        ) : (
          <ListFallback mapData={mapData} selectedPath={selectedPath} selectedRoute={selectedRoute} completedNodeIds={completedNodeIds} currentNodeId={currentNodeId} />
        )}

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="p-3">
            <p className="text-xs font-semibold mb-2">Routes</p>
            <div className="flex flex-wrap gap-3">
              {mapData?.route_paths?.map(rp => (
                <button key={rp.route_id} onClick={() => setSelectedRouteId(rp.route_id)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${selectedRouteId === rp.route_id ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-muted'}`}
                  data-testid={`legend-${rp.start_type}`}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rp.color }} />
                  {rp.route_name.replace('From ', '')}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedRoute && (
          <div className="mt-4 text-center">
            <Button onClick={() => navigate('/routes')} data-testid="start-navigation-btn">
              <Navigation className="w-4 h-4 mr-2" /> Start Navigation
            </Button>
          </div>
        )}

        <BrandingFooter className="mt-6" />
      </div>
    </div>
  );
}

/* ───── SVG Schematic Map ───── */
function SchematicSVG({ mapData, selectedPath, completedNodeIds, currentNodeId }) {
  if (!mapData) return null;
  const { nodes, edges, route_paths } = mapData;
  const nodeLookup = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Viewbox - find bounds
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const pad = 60;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const vw = maxX - minX;
  const vh = maxY - minY;

  return (
    <div className="rounded-xl border bg-card overflow-hidden" data-testid="schematic-map">
      <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} className="w-full" style={{ minHeight: 300 }}>
        {/* All route edges (dimmed) */}
        {route_paths.filter(rp => rp.route_id !== selectedPath?.route_id).map(rp =>
          rp.node_ids.map((nid, i) => {
            if (i === 0) return null;
            const from = nodeLookup[rp.node_ids[i - 1]];
            const to = nodeLookup[nid];
            if (!from || !to) return null;
            return <line key={`${rp.route_id}-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={rp.color} strokeWidth={2} strokeOpacity={0.15} />;
          })
        )}

        {/* Selected route edges */}
        {selectedPath?.node_ids.map((nid, i) => {
          if (i === 0) return null;
          const from = nodeLookup[selectedPath.node_ids[i - 1]];
          const to = nodeLookup[nid];
          if (!from || !to) return null;
          const isCompleted = completedNodeIds.has(from.id) && (completedNodeIds.has(to.id) || to.id === currentNodeId);
          return (
            <line key={`sel-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={selectedPath.color} strokeWidth={isCompleted ? 4 : 3} strokeOpacity={isCompleted ? 1 : 0.6}
              strokeLinecap="round" />
          );
        })}

        {/* Destination node */}
        {nodes.filter(n => n.type === 'destination').map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={22} fill={selectedPath?.color || '#1E5EFF'} opacity={0.15} />
            <circle cx={n.x} cy={n.y} r={16} fill={selectedPath?.color || '#1E5EFF'} />
            <text x={n.x} y={n.y - 2} textAnchor="middle" fill="white" fontSize={7} fontWeight="bold">YASH</text>
            <text x={n.x} y={n.y + 7} textAnchor="middle" fill="white" fontSize={6}>5th Flr</text>
            <text x={n.x} y={n.y + 30} textAnchor="middle" fill="currentColor" fontSize={9} fontWeight="600" className="fill-foreground">Destination</text>
          </g>
        ))}

        {/* Origin nodes */}
        {nodes.filter(n => n.type === 'origin').map(n => {
          const rp = route_paths.find(rp => rp.route_id === n.route_id);
          const isSelected = selectedPath?.route_id === n.route_id;
          const icon = START_TYPE_ICONS[rp?.start_type] || '?';
          return (
            <g key={n.id} opacity={isSelected ? 1 : 0.35}>
              <circle cx={n.x} cy={n.y} r={14} fill={rp?.color || '#666'} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">{icon}</text>
              <text x={n.x} y={n.y - 20} textAnchor="middle" fill="currentColor" fontSize={8} fontWeight={isSelected ? '600' : '400'} className="fill-foreground">
                {n.label.length > 20 ? n.label.slice(0, 18) + '...' : n.label}
              </text>
            </g>
          );
        })}

        {/* Checkpoint nodes on selected route */}
        {selectedPath && nodes.filter(n => n.type === 'checkpoint' && n.route_id === selectedPath.route_id).map(n => {
          const isCompleted = completedNodeIds.has(n.id);
          const isCurrent = n.id === currentNodeId;
          return (
            <g key={n.id}>
              {isCurrent && <circle cx={n.x} cy={n.y} r={12} fill={selectedPath.color} opacity={0.2}>
                <animate attributeName="r" from="10" to="16" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>}
              <circle cx={n.x} cy={n.y} r={7} fill={isCompleted ? selectedPath.color : isCurrent ? selectedPath.color : 'white'} stroke={selectedPath.color} strokeWidth={2} />
              {isCompleted && <path d={`M${n.x - 3} ${n.y} l2 2 4-4`} fill="none" stroke="white" strokeWidth={1.5} />}
              <text x={n.x + 12} y={n.y + 3} fill="currentColor" fontSize={7} className="fill-foreground">{n.label.length > 16 ? n.label.slice(0, 14) + '...' : n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ───── List View Fallback ───── */
function ListFallback({ mapData, selectedPath, selectedRoute, completedNodeIds, currentNodeId }) {
  if (!mapData || !selectedPath) return <p className="text-sm text-muted-foreground text-center py-8">Select a route to see checkpoints</p>;
  const nodeLookup = Object.fromEntries(mapData.nodes.map(n => [n.id, n]));

  return (
    <Card data-testid="list-fallback">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedPath.color }} />
          <h3 className="text-sm font-semibold">{selectedRoute?.name || selectedPath.route_name}</h3>
          {selectedRoute && <span className="text-xs text-muted-foreground">{selectedRoute.estimated_time_minutes} min</span>}
        </div>
        <div className="space-y-0">
          {selectedPath.node_ids.map((nid, i) => {
            const node = nodeLookup[nid];
            if (!node) return null;
            const isCompleted = completedNodeIds.has(nid);
            const isCurrent = nid === currentNodeId;
            const isLast = i === selectedPath.node_ids.length - 1;
            return (
              <div key={nid} className="flex items-start gap-3" data-testid="list-checkpoint-item">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                    isCurrent ? 'border-primary text-primary bg-primary/10' :
                    node.type === 'destination' ? 'border-primary bg-primary text-primary-foreground' :
                    'border-muted-foreground/30 text-muted-foreground'
                  }`} style={isCompleted || isCurrent || node.type === 'destination' ? { borderColor: selectedPath.color } : {}}>
                    {isCompleted ? <Check className="w-3 h-3" /> : node.type === 'destination' ? <MapPin className="w-3 h-3" /> : i}
                  </div>
                  {!isLast && <div className={`w-0.5 h-6 ${isCompleted ? 'bg-primary' : 'bg-border'}`} style={isCompleted ? { backgroundColor: selectedPath.color } : {}} />}
                </div>
                <div className={`pb-3 ${isCurrent ? 'font-medium' : ''}`}>
                  <p className={`text-sm ${node.type === 'destination' ? 'font-bold' : ''}`}>{node.label}</p>
                  {node.type === 'origin' && <p className="text-xs text-muted-foreground">Start point</p>}
                  {node.type === 'destination' && <p className="text-xs text-muted-foreground">Final destination</p>}
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">You are here</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
