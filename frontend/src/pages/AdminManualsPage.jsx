import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { AdminSidebar } from '@/components/shared';
import { EmbeddedGuide } from '@/components/ScreenshotGuide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { customerGuideSteps, helpdeskGuideSteps, trainerGuideSteps, adminGuideSteps } from '@/data/guideData';

export default function AdminManualsPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useApp();
  const [tab, setTab] = useState('admin');

  if (!isLoggedIn || user?.role !== 'admin') {
    navigate('/staff');
    return null;
  }

  const guides = [
    { id: 'admin', label: 'Admin', steps: adminGuideSteps },
    { id: 'helpdesk', label: 'Helpdesk', steps: helpdeskGuideSteps },
    { id: 'trainer', label: 'Trainer', steps: trainerGuideSteps },
    { id: 'customer', label: 'Customer', steps: customerGuideSteps },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[hsl(var(--background))]">
      <AdminSidebar active="manuals" />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-1" data-testid="admin-manuals-title">Manuals Center</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">All role-specific guides in one place</p>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-4 mb-4" data-testid="manuals-tabs">
              {guides.map(g => (
                <TabsTrigger key={g.id} value={g.id} className="text-xs" data-testid={`manuals-tab-${g.id}`}>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {guides.map(g => (
              <TabsContent key={g.id} value={g.id}>
                <EmbeddedGuide steps={g.steps} maxWidth="400px" />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
