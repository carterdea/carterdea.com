import { Popover } from '@headlessui/react';
import {
  BanknotesIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  FireIcon,
} from '@heroicons/react/16/solid';
import { MorphingOrbGL } from '../MorphingOrbGL';
import { useSiteMode, type SiteMode } from '../../hooks/useSiteMode';

interface ModeOption {
  id: SiteMode;
  label: string;
  icon: React.ReactNode;
}

const modes: ModeOption[] = [
  { id: 'vacation', label: 'Throwback mode', icon: <img src="/throwback.svg" alt="" className="size-full" /> },
  { id: 'coder', label: 'Developer mode', icon: <CommandLineIcon className="size-full text-white" /> },
  { id: 'preview', label: 'Preview mode', icon: <ComputerDesktopIcon className="size-full text-white" /> },
  { id: 'fire', label: 'Fire mode', icon: <FireIcon className="size-full text-white" /> },
  { id: 'money', label: 'Money mode', icon: <BanknotesIcon className="size-full text-white" /> },
  { id: 'matrix', label: 'Matrix mode', icon: <img src="/matrix.svg" alt="" className="size-full" /> },
];

export function SettingsPanel() {
  const [mode, setMode] = useSiteMode();

  const handleModeChange = (newMode: SiteMode) => {
    // Toggle off if selecting the same mode
    if (newMode === mode) {
      setMode(null);
    } else {
      setMode(newMode);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button
        className="cursor-pointer active:scale-[0.95] transition-all duration-150 focus:outline-none"
        aria-label="Open settings"
      >
        <MorphingOrbGL size={32} variant="mono" />
      </Popover.Button>

      <Popover.Panel className="absolute bottom-full right-0 mb-3 w-48 overflow-hidden rounded border border-black bg-[#1a1a1a]">
        {modes.map((modeOption) => {
          const checked = mode === modeOption.id;
          return (
            <button
              key={modeOption.id}
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => handleModeChange(modeOption.id)}
              className="flex w-full cursor-pointer items-center justify-between border-b border-[#222] p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-inset"
            >
              <div className="flex items-center gap-2">
                <span className="text-white/60 w-[18px] h-[18px] flex shrink-0 items-center justify-center">
                  {modeOption.icon}
                </span>
                <span className="text-xs text-white whitespace-nowrap">{modeOption.label}</span>
              </div>
              <ToggleIndicator checked={checked} />
            </button>
          );
        })}
      </Popover.Panel>
    </Popover>
  );
}

function ToggleIndicator({ checked }: { checked: boolean }) {
  // Gray bg + knob on right = ON; Border only + knob on left = OFF
  // Using --ease-out-expo from global.css: cubic-bezier(0.22, 0.61, 0.36, 1)
  return (
    <div
      className={`relative shrink-0 h-[14px] w-[26px] rounded-lg transition-all duration-200 ${
        checked ? 'bg-[#aaa]' : 'border border-[#888]'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }}
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 h-[10px] w-[10px] rounded-lg bg-white transition-all duration-200 ${
          checked ? 'left-[14px]' : 'left-px'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }}
      />
    </div>
  );
}
