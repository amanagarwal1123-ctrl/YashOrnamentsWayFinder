import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { getGoldRates, adminUpdateGoldRates } from '@/lib/api';
import { AdminSidebar } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, TrendingUp, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminGoldRates() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [rates, setRates] = useState({ rate_24k: 0, rate_22k: 0, rate_18k: 0 });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    getGoldRates().then(r => {
      setRates({ rate_24k: r.data.rate_24k || 0, rate_22k: r.data.rate_22k || 0, rate_18k: r.data.rate_18k || 0 });
      setLastUpdated(r.data.updated_at || '');
    }).catch(() => {});
  }, [isLoggedIn, navigate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminUpdateGoldRates(rates);
      toast.success('Gold rates updated');
      setLastUpdated(new Date().toISOString());
    } catch (e) { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="gold-rates" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Gold Rate Management</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Update gold rates visible to AJPL customers only</p>

          <Card className="border-[hsl(var(--gold)/0.3)]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Coins className="w-5 h-5 text-[hsl(var(--gold))]" />
                <h2 className="font-semibold">Current Rates</h2>
              </div>
              
              <div className="space-y-4">
                {[{label: '24K (Pure Gold)', key: 'rate_24k'}, {label: '22K Gold', key: 'rate_22k'}, {label: '18K Gold', key: 'rate_18k'}].map(r => (
                  <div key={r.key}>
                    <label className="text-sm text-[hsl(var(--muted-foreground))] mb-1 block">{r.label} (per gram)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">₹</span>
                      <Input type="number" value={rates[r.key]} onChange={e => setRates({...rates, [r.key]: parseFloat(e.target.value) || 0})} className="font-mono tabular-nums" data-testid={`gold-rate-${r.key}`} />
                    </div>
                  </div>
                ))}
              </div>

              {lastUpdated && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}

              <Button className="w-full h-11 mt-6" onClick={handleSave} disabled={loading} data-testid="save-gold-rates">
                <Save className="w-4 h-4 mr-2" /> {loading ? 'Saving...' : 'Update Gold Rates'}
              </Button>

              <div className="mt-4 p-3 rounded-lg bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">
                <p className="font-medium text-[hsl(var(--foreground))] mb-1">Note:</p>
                <p>Gold rates are visible only to AJPL customers. Yash Ornaments customers will never see this module.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
