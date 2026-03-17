import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ScreenshotGuide } from '@/components/ScreenshotGuide';
import { helpdeskGuideSteps } from '@/data/guideData';

export default function HelpdeskManualPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useApp();

  if (!isLoggedIn || (user?.role !== 'helpdesk' && user?.role !== 'admin')) {
    navigate('/staff');
    return null;
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
