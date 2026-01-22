import { useEffect, useState } from 'react';

interface RollingDigitProps {
  digit: string;
  direction: 'up' | 'down' | 'none';
}

function RollingDigit({ digit, direction }: RollingDigitProps) {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [prevDigit, setPrevDigit] = useState(digit);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (digit !== displayDigit && !isAnimating) {
      setPrevDigit(displayDigit);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setDisplayDigit(digit);
        setIsAnimating(false);
      }, 500); // Slower cash register animation

      return () => clearTimeout(timer);
    }
  }, [digit, displayDigit, isAnimating]);

  // Non-numeric characters don't animate
  if (!/\d/.test(digit)) {
    return <span className="rolling-char">{digit}</span>;
  }

  return (
    <span className="rolling-digit-container">
      <span className={`rolling-digit ${isAnimating ? `rolling-${direction}` : ''}`}>
        {isAnimating ? prevDigit : displayDigit}
      </span>
      {isAnimating && (
        <span className={`rolling-digit-incoming rolling-${direction}-incoming`}>{digit}</span>
      )}
    </span>
  );
}

interface RollingNumberProps {
  value: string;
  prevValue: string;
}

export function RollingNumber({ value, prevValue }: RollingNumberProps) {
  // Pad to same length for smooth transitions
  const maxLen = Math.max(value.length, prevValue.length);
  const paddedValue = value.padStart(maxLen, ' ');
  const paddedPrevValue = prevValue.padStart(maxLen, ' ');

  return (
    <span className="rolling-number">
      {paddedValue.split('').map((char, i) => {
        const prevChar = paddedPrevValue[i] || ' ';
        // Determine direction per-digit based on numeric value of that digit
        let direction: 'up' | 'down' | 'none' = 'none';
        if (/\d/.test(char) && /\d/.test(prevChar)) {
          const curr = parseInt(char, 10);
          const prev = parseInt(prevChar, 10);
          if (curr > prev) direction = 'up';
          else if (curr < prev) direction = 'down';
        }
        return <RollingDigit key={`digit-${i}-${char}`} digit={char} direction={direction} />;
      })}
    </span>
  );
}

export default RollingNumber;
