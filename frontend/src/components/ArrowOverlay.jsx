import React from 'react';

const ARROW_TYPES = [
  { value: 'straight', label: 'Straight', symbol: '↑' },
  { value: 'left', label: 'Turn Left', symbol: '←' },
  { value: 'right', label: 'Turn Right', symbol: '→' },
  { value: 'straight_left', label: 'Straight + Left', symbol: '↑←' },
  { value: 'straight_right', label: 'Straight + Right', symbol: '↑→' },
  { value: 'way_sign', label: 'Way Sign', symbol: '⬆' },
];

export { ARROW_TYPES };

function ArrowSVG({ type, size = 32 }) {
  const s = size;
  const half = s / 2;
  const strokeW = Math.max(2, s / 10);

  const arrowColor = '#FF3B30';
  const bgColor = 'rgba(255,255,255,0.85)';

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible' }}>
      <circle cx={half} cy={half} r={half - 1} fill={bgColor} stroke={arrowColor} strokeWidth={1.5} />
      {type === 'straight' && (
        <path d={`M${half} ${s * 0.75} L${half} ${s * 0.25} M${half} ${s * 0.25} L${half - s * 0.15} ${s * 0.4} M${half} ${s * 0.25} L${half + s * 0.15} ${s * 0.4}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
      )}
      {type === 'left' && (
        <path d={`M${s * 0.75} ${half} L${s * 0.25} ${half} M${s * 0.25} ${half} L${s * 0.4} ${half - s * 0.15} M${s * 0.25} ${half} L${s * 0.4} ${half + s * 0.15}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
      )}
      {type === 'right' && (
        <path d={`M${s * 0.25} ${half} L${s * 0.75} ${half} M${s * 0.75} ${half} L${s * 0.6} ${half - s * 0.15} M${s * 0.75} ${half} L${s * 0.6} ${half + s * 0.15}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
      )}
      {type === 'straight_left' && (<>
        <path d={`M${half} ${s * 0.8} L${half} ${s * 0.35} M${half} ${s * 0.35} L${half - s * 0.1} ${s * 0.45}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
        <path d={`M${s * 0.7} ${half} L${s * 0.3} ${half} M${s * 0.3} ${half} L${s * 0.4} ${half - s * 0.1}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
      </>)}
      {type === 'straight_right' && (<>
        <path d={`M${half} ${s * 0.8} L${half} ${s * 0.35} M${half} ${s * 0.35} L${half + s * 0.1} ${s * 0.45}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
        <path d={`M${s * 0.3} ${half} L${s * 0.7} ${half} M${s * 0.7} ${half} L${s * 0.6} ${half - s * 0.1}`}
          stroke={arrowColor} strokeWidth={strokeW} strokeLinecap="round" fill="none" />
      </>)}
      {type === 'way_sign' && (
        <path d={`M${half} ${s * 0.78} L${half} ${s * 0.22} M${half - s * 0.18} ${s * 0.35} L${half} ${s * 0.18} L${half + s * 0.18} ${s * 0.35}`}
          stroke={arrowColor} strokeWidth={strokeW + 1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
    </svg>
  );
}

export function ArrowOverlayRenderer({ arrows = [], containerWidth, containerHeight }) {
  if (!arrows.length || !containerWidth || !containerHeight) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="arrow-overlay">
      {arrows.map((arrow, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${arrow.x}%`,
            top: `${arrow.y}%`,
            transform: `translate(-50%, -50%) rotate(${arrow.rotation || 0}deg)`,
          }}
        >
          <ArrowSVG type={arrow.type} size={36} />
        </div>
      ))}
    </div>
  );
}

export function ArrowPlacementEditor({ imageUrl, arrows = [], onChange }) {
  const [selectedType, setSelectedType] = React.useState('straight');

  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange([...arrows, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, type: selectedType, rotation: 0 }]);
  };

  const removeArrow = (idx) => {
    onChange(arrows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* Arrow type selector */}
      <div>
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">Arrow Type</label>
        <div className="flex flex-wrap gap-1.5">
          {ARROW_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSelectedType(t.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                selectedType === t.value
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                  : 'bg-[hsl(var(--muted))] border-[hsl(var(--border))] hover:bg-[hsl(var(--border))]'
              }`}
              data-testid={`arrow-type-${t.value}`}
            >
              <ArrowSVG type={t.value} size={18} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image with click-to-place */}
      {imageUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-[hsl(var(--border))] cursor-crosshair" data-testid="arrow-placement-canvas">
          <img
            src={imageUrl}
            alt="Checkpoint"
            className="w-full h-auto block"
            onClick={handleImageClick}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
          />
          {/* Render placed arrows */}
          {arrows.map((arrow, i) => (
            <div
              key={i}
              className="absolute group cursor-pointer"
              style={{
                left: `${arrow.x}%`,
                top: `${arrow.y}%`,
                transform: `translate(-50%, -50%) rotate(${arrow.rotation || 0}deg)`,
              }}
              onClick={(e) => { e.stopPropagation(); removeArrow(i); }}
              title="Click to remove"
            >
              <ArrowSVG type={arrow.type} size={36} />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                ×
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Upload a checkpoint photo first, then place arrows</p>
        </div>
      )}

      {/* Placed arrows list */}
      {arrows.length > 0 && (
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {arrows.length} arrow{arrows.length !== 1 ? 's' : ''} placed. Click an arrow on the image to remove it.
        </div>
      )}
    </div>
  );
}
