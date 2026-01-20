import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './IMacG4.module.css';

// iMac G4 startup chime
const MAC_CHIME_URL = '/assets/sounds/imac-startup-chime.mp3';

interface IMacG4Props {
  screenshotSrc?: string;
  className?: string;
  initialPosition?: { x: number; y: number };
  enableStartupChime?: boolean;
  disableDrag?: boolean;
}

type ScreenState = 'on' | 'off' | 'turningOn' | 'turningOff';

export default function IMacG4({
  screenshotSrc = '/assets/previews/stussy-screenshot.png',
  className = '',
  initialPosition = { x: 0, y: 0 },
  enableStartupChime = true,
  disableDrag = false
}: IMacG4Props) {
  const [screenState, setScreenState] = useState<ScreenState>('on');
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disableDrag) return;
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position, disableDrag]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`${styles.imac} ${isDragging ? styles.dragging : ''} ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Screen/Monitor */}
      <div className={styles.monitor}>
        {/* Outer bezel - frosted glass effect */}
        <div className={styles.outerBezel}>
          {/* Inner bezel - white plastic */}
          <div className={styles.innerBezel}>
            {/* Black screen border */}
            <div className={styles.screenBorder}>
              {/* Actual screen */}
              <div className={`
                ${styles.screen}
                ${screenState === 'off' ? styles.screenOff : ''}
                ${screenState === 'turningOff' ? styles.turningOff : ''}
                ${screenState === 'turningOn' ? styles.turningOn : ''}
              `}>
                {isPoweredOn && screenshotSrc && (
                  <img
                    src={screenshotSrc}
                    alt="Website preview"
                    className={styles.screenContent}
                    draggable={false}
                  />
                )}
              </div>
            </div>
            {/* Power LED indicator - below screen on chin */}
            <button
              type="button"
              className={`${styles.powerLed} ${isPoweredOn ? styles.powerOn : styles.powerSleep}`}
              onClick={handlePowerToggle}
              aria-label={isPoweredOn ? 'Turn off' : 'Turn on'}
            />
          </div>
        </div>
      </div>

      {/* Chrome arm */}
      <div className={styles.arm}>
        <div className={styles.armJoint}>
          <img
            src="/assets/devices/imac-g4/d28b796a9146c0abb6cf876c2b644db5267a2ace.svg"
            alt=""
            className={styles.armJointSvg}
            draggable={false}
          />
        </div>
        <div className={styles.armBar} />
      </div>

      {/* Dome base */}
      <div className={styles.base}>
        <img
          src="/assets/devices/imac-g4/c2547ceeb6fb0e60d5ce8b90a445a5db0751cb1b.svg"
          alt=""
          className={styles.baseSvg}
          draggable={false}
        />
      </div>
    </div>
  );
}
