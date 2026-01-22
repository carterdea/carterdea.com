import { useEffect, useState } from 'react';

import styles from './InteractivePreview.module.css';

interface InteractivePreviewProps {
  htmlPath: string;
  viewportWidth?: number;
  screenWidth: number;
  screenHeight: number;
  isPoweredOn: boolean;
  className?: string;
}

interface LoadedContent {
  path: string;
  html: string;
}

export default function InteractivePreview({
  htmlPath,
  viewportWidth = 1280,
  screenWidth,
  screenHeight,
  isPoweredOn,
  className = '',
}: InteractivePreviewProps): React.ReactElement | null {
  const [content, setContent] = useState<LoadedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPoweredOn || content?.path === htmlPath) return;

    setIsLoading(true);
    setError(null);

    fetch(htmlPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load HTML: ${response.statusText}`);
        }
        return response.text();
      })
      .then((html) => {
        setContent({ path: htmlPath, html });
        setIsLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load preview';
        setError(message);
        console.error('Error loading preview HTML:', err);
        setIsLoading(false);
      });
  }, [isPoweredOn, htmlPath, content?.path]);

  if (!isPoweredOn) {
    return null;
  }

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

      {content && (
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
            className={styles.iframe}
            srcDoc={content.html}
            sandbox="allow-scripts allow-same-origin"
            title="Interactive Preview"
            style={{
              width: `${viewportWidth}px`,
              height: `${scaledHeight}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
