interface HealthBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  align?: 'left' | 'right';
}

export function HealthBar({ label, current, max, color, align = 'left' }: HealthBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className={`w-64 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center gap-2 mb-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs font-bold text-white/90 drop-shadow">{label}</span>
        <span className="text-[10px] text-white/60">
          {Math.ceil(current)} / {max}
        </span>
      </div>
      <div
        className="relative h-5 rounded-full overflow-hidden"
        style={{
          background: 'rgba(10,15,30,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}dd 50%, ${color}99 100%)`,
            boxShadow: `0 0 8px ${color}88`,
            marginLeft: align === 'right' ? 'auto' : '0',
          }}
        />
      </div>
    </div>
  );
}
