import { useRef, useCallback, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, z: number) => void;
}

const KNOB_RADIUS = 34;
const MAX_REACH = 65;
const DEAD_ZONE = 8;

export function Joystick({ onMove }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const activeRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, MAX_REACH);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clamped;
    const knobY = Math.sin(angle) * clamped;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    if (dist > DEAD_ZONE) {
      const ratio = Math.min(dist, MAX_REACH) / MAX_REACH;
      const nx = Math.cos(angle) * ratio;
      const nz = -Math.sin(angle) * ratio;
      onMoveRef.current(nx, nz);
    } else {
      onMoveRef.current(0, 0);
    }
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number, id: number) => {
    originRef.current = { x: clientX, y: clientY };
    pointerIdRef.current = id;
    activeRef.current = true;
    setVisible(true);
    if (baseRef.current) {
      baseRef.current.style.left = `${clientX}px`;
      baseRef.current.style.top = `${clientY}px`;
    }
    if (knobRef.current) {
      knobRef.current.style.left = `${clientX}px`;
      knobRef.current.style.top = `${clientY}px`;
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
  }, []);

  const handleEnd = useCallback(() => {
    activeRef.current = false;
    pointerIdRef.current = null;
    setVisible(false);
    onMoveRef.current(0, 0);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Do NOT use setPointerCapture — it would steal events from the camera drag zone
    handleStart(e.clientX, e.clientY, e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    handleEnd();
  };

  const baseSize = MAX_REACH * 2 + KNOB_RADIUS;
  const halfBase = baseSize / 2;

  return (
    <div
      className="absolute inset-0 select-none"
      style={{
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Joystick base circle — positioned at touch point */}
      <div
        ref={baseRef}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: baseSize,
          height: baseSize,
          marginLeft: -halfBase,
          marginTop: -halfBase,
          left: 0,
          top: 0,
          opacity: visible ? 1 : 0,
          transition: visible ? 'opacity 0.12s ease-out' : 'none',
          background: 'radial-gradient(circle, rgba(30,40,70,0.45) 0%, rgba(20,25,45,0.65) 70%, transparent 100%)',
          border: '2px solid rgba(80,120,200,0.35)',
          boxShadow: '0 0 20px rgba(50,100,200,0.15), inset 0 0 15px rgba(0,0,0,0.4)',
        }}
      >
        <div className="absolute rounded-full pointer-events-none"
          style={{ inset: 18, border: '1px dashed rgba(100,140,220,0.22)' }}
        />
      </div>

      {/* Knob — follows finger */}
      <div
        ref={knobRef}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          marginLeft: -KNOB_RADIUS,
          marginTop: -KNOB_RADIUS,
          left: 0,
          top: 0,
          opacity: visible ? 1 : 0,
          transition: visible ? 'opacity 0.12s ease-out' : 'none',
          background: 'radial-gradient(circle at 35% 35%, rgba(110,180,255,0.95) 0%, rgba(55,110,220,0.95) 60%, rgba(30,65,170,1) 100%)',
          border: '2px solid rgba(140,200,255,0.7)',
          boxShadow: '0 0 18px rgba(70,140,255,0.55), inset 0 2px 6px rgba(255,255,255,0.18)',
        }}
      />
    </div>
  );
}
