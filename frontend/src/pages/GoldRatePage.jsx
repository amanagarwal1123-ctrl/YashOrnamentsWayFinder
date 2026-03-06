import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getGoldRates } from '@/lib/api';
import { BrandHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TrendingUp, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoldRatePage() {
  const navigate = useNavigate();
  const { business } = useApp();
  const [rates, setRates] = useState(null);
  const [weight, setWeight] = useState('');
  const [karat, setKarat] = useState('22');

  useEffect(() => {
    if (business?.slug !== 'ajpl') { navigate('/'); return; }
    getGoldRates().then(r => setRates(r.data)).catch(() => {});
  }, [business, navigate]);

  const rateMap = { '24': rates?.rate_24k, '22': rates?.rate_22k, '18': rates?.rate_18k };
  const estimate = weight && rateMap[karat] ? (parseFloat(weight) * rateMap[karat]).toLocaleString('en-IN') : '';

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <BrandHeader showBack title="Gold Rates" subtitle="Today's rates" />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        {rates && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-4 border-[hsl(var(--gold)/0.3)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--gold))]" />
                  <h2 className="font-semibold">Current Gold Rates</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  {[{ label: '24K Pure', val: rates.rate_24k }, { label: '22K', val: rates.rate_22k }, { label: '18K', val: rates.rate_18k }].map(r => (
                    <div key={r.label} className="text-center p-3 rounded-lg bg-[hsl(var(--muted))]">
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{r.label}</p>
                      <p className="text-lg font-bold tabular-nums" data-testid="gold-rate-display">₹{r.val?.toLocaleString()}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">per gram</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center">
                  Last updated: {rates.updated_at ? new Date(rates.updated_at).toLocaleString() : 'N/A'}
                </p>
              </CardContent>
            </Card>

            {/* Calculator */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-[hsl(var(--gold))]" />
                  <h2 className="font-semibold">Rate Calculator</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Weight (grams)</label>
                    <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Enter weight" data-testid="calc-weight" />
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Karat</label>
                    <div className="flex gap-2">
                      {['24', '22', '18'].map(k => (
                        <button key={k} onClick={() => setKarat(k)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${karat === k ? 'bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] border-[hsl(var(--brand))]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                          data-testid={`calc-karat-${k}`}>
                          {k}K
                        </button>
                      ))}
                    </div>
                  </div>
                  {estimate && (
                    <div className="p-4 rounded-lg bg-[hsl(var(--gold)/0.1)] text-center">
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Estimated Value</p>
                      <p className="text-2xl font-bold tabular-nums text-[hsl(var(--gold))]" data-testid="calc-result">₹{estimate}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
