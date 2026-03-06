import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { requestCallback, addSessionEvent } from '@/lib/api';
import { BrandHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, MessageCircle, PhoneCallback, HelpCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ISSUE_TYPES = [
  { value: 'cannot_find_lane', label: 'Cannot find the lane' },
  { value: 'cannot_find_building', label: 'Cannot find the building' },
  { value: 'cannot_find_floor', label: 'Cannot find the floor' },
  { value: 'gps_wrong', label: 'GPS showing wrong location' },
  { value: 'video_not_loading', label: 'Video not loading' },
  { value: 'lost', label: 'I am lost' },
  { value: 'other', label: 'Other' },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const { session, business } = useApp();
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [name, setName] = useState(session?.customer_name || '');
  const [phone, setPhone] = useState(session?.customer_phone || '');
  const [issueType, setIssueType] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCallback = async () => {
    if (!phone) { toast.error('Please enter your phone number'); return; }
    setLoading(true);
    try {
      await requestCallback(session.id, {
        customer_name: name,
        customer_phone: phone,
        issue_type: issueType,
        notes: ''
      });
      setSubmitted(true);
      toast.success('Callback request sent! We will call you shortly.');
    } catch (e) {
      toast.error('Failed to send callback request');
    } finally {
      setLoading(false);
    }
  };

  const handleHelpMe = async () => {
    if (!session) return;
    try {
      await addSessionEvent(session.id, 'help_requested', {});
      toast.success('Help request sent! Our team has been notified.');
    } catch (e) {
      toast.error('Failed to send help request');
    }
  };

  const handleShareLocation = async () => {
    if (!session) return;
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await addSessionEvent(session.id, 'location_shared', {
            lat: pos.coords.latitude, lng: pos.coords.longitude
          });
          toast.success('Location shared with helpdesk');
        }, () => {
          addSessionEvent(session.id, 'location_shared', {});
          toast.info('Location shared (approximate)');
        });
      } else {
        await addSessionEvent(session.id, 'location_shared', {});
        toast.info('Location shared');
      }
    } catch (e) {
      toast.error('Failed to share location');
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <BrandHeader showBack title="Need Help?" subtitle="We're here to guide you" />
      
      <div className="max-w-[480px] mx-auto px-4 py-4">
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {business?.contact_phone && (
              <a href={`tel:${business.contact_phone}`} className="block" data-testid="help-call-button">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Phone className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">Call Now</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Immediate help</p>
                  </CardContent>
                </Card>
              </a>
            )}
            {business?.contact_whatsapp && (
              <a href={`https://wa.me/${business.contact_whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" data-testid="help-whatsapp-button">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Send message</p>
                  </CardContent>
                </Card>
              </a>
            )}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleHelpMe} data-testid="help-me-trigger">
              <CardContent className="p-4 text-center">
                <HelpCircle className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--warning))]" />
                <p className="text-sm font-medium">Help Me</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Alert helpdesk</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleShareLocation} data-testid="help-share-location">
              <CardContent className="p-4 text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--info))]" />
                <p className="text-sm font-medium">Share Location</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Send to support</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Callback Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {!showCallbackForm ? (
            <Button variant="outline" className="w-full h-12 mb-4" onClick={() => setShowCallbackForm(true)} data-testid="request-callback-toggle">
              <Phone className="w-4 h-4 mr-2" /> Request a Callback
            </Button>
          ) : submitted ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-green-800 mb-1">Callback Requested!</h3>
                <p className="text-sm text-green-700">Our team will call you at {phone} shortly.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">Request a Callback</h3>
                <div className="space-y-3">
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" data-testid="callback-name" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number" type="tel" data-testid="callback-phone" />
                  <Select onValueChange={setIssueType} data-testid="callback-issue-type">
                    <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button className="w-full h-11" onClick={handleCallback} disabled={loading} data-testid="submit-callback">
                    {loading ? 'Sending...' : 'Send Callback Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
