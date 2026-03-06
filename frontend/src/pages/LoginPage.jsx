import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { login } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Navigation, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useApp();
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !otp) { toast.error('Please enter username and OTP'); return; }
    setLoading(true);
    try {
      const res = await login(username, otp);
      loginUser(res.data.user);
      localStorage.setItem('nav_token', res.data.token);
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'helpdesk') navigate('/helpdesk');
      else if (role === 'trainer') navigate('/admin/routes');
      else navigate('/admin');
      toast.success(`Welcome, ${res.data.user.display_name}!`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[380px]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h1 className="font-display text-2xl font-bold">Staff Login</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Admin, Helpdesk & Trainer access</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">Username</label>
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. admin" data-testid="login-username" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">OTP</label>
                <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP or admin123" type="password" className="font-mono tracking-widest" data-testid="login-otp" />
              </div>
              <Button className="w-full h-11" onClick={handleLogin} disabled={loading} data-testid="login-submit">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center mt-3">
              Test: username "admin" / OTP "admin123"
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <button onClick={() => navigate('/')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mx-auto" data-testid="back-to-home">
            <ArrowLeft className="w-4 h-4" /> Back to Navigation
          </button>
        </div>
      </motion.div>
    </div>
  );
}
