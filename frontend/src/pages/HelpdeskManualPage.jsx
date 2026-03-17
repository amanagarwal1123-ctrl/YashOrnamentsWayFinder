import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ScreenshotGuide } from '@/components/ScreenshotGuide';
import { helpdeskGuideSteps } from '@/data/guideData';

export default function HelpdeskManualPage() {
  const { isLoggedIn, user } = useApp();

  if (!isLoggedIn || (user?.role !== 'helpdesk' && user?.role !== 'admin')) {
    return <Navigate to="/staff" replace />;
  }

  return (
    <ScreenshotGuide
      title="Helpdesk Manual"
      subtitle="How to assist customers in real-time"
      steps={helpdeskGuideSteps}
      maxWidth="375px"
    />
  );
}
