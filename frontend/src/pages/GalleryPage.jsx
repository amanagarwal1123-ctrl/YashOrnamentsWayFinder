import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getGallery } from '@/lib/api';
import { BrandHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function GalleryPage() {
  const navigate = useNavigate();
  const { business } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business?.slug !== 'ajpl') { navigate('/'); return; }
    getGallery().then(r => { setItems(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [business, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-20">
      <BrandHeader showBack title="Design Gallery" subtitle="AJPL Collection" />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="aspect-square rounded-xl bg-[hsl(var(--muted))] animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Gem className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Gallery coming soon</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid="gallery-item">
                  <div className="aspect-square bg-gradient-to-br from-[hsl(var(--gold)/0.1)] to-[hsl(var(--gold)/0.05)] flex items-center justify-center">
                    <Gem className="w-10 h-10 text-[hsl(var(--gold)/0.5)]" />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-xs font-semibold truncate">{item.title}</h3>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.category} • {item.weight}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Enquiry CTA */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">Interested in a design?</h3>
            <div className="flex gap-2">
              {business?.contact_whatsapp && (
                <a href={`https://wa.me/${business.contact_whatsapp?.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your designs`} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full h-10" data-testid="gallery-whatsapp-enquiry">
                    <MessageCircle className="w-4 h-4 mr-1 text-green-600" /> WhatsApp
                  </Button>
                </a>
              )}
              {business?.contact_phone && (
                <a href={`tel:${business.contact_phone}`} className="flex-1">
                  <Button variant="outline" className="w-full h-10" data-testid="gallery-call-enquiry">
                    <Phone className="w-4 h-4 mr-1" /> Call
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
