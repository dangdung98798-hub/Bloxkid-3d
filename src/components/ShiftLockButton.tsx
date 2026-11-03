import { useRef } from 'react';

interface ShiftLockButtonProps {
  active: boolean;
  onToggle: () => void;
}

export function ShiftLockButton({ active, onToggle }: ShiftLockButtonProps) {
  const firedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firedRef.current) return;
    firedRef.current = true;
    onToggle();
    setTimeout(() => { firedRef.current = false; }, 200);
  };

  return (
    <button
      className="relative w-14 h-14 rounded-lg select-none flex flex-col items-center justify-center transition-all duration-150"
      style={{
        background: active
          ? 'radial-gradient(circle, rgba(255,180,40,0.9) 0%, rgba(200,120,20,0.9) 100%)'
          : 'radial-gradient(circle, rgba(40,50,80,0.7) 0%, rgba(20,25,45,0.8) 100%)',
        border: active ? '2px solid #ffcc44' : '2px solid rgba(80,120,200,0.4)',
        boxShadow: active
          ? '0 0 16px rgba(255,180,40,0.6)'
          : '0 0 8px rgba(50,100,200,0.2)',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
      onPointerDown={onPointerDown}
    >
      <span className="text-xs font-bold text-white leading-tight drop-shadow">SHIFT</span>
      <span className="text-[9px] text-white/80 leading-tight">LOCK</span>
      {active && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{ background: '#ffdd44', boxShadow: '0 0 6px #ffaa00' }}
        />
      )}
    </button>
  );
}
