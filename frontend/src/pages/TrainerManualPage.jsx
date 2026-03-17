import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ScreenshotGuide } from '@/components/ScreenshotGuide';
import { trainerGuideSteps } from '@/data/guideData';

export default function TrainerManualPage() {
  const { isLoggedIn, user } = useApp();

  if (!isLoggedIn || (user?.role !== 'trainer' && user?.role !== 'admin')) {
    return <Navigate to="/staff" replace />;
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
