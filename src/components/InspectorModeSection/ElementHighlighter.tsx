import type { BoxSpacing } from './inspectorUtils';

interface ElementHighlighterProps {
  rect: DOMRect;
  padding: BoxSpacing;
  margin: BoxSpacing;
}

interface BoxOverlayProps {
  className: string;
  style: React.CSSProperties;
}

function BoxOverlay({ className, style }: BoxOverlayProps): React.JSX.Element {
  return <div className={`absolute ${className}`} style={style} />;
}

export function ElementHighlighter({
  rect,
  padding,
  margin,
}: ElementHighlighterProps): React.JSX.Element {
  const outerTop = rect.top - margin.top;
  const outerLeft = rect.left - margin.left;
  const outerWidth = rect.width + margin.left + margin.right;
  const outerHeight = rect.height + margin.top + margin.bottom;

  const contentWidth = rect.width - padding.left - padding.right;
  const contentHeight = rect.height - padding.top - padding.bottom;

  const marginColor = 'bg-emerald-400/10';
  const paddingColor = 'bg-violet-400/12';

  return (
    <div
      className="fixed z-9998 pointer-events-none"
      style={{ top: outerTop, left: outerLeft, width: outerWidth, height: outerHeight }}
      data-inspector-overlay
    >
      {/* Margin overlays */}
      {margin.top > 0 && (
        <BoxOverlay
          className={marginColor}
          style={{ top: 0, left: 0, width: outerWidth, height: margin.top }}
        />
      )}
      {margin.bottom > 0 && (
        <BoxOverlay
          className={marginColor}
          style={{ bottom: 0, left: 0, width: outerWidth, height: margin.bottom }}
        />
      )}
      {margin.left > 0 && (
        <BoxOverlay
          className={marginColor}
          style={{ top: margin.top, left: 0, width: margin.left, height: rect.height }}
        />
      )}
      {margin.right > 0 && (
        <BoxOverlay
          className={marginColor}
          style={{ top: margin.top, right: 0, width: margin.right, height: rect.height }}
        />
      )}

      {/* Element box (padding + content) */}
      <div
        className="absolute"
        style={{ top: margin.top, left: margin.left, width: rect.width, height: rect.height }}
      >
        {/* Padding overlays */}
        {padding.top > 0 && (
          <BoxOverlay
            className={paddingColor}
            style={{ top: 0, left: 0, width: rect.width, height: padding.top }}
          />
        )}
        {padding.bottom > 0 && (
          <BoxOverlay
            className={paddingColor}
            style={{ bottom: 0, left: 0, width: rect.width, height: padding.bottom }}
          />
        )}
        {padding.left > 0 && (
          <BoxOverlay
            className={paddingColor}
            style={{ top: padding.top, left: 0, width: padding.left, height: contentHeight }}
          />
        )}
        {padding.right > 0 && (
          <BoxOverlay
            className={paddingColor}
            style={{ top: padding.top, right: 0, width: padding.right, height: contentHeight }}
          />
        )}

        {/* Content box */}
        <div
          className="absolute bg-cyan-400/8 border border-cyan-400/40"
          style={{
            top: padding.top,
            left: padding.left,
            width: contentWidth,
            height: contentHeight,
          }}
        />
      </div>
    </div>
  );
}
