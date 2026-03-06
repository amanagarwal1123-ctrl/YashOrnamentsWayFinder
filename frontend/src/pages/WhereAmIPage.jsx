import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { whereAmI, addSessionEvent } from '@/lib/api';
import { BrandHeader, BottomActionBar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Compass, MapPin, Search, Navigation, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const QUICK_HINTS = [
  'Narrow lane', 'Many silver shops', 'Omaxe side', 'Red Fort side',
  'Town Hall side', 'Building with jewellery boards', 'Stairs visible',
  'Lift visible', 'Market gate visible', 'Near metro gate',
  'Inside building entrance', 'Book market area'
];

export default function WhereAmIPage() {
  const navigate = useNavigate();
  const { session, business } = useApp();
  const [description, setDescription] = useState('');
  const [selectedHints, setSelectedHints] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const toggleHint = (hint) => {
    setSelectedHints(prev => prev.includes(hint) ? prev.filter(h => h !== hint) : [...prev, hint]);
  };

  const handleSearch = async () => {
    if (!description && selectedHints.length === 0) {
      toast.error('Please describe what you see or select options');
      return;
    }
    setLoading(true);
    try {
      const res = await whereAmI({
        description,
        hints: selectedHints,
        session_id: session?.id || '',
        lat: 0, lng: 0
      });
      setMatches(res.data.matches || []);
      setSearched(true);
      if (session) {
        await addSessionEvent(session.id, 'where_am_i', { description, hints: selectedHints });
      }
    } catch (e) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-24">
      <BrandHeader showBack title="Where Am I?" subtitle="Let us find your location" />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Describe what you see</h3>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g., near a paan shop with silver shops around"
                className="mb-3"
                data-testid="where-am-i-input"
              />
              
              <h3 className="font-semibold text-sm mb-2">Quick options</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_HINTS.map(hint => (
                  <button
                    key={hint}
                    onClick={() => toggleHint(hint)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      selectedHints.includes(hint)
                        ? 'bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] border-[hsl(var(--brand))]'
                        : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                    }`}
                    data-testid={`hint-${hint.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {hint}
                  </button>
                ))}
              </div>
              
              <Button className="w-full h-11" onClick={handleSearch} disabled={loading} data-testid="where-am-i-search">
                <Search className="w-4 h-4 mr-2" /> {loading ? 'Searching...' : 'Find My Location'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {matches.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">You might be near:</h3>
                {matches.map((m, idx) => (
                  <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid="where-am-i-result">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[hsl(var(--brand)/0.15)] flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[hsl(var(--brand))]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.short_instruction}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Compass className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">We couldn't match your description. Try calling our helpdesk for assistance.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>

      <BottomActionBar>
        <Button variant="outline" className="flex-1 h-11" onClick={() => navigate('/help')} data-testid="where-am-i-help">
          Need Help?
        </Button>
        {session?.route_id && (
          <Button className="flex-1 h-11" onClick={() => navigate('/navigate')} data-testid="where-am-i-navigate">
            <Navigation className="w-4 h-4 mr-2" /> Resume Route
          </Button>
        )}
      </BottomActionBar>
    </div>
  );
}
