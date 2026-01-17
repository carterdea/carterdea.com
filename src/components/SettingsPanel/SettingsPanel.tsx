import { Popover, RadioGroup } from '@headlessui/react';
import { MorphingOrbGL } from '../MorphingOrbGL';
import { useSiteMode, type SiteMode } from '../../hooks/useSiteMode';

interface ModeOption {
  id: SiteMode;
  label: string;
  icon: React.ReactNode;
}

const modes: ModeOption[] = [
  { id: 'vacation', label: 'Vacation mode', icon: null /* TODO: Add icon */ },
  { id: 'coder', label: 'Coder mode', icon: null /* TODO: Add icon */ },
  { id: 'preview', label: 'Preview mode', icon: null /* TODO: Add icon */ },
  { id: 'fire', label: 'Fire mode', icon: null /* TODO: Add icon */ },
  { id: 'money', label: 'Money mode', icon: null /* TODO: Add icon */ },
  { id: 'matrix', label: 'Matrix mode', icon: null /* TODO: Add icon */ },
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

      <Popover.Panel className="absolute bottom-full right-0 mb-3 w-[165px] overflow-hidden rounded border border-black bg-[#1a1a1a]">
        <RadioGroup
          value={mode}
          onChange={(newMode: SiteMode) => {
            handleModeChange(newMode);
          }}
        >
            {modes.map((modeOption) => (
              <RadioGroup.Option
                key={modeOption.id}
                value={modeOption.id}
                className="flex cursor-pointer items-center justify-between border-b border-[#222] p-2 focus:outline-none"
              >
                {({ checked }) => (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 w-[18px] h-[18px] flex shrink-0 items-center justify-center">
                        {modeOption.icon}
                      </span>
                      <span className="text-xs text-white whitespace-nowrap">{modeOption.label}</span>
                    </div>
                    <ToggleIndicator checked={checked} />
                  </>
                )}
              </RadioGroup.Option>
            ))}
        </RadioGroup>
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
          checked ? 'left-[13px]' : 'left-[2px]'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }}
      />
    </div>
  );
}
