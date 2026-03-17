import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ScreenshotGuide } from '@/components/ScreenshotGuide';
import { trainerGuideSteps } from '@/data/guideData';

export default function TrainerManualPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useApp();

  if (!isLoggedIn || (user?.role !== 'trainer' && user?.role !== 'admin')) {
    navigate('/staff');
    return null;
  }

  return (
    <ScreenshotGuide
      title="Trainer Manual"
      subtitle="How to create and manage navigation routes"
      steps={trainerGuideSteps}
      maxWidth="375px"
    />
  );
}
