import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { adminGetUsers, adminCreateUser, adminToggleUser, adminGenerateOTP } from '@/lib/api';
import { AdminSidebar, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Key, Shield, Headphones, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showOTP, setShowOTP] = useState(null);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [newUser, setNewUser] = useState({ username: '', display_name: '', role: 'helpdesk' });

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadUsers();
  }, [isLoggedIn, navigate]);

  const loadUsers = async () => {
    try {
      const res = await adminGetUsers();
      setUsers(res.data);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newUser.username) { toast.error('Username required'); return; }
    try {
      await adminCreateUser(newUser);
      toast.success('User created');
      setShowCreate(false);
      setNewUser({ username: '', display_name: '', role: 'helpdesk' });
      loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create');
    }
  };

  const handleToggle = async (userId) => {
    try {
      const res = await adminToggleUser(userId);
      toast.success(res.data.active ? 'User activated' : 'User deactivated');
      loadUsers();
    } catch (e) { toast.error('Failed to toggle'); }
  };

  const handleGenerateOTP = async (userId) => {
    try {
      const res = await adminGenerateOTP(userId);
      setGeneratedOTP(res.data.otp);
      setShowOTP(userId);
      toast.success('OTP generated');
    } catch (e) { toast.error('Failed to generate OTP'); }
  };

  const roleIcons = { admin: Shield, helpdesk: Headphones, trainer: MapPin };

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="users" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage internal staff accounts</p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button data-testid="create-user-button"><Plus className="w-4 h-4 mr-2" /> New User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Username" data-testid="new-username" />
                  <Input value={newUser.display_name} onChange={e => setNewUser({...newUser, display_name: e.target.value})} placeholder="Display name" />
                  <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="helpdesk">Helpdesk Agent</SelectItem>
                      <SelectItem value="trainer">Map Trainer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={handleCreate} data-testid="submit-user">Create User</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-16 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />)
            ) : users.map(user => {
              const Icon = roleIcons[user.role] || Users;
              return (
                <Card key={user.id} data-testid="user-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.display_name || user.username}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">@{user.username} • {user.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => handleGenerateOTP(user.id)} data-testid="generate-otp-button">
                        <Key className="w-3 h-3 mr-1" /> OTP
                      </Button>
                      <Switch checked={user.active} onCheckedChange={() => handleToggle(user.id)} data-testid="toggle-user-active" />
                    </div>
                  </CardContent>
                  {showOTP === user.id && generatedOTP && (
                    <div className="px-4 pb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                        <Key className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-xs text-green-700">Generated OTP for {user.username}:</p>
                          <p className="text-lg font-bold font-mono tracking-widest text-green-800" data-testid="generated-otp-value">{generatedOTP}</p>
                          <p className="text-[10px] text-green-600">Expires in 2 hours</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
