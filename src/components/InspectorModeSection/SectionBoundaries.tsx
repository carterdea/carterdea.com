import { useEffect, useState } from 'react';

interface SectionConfig {
  selector: string;
  label: string;
}

interface BoundaryRect {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { selector: 'header', label: 'header' },
  { selector: '.hero-content', label: 'hero' },
  { selector: '.logo-marquee', label: 'marquee' },
  { selector: '.info-sections', label: 'info' },
  { selector: 'footer', label: 'footer' },
];

function getBoundaryRects(): BoundaryRect[] {
  const rects: BoundaryRect[] = [];

  for (const section of SECTIONS) {
    const el = document.querySelector(section.selector);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    rects.push({
      top: rect.top + window.scrollY,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      label: section.label,
    });
  }

  return rects;
}

export function SectionBoundaries(): React.JSX.Element {
  const [boundaries, setBoundaries] = useState<BoundaryRect[]>([]);

  useEffect(() => {
    function updateBoundaries(): void {
      setBoundaries(getBoundaryRects());
    }

    updateBoundaries();

    window.addEventListener('scroll', updateBoundaries);
    window.addEventListener('resize', updateBoundaries);
    const interval = setInterval(updateBoundaries, 1000);

    return () => {
      window.removeEventListener('scroll', updateBoundaries);
      window.removeEventListener('resize', updateBoundaries);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-9997 pointer-events-none overflow-hidden"
      data-inspector-overlay
    >
      {boundaries.map((boundary) => (
        <div
          key={boundary.label}
          className="absolute border border-dashed border-white/10 rounded-sm"
          style={{
            top: boundary.top - window.scrollY,
            left: boundary.left,
            width: boundary.width,
            height: boundary.height,
          }}
        >
          <span className="absolute -top-5 left-0 text-[10px] text-white/30 font-mono uppercase tracking-wider">
            {boundary.label}
          </span>
        </div>
      ))}
    </div>
  );
}
