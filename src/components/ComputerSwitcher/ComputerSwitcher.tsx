import { useState } from 'react';

import IMacG4 from '../IMacG4/IMacG4';
import PowerMacintosh from '../PowerMacintosh/PowerMacintosh';

const computers = [
  { id: 'power-macintosh', name: 'Power Macintosh', Component: PowerMacintosh },
  { id: 'imac-g4', name: 'iMac G4', Component: IMacG4 },
] as const;

interface ComputerSwitcherProps {
  screenshotSrc?: string;
}

export default function ComputerSwitcher({ screenshotSrc }: ComputerSwitcherProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % computers.length);
  };

  const current = computers[currentIndex];
  const CurrentComputer = current.Component;

  return (
    <>
      <button
        type="button"
        className="switcher-button"
        onClick={handleNext}
        aria-label="Switch computer"
      >
        Next
      </button>
      <div className="preview-container">
        <CurrentComputer key={current.id} screenshotSrc={screenshotSrc} />
      </div>
    </>
  );
}
