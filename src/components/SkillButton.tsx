import { useRef, useState } from 'react';

interface SkillButtonProps {
  label: string;
  subLabel: string;
  color: string;
  glow: string;
  cooldown: number;
  maxCooldown: number;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const LOCKOUT_MS = 300;

export function SkillButton({
  label, subLabel, color, glow, cooldown, maxCooldown, onPress, size = 'md',
}: SkillButtonProps) {
  const [pressed, setPressed] = useState(false);
  const firedRef = useRef(false);
  const lockTimer = useRef<number | null>(null);
  const cooldownRef = useRef(cooldown);
  cooldownRef.current = cooldown;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const isOnCooldown = cooldown > 0;
  const cooldownPct = maxCooldown > 0 ? (cooldown / maxCooldown) * 100 : 0;

  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-14 h-14' : 'w-12 h-12';
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]';
  const subSize = size === 'lg' ? 'text-[8px]' : 'text-[7px]';
  const cdSize = size === 'lg' ? 'text-base' : 'text-sm';

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firedRef.current) return;
    if (cooldownRef.current > 0) return;

    firedRef.current = true;
    setPressed(true);
    onPressRef.current();

    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      setPressed(false);
      firedRef.current = false;
    }, LOCKOUT_MS);
  };

  return (
    <button
      className={`relative ${dim} rounded-full select-none flex flex-col items-center justify-center overflow-hidden transition-all duration-100`}
      style={{
        background: `radial-gradient(circle, ${color}cc 0%, ${color}55 100%)`,
        border: `1.5px solid ${glow}`,
        boxShadow: pressed
          ? `0 0 6px ${glow}88, inset 0 0 8px rgba(0,0,0,0.4)`
          : `0 0 10px ${glow}44, inset 0 0 6px rgba(0,0,0,0.3)`,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        opacity: isOnCooldown ? 0.55 : 1,
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={onPointerDown}
    >
      <span className={`${labelSize} font-bold text-white drop-shadow-md leading-tight`}>
        {label}
      </span>
      <span className={`${subSize} text-white/60 leading-tight mt-0.5 px-1 text-center`}>
        {subLabel}
      </span>

      {isOnCooldown && (
        <>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(rgba(0,0,0,0.6) 0deg, rgba(0,0,0,0.6) ' + (cooldownPct * 3.6) + 'deg, transparent ' + (cooldownPct * 3.6) + 'deg)',
            }}
          />
          <span className={`absolute inset-0 flex items-center justify-center text-white font-bold ${cdSize} z-10`}>
            {cooldown.toFixed(1)}
          </span>
        </>
      )}
    </button>
  );
}
