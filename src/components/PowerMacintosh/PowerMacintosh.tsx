import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PowerMacintosh.module.css';
import InteractivePreview from '../InteractivePreview';

// Classic Mac startup chime
const MAC_CHIME_URL = '/assets/sounds/power-macintosh-startup-chime.mp3';

// Rainbow Apple logo - matches Figma export exactly
const AppleLogo = () => (
  <svg
    width="12"
    height="14"
    viewBox="0 0 12 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <mask id="appleMask" maskUnits="userSpaceOnUse" x="0" y="0" width="12" height="14">
        <path
          d="M8.63329 0.00133821C7.88426 0.0521986 7.0097 0.530019 6.49851 1.15239C6.03439 1.71587 5.6512 2.55373 5.79985 3.36883C6.61743 3.39426 7.46226 2.9044 7.9528 2.274C8.41114 1.68509 8.75964 0.851243 8.63329 0M8.90995 3.27648C7.6489 3.27648 7.11623 3.87744 6.24167 3.87744C5.33986 3.87744 4.65359 3.27648 3.56348 3.27648C2.49155 3.27648 1.35272 3.92964 0.63094 5.04455L0.617727 5.06597C0.311975 5.547 0.108638 6.17328 0.0371641 6.85411C-0.0255995 7.40822 -0.00908283 8.01319 0.0883658 8.64092C0.19184 9.27499 0.357165 9.8782 0.578087 10.4277C0.841877 11.09 1.15998 11.6911 1.52367 12.2145C2.10175 13.0778 2.86152 13.992 3.83931 14C4.75434 14.0094 5.01283 13.4151 6.25406 13.4084C7.49529 13.4017 7.72983 14.0067 8.64403 13.9973C9.58135 13.9906 10.3535 13.0604 10.9291 12.2145L11.0926 11.9696C11.4052 11.5072 11.6854 10.9906 11.9284 10.4291L12.0002 10.2711C11.1777 9.96061 10.5938 9.3543 10.2784 8.64092C10.0306 8.08145 9.94802 7.45507 10.0463 6.85411C10.1545 6.18757 10.484 5.55182 11.0538 5.0673C11.227 4.92144 11.4071 4.79792 11.5923 4.6979C10.8721 3.79847 9.86214 3.27782 8.90995 3.27782"
          fill="white"
        />
      </mask>
    </defs>
    <g mask="url(#appleMask)">
      <rect y="0" width="12" height="2.33" fill="#75BD21" />
      <rect y="2.33" width="12" height="2.33" fill="#FFC728" />
      <rect y="4.66" width="12" height="2.33" fill="#FF661C" />
      <rect y="7" width="12" height="2.33" fill="#CF0F2B" />
      <rect y="9.33" width="12" height="2.33" fill="#B01CAB" />
      <rect y="11.66" width="12" height="2.34" fill="#00A1DE" />
    </g>
  </svg>
);

interface PowerMacintoshProps {
  screenshotSrc?: string;
  className?: string;
  initialPosition?: { x: number; y: number };
  enableStartupChime?: boolean;
  disableDrag?: boolean;
  /** Path to interactive HTML preview (if provided, replaces screenshot) */
  previewHtmlPath?: string;
  /** Viewport width the HTML was captured at (default: 1280px) */
  previewViewportWidth?: number;
}

type ScreenState = 'on' | 'off' | 'turningOn' | 'turningOff';

export default function PowerMacintosh({
  screenshotSrc = '/assets/previews/stussy-screenshot.png',
  className = '',
  initialPosition = { x: 0, y: 0 },
  enableStartupChime = true,
  disableDrag = false,
  previewHtmlPath,
  previewViewportWidth = 1280,
}: PowerMacintoshProps) {
  const [screenState, setScreenState] = useState<ScreenState>('on');
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (enableStartupChime) {
      audioRef.current = new Audio(MAC_CHIME_URL);
      audioRef.current.volume = 0.3;
    }
    return () => {
      audioRef.current = null;
    };
  }, [enableStartupChime]);

  const handlePowerToggle = useCallback(() => {
    if (screenState === 'turningOn' || screenState === 'turningOff') return;

    if (screenState === 'on') {
      setScreenState('turningOff');
      // Stop the chime if it's playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setTimeout(() => setScreenState('off'), 400);
    } else {
      setScreenState('turningOn');
      if (enableStartupChime && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      setTimeout(() => setScreenState('on'), 500);
    }
  }, [screenState, enableStartupChime]);

  const isPoweredOn = screenState === 'on' || screenState === 'turningOn';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't drag if disabled or clicking on the power button
      if (disableDrag) return;
      if ((e.target as HTMLElement).closest('button')) return;

      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position, disableDrag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`${styles.monitor} ${isDragging ? styles.dragging : ''} ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Main bezel/shell */}
      <div className={styles.shell}>
        {/* Inner bezel with gradient border */}
        <div className={styles.innerBezel}>
          {/* Bezel highlight overlay */}
          <div className={styles.bezelOverlay} />
          {/* Bottom highlight line */}
          <div className={styles.bezelBottomLine} />
          {/* CRT screen inset */}
          <div className={styles.crtInset}>
            {/* Actual screen content */}
            <div
              className={`
              ${styles.screen}
              ${screenState === 'off' ? styles.screenOff : ''}
              ${screenState === 'turningOff' ? styles.turningOff : ''}
              ${screenState === 'turningOn' ? styles.turningOn : ''}
              ${screenState === 'on' ? styles.screenFlicker : ''}
            `}
            >
              {/* Render interactive preview if path provided, otherwise show screenshot */}
              {previewHtmlPath ? (
                <InteractivePreview
                  htmlPath={previewHtmlPath}
                  viewportWidth={previewViewportWidth}
                  screenWidth={334}
                  screenHeight={244}
                  isPoweredOn={isPoweredOn}
                />
              ) : (
                isPoweredOn &&
                screenshotSrc && (
                  <img
                    src={screenshotSrc}
                    alt="Website preview"
                    className={styles.screenContent}
                    draggable={false}
                  />
                )
              )}
              {/* Scanlines overlay - only when powered on */}
              {isPoweredOn && <div className={styles.scanlines} />}
            </div>
          </div>
        </div>

        {/* Bottom area with Apple logo and power LED */}
        <div className={styles.bottomBar}>
          <div className={styles.appleLogo}>
            <AppleLogo />
          </div>
          <button
            type="button"
            className={`${styles.powerLed} ${isPoweredOn ? styles.powerOn : ''}`}
            onClick={handlePowerToggle}
            aria-label={isPoweredOn ? 'Turn off' : 'Turn on'}
          />
        </div>
      </div>

      {/* Monitor stand */}
      <div className={styles.stand}>
        <div className={styles.standTop} />
        <div className={styles.standMiddle} />
        <div className={styles.standBottom} />
      </div>
    </div>
  );
}
