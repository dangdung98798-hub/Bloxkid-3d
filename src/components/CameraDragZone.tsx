import { useRef } from 'react';

interface CameraDragZoneProps {
  onRotate: (deltaX: number, deltaY: number) => void;
}

export function CameraDragZone({ onRotate }: CameraDragZoneProps) {
  const activeRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Do NOT use setPointerCapture — allows multi-touch with joystick
    activeRef.current = true;
    pointerIdRef.current = e.pointerId;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeRef.current || pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - lastXRef.current;
    const dy = e.clientY - lastYRef.current;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
    onRotateRef.current(dx, dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current === e.pointerId) {
      activeRef.current = false;
      pointerIdRef.current = null;
    }
  };

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
