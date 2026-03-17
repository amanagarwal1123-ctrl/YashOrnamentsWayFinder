import React from 'react';
import { ScreenshotGuide } from '@/components/ScreenshotGuide';
import { customerGuideSteps } from '@/data/guideData';

export default function HelpGuidePage() {
  return (
    <ScreenshotGuide
      title="Help Guide"
      subtitle="Quick guide to navigate using this app"
      steps={customerGuideSteps}
      maxWidth="375px"
    />
  );
}
