import { useRef, useEffect, useState, useCallback } from 'react';
import { Game } from '@/game/Game';
import { CombatState, SkillId, WeaponCategory, InputState, createCooldownMap, createMaxCooldownMap } from '@/game/types';
import { HUD } from '@/components/HUD';

interface DamageNumberData {
  id: number;
  amount: number;
  isCrit: boolean;
  screenX: number;
  screenY: number;
  life: number;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const inputRef = useRef<InputState>({
    moveX: 0, moveZ: 0, jump: false, dash: false, skill: null, aimAtDummy: false, toggleV4: false,
  });

  const [state, setState] = useState<CombatState>({
    health: 100, maxHealth: 100,
    dummyHealth: 300, dummyMaxHealth: 300,
    cooldowns: createCooldownMap(),
    maxCooldowns: createMaxCooldownMap(),
    dashCooldown: 0, dashMaxCooldown: 0.2,
    activeWeapon: 'melee',
    v4Active: false, v4Timer: 0, v4MaxTime: 15,
    flying: false,
  });

  const [damageNumbers, setDamageNumbers] = useState<DamageNumberData[]>([]);
  const [shiftLock, setShiftLock] = useState(false);
  const [aimActive, setAimActive] = useState(false);
  const [v4Active, setV4Active] = useState(false);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Game(containerRef.current, {
      onStateChange: (s) => {
        setState(s);
        setV4Active(s.v4Active);
        setFlying(s.flying);
      },
    });
    gameRef.current = game;
    game.start();

    let raf: number;
    let lastDnLen = 0;
    const pollDamage = () => {
      const dn = game.getDamageNumbers();
      if (dn.length > 0) {
        if (dn.length !== lastDnLen || dn.some(d => d.life > 0.9)) {
          setDamageNumbers(dn.map((d) => ({
            id: d.id, amount: d.amount, isCrit: d.isCrit,
            screenX: d.screenX, screenY: d.screenY, life: d.life,
          })));
        }
        lastDnLen = dn.length;
      } else if (lastDnLen > 0) {
        setDamageNumbers([]);
        lastDnLen = 0;
      }
      raf = requestAnimationFrame(pollDamage);
    };
    raf = requestAnimationFrame(pollDamage);

    return () => {
      cancelAnimationFrame(raf);
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const handleMove = useCallback((x: number, z: number) => {
    inputRef.current.moveX = x;
    inputRef.current.moveZ = z;
    gameRef.current?.setInput({ moveX: x, moveZ: z });
  }, []);

  const handleJump = useCallback(() => {
    inputRef.current.jump = true;
    gameRef.current?.setInput({ jump: true });
  }, []);

  const handleDash = useCallback(() => {
    inputRef.current.dash = true;
    gameRef.current?.setInput({ dash: true });
  }, []);

  const handleSkill = useCallback((skill: SkillId) => {
    gameRef.current?.triggerSkill(skill);
  }, []);

  const handleCameraRotate = useCallback((deltaX: number, deltaY: number) => {
    gameRef.current?.rotateCamera(deltaX, deltaY);
  }, []);

  const handleToggleShiftLock = useCallback(() => {
    gameRef.current?.toggleShiftLock();
    setShiftLock(gameRef.current?.isShiftLock() ?? false);
  }, []);

  const handleToggleAim = useCallback(() => {
    gameRef.current?.toggleAim();
    setAimActive(gameRef.current?.isAiming() ?? false);
  }, []);

  const handleSelectWeapon = useCallback((weapon: WeaponCategory) => {
    gameRef.current?.setActiveWeapon(weapon);
  }, []);

  const handleToggleV4 = useCallback(() => {
    inputRef.current.toggleV4 = true;
    gameRef.current?.setInput({ toggleV4: true });
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      <HUD
        state={state}
        damageNumbers={damageNumbers}
        shiftLock={shiftLock}
        aimActive={aimActive}
        v4Active={v4Active}
        flying={flying}
        onMove={handleMove}
        onJump={handleJump}
        onDash={handleDash}
        onSkill={handleSkill}
        onCameraRotate={handleCameraRotate}
        onToggleShiftLock={handleToggleShiftLock}
        onToggleAim={handleToggleAim}
        onSelectWeapon={handleSelectWeapon}
        onToggleV4={handleToggleV4}
      />
    </div>
  );
}

export default App;
