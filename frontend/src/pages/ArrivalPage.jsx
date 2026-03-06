import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Share2, Home, Gem, Phone, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArrivalPage() {
  const navigate = useNavigate();
  const { business } = useApp();
  const isAjpl = business?.slug === 'ajpl';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-[400px]">
        <Card className="shadow-xl border-[hsl(var(--gold)/0.3)]" data-testid="arrival-card">
          <CardContent className="p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}>
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </motion.div>
            
            <h1 className="font-display text-2xl font-bold mb-2" data-testid="arrival-title">
              You've Arrived!
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1" data-testid="arrival-destination">
              Welcome to {business?.destination_label || 'your destination'}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">{business?.address}</p>

            <div className="space-y-2">
              {isAjpl && (
                <Button className="w-full h-11 bg-[hsl(var(--gold))] text-[hsl(var(--ink))] hover:opacity-90" onClick={() => navigate('/gallery')} data-testid="arrival-gallery">
                  <Gem className="w-4 h-4 mr-2" /> Browse Designs
                </Button>
              )}
              {business?.contact_phone && (
                <a href={`tel:${business.contact_phone}`} className="block">
                  <Button variant="outline" className="w-full h-11" data-testid="arrival-call">
                    <Phone className="w-4 h-4 mr-2" /> Call Reception
                  </Button>
                </a>
              )}
              <Button variant="outline" className="w-full h-11" onClick={() => { sessionStorage.clear(); navigate('/'); }} data-testid="arrival-done">
                <Home className="w-4 h-4 mr-2" /> Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
