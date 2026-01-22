import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './InteractivePreview.module.css';

interface InteractivePreviewProps {
  htmlPath: string;
  viewportWidth?: number;
  screenWidth: number;
  screenHeight: number;
  isPoweredOn: boolean;
  className?: string;
}

export default function InteractivePreview({
  htmlPath,
  viewportWidth = 1280,
  screenWidth,
  screenHeight,
  isPoweredOn,
  className = '',
}: InteractivePreviewProps): React.ReactElement | null {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInteractMode, setIsInteractMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Lazy load HTML content when powered on
  useEffect(() => {
    if (!isPoweredOn || htmlContent) return;

    async function loadHTML(): Promise<void> {
      setIsLoading(true);
      setError(null);

      const response = await fetch(htmlPath);
      if (!response.ok) {
        setError(`Failed to load HTML: ${response.statusText}`);
        setIsLoading(false);
        return;
      }

      const html = await response.text();
      setHtmlContent(html);
      setIsLoading(false);
    }

    loadHTML().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      console.error('Error loading preview HTML:', err);
      setIsLoading(false);
    });
  }, [isPoweredOn, htmlPath, htmlContent]);

  // ESC to exit interact mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isInteractMode) {
        setIsInteractMode(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInteractMode]);

  const handleScreenClick = useCallback(() => {
    if (!isInteractMode && htmlContent) {
      setIsInteractMode(true);
    }
  }, [isInteractMode, htmlContent]);

  if (!isPoweredOn) {
    return null;
  }

  // Scale factor to fit viewport into screen
  const scale = screenWidth / viewportWidth;
  const scaledHeight = screenHeight / scale;

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
          <p>{error}</p>
        </div>
      )}

      {htmlContent && (
        <>
          {!isInteractMode && (
            <button
              type="button"
              className={styles.overlay}
              onClick={handleScreenClick}
              aria-label="Click to interact with preview"
            >
              <span className={styles.overlayHint}>Click to interact - ESC to exit</span>
            </button>
          )}

          <div
            className={styles.iframeWrapper}
            style={{
              width: `${viewportWidth}px`,
              height: `${scaledHeight}px`,
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
                height: `${scaledHeight}px`,
              }}
            />
          </div>

          {isInteractMode && (
            <div className={styles.modeIndicator}>Interactive Mode - Press ESC to exit</div>
          )}
        </>
      )}
    </div>
  );
}
