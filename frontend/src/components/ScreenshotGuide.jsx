import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GuideStep = ({ step, index }) => (
  <div className="mb-4" data-testid={`guide-step-${step.id}`}>
    <div className="rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
      {/* Title header - always visible first */}
      <div className="px-3 py-2.5 border-b border-[hsl(var(--border)/0.5)]">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-[11px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <h3 className="text-sm font-semibold leading-tight">{step.title}</h3>
        </div>
        {step.caption && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-8 leading-relaxed">{step.caption}</p>
        )}
        {step.buttons && step.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
            {step.buttons.map((b, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Screenshot */}
      <div className="bg-[hsl(var(--muted)/0.5)]">
        {step.screenshot ? (
          <img
            src={step.screenshot}
            alt={step.title}
            className="w-full h-auto block"
            style={{ maxHeight: '480px', objectFit: 'contain', objectPosition: 'top' }}
            loading="lazy"
            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full flex items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-2">
                <span className="text-sm font-bold text-[hsl(var(--primary))]">{index + 1}</span>
              </div>
              <p className="text-xs">{step.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const ScreenshotGuide = ({ title, subtitle, steps, maxWidth = '375px' }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-50 bg-[hsl(var(--card))]/95 backdrop-blur-sm border-b border-[hsl(var(--border))]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
            data-testid="guide-back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold text-base truncate" data-testid="guide-title">{title}</h1>
            {subtitle && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{subtitle}</p>}
          </div>
        </div>
      </header>

      <div className="py-4 px-3">
        <div style={{ maxWidth }} className="mx-auto">
          {steps.map((step, i) => (
            <GuideStep key={step.id} step={step} index={i} />
          ))}
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-2 mb-6">
            {steps.length} steps
          </p>
        </div>
      </div>
    </div>
  );
};

export const EmbeddedGuide = ({ steps, maxWidth = '400px' }) => (
  <div className="py-2">
    <div style={{ maxWidth }} className="mx-auto">
      {steps.map((step, i) => (
        <GuideStep key={step.id} step={step} index={i} />
      ))}
    </div>
  </div>
);
