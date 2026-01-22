import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './InteractivePreview.module.css';

interface InteractivePreviewProps {
  /** Path to the sanitized HTML file to load */
  htmlPath: string;
  /** Width of the viewport the HTML was captured at (default: 1280px) */
  viewportWidth?: number;
  /** Width of the screen area to scale to */
  screenWidth: number;
  /** Height of the screen area to scale to */
  screenHeight: number;
  /** Whether the preview is powered on (lazy loads content) */
  isPoweredOn: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function InteractivePreview({
  htmlPath,
  viewportWidth = 1280,
  screenWidth,
  screenHeight,
  isPoweredOn,
  className = '',
}: InteractivePreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInteractMode, setIsInteractMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Lazy load HTML content when powered on
  useEffect(() => {
    if (!isPoweredOn || htmlContent) return;

    const loadHTML = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(htmlPath);
        if (!response.ok) {
          throw new Error(`Failed to load HTML: ${response.statusText}`);
        }
        const html = await response.text();
        setHtmlContent(html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preview');
        console.error('Error loading preview HTML:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadHTML();
  }, [isPoweredOn, htmlPath, htmlContent]);

  // Calculate scale factor to fit viewport into screen
  // The HTML is captured at viewportWidth (1280px), scale it down to fit screenWidth
  const scale = screenWidth / viewportWidth;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to exit interact mode
      if (e.key === 'Escape' && isInteractMode) {
        setIsInteractMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInteractMode]);

  const handleScreenClick = useCallback(() => {
    if (!isInteractMode && htmlContent) {
      setIsInteractMode(true);
    }
  }, [isInteractMode, htmlContent]);

  // Don't render anything if not powered on
  if (!isPoweredOn) {
    return null;
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading preview...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {htmlContent && (
        <>
          {/* Clickable overlay to enter interact mode */}
          {!isInteractMode && (
            <div className={styles.overlay} onClick={handleScreenClick}>
              <div className={styles.overlayHint}>
                Click to interact • ESC to exit
              </div>
            </div>
          )}

          {/* Scaled iframe container */}
          <div
            className={styles.iframeWrapper}
            style={{
              width: `${viewportWidth}px`,
              height: `${screenHeight / scale}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              ref={iframeRef}
              className={`${styles.iframe} ${isInteractMode ? styles.interactive : styles.nonInteractive}`}
              srcDoc={htmlContent}
              sandbox="allow-scripts allow-same-origin"
              title="Interactive Preview"
              style={{
                width: `${viewportWidth}px`,
                height: `${screenHeight / scale}px`,
              }}
            />
          </div>

          {/* Interact mode indicator */}
          {isInteractMode && (
            <div className={styles.modeIndicator}>
              Interactive Mode • Press ESC to exit
            </div>
          )}
        </>
      )}
    </div>
  );
}
