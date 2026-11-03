import { Joystick } from './Joystick';
import { SkillButton } from './SkillButton';
import { HealthBar } from './HealthBar';
import { CameraDragZone } from './CameraDragZone';
import { ShiftLockButton } from './ShiftLockButton';
import { CombatState, SkillId, WeaponCategory, WEAPON_CATEGORIES, WEAPON_LABELS, getSkillsByCategory } from '@/game/types';
import { Crosshair, Zap, Flame, Sword, Music, Feather, Sparkles } from 'lucide-react';

interface DamageNumberData {
  id: number;
  amount: number;
  isCrit: boolean;
  screenX: number;
  screenY: number;
  life: number;
}

interface HUDProps {
  state: CombatState;
  damageNumbers: DamageNumberData[];
  shiftLock: boolean;
  aimActive: boolean;
  v4Active: boolean;
  flying: boolean;
  onMove: (x: number, z: number) => void;
  onJump: () => void;
  onDash: () => void;
  onSkill: (skill: SkillId) => void;
  onCameraRotate: (deltaX: number, deltaY: number) => void;
  onToggleShiftLock: () => void;
  onToggleAim: () => void;
  onSelectWeapon: (weapon: WeaponCategory) => void;
  onToggleV4: () => void;
}

const WEAPON_ICONS: Record<WeaponCategory, typeof Crosshair> = {
  melee: Zap,
  fruit: Flame,
  sword: Sword,
  gun: Music,
};

const WEAPON_COLORS: Record<WeaponCategory, string> = {
  melee: '#ff4433',
  fruit: '#33aaff',
  sword: '#aa44ff',
  gun: '#66ffcc',
};

export function HUD({
  state, damageNumbers, shiftLock, aimActive, v4Active, flying,
  onMove, onJump, onDash, onSkill, onCameraRotate,
  onToggleShiftLock, onToggleAim, onSelectWeapon, onToggleV4,
}: HUDProps) {
  const activeSkills = getSkillsByCategory(state.activeWeapon);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Camera drag zone */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <CameraDragZone onRotate={onCameraRotate} />
      </div>

      {/* Left side: joystick */}
      <div className="absolute top-0 bottom-0" style={{ left: 0, width: '42%', zIndex: 15 }}>
        <Joystick onMove={onMove} />
      </div>

      {/* Top-center: health bars + Sky Race icon */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none" style={{ zIndex: 5 }}>
        {/* Sky Race badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-md"
          style={{
            background: v4Active
              ? 'radial-gradient(circle, rgba(50,170,255,0.9) 0%, rgba(20,100,200,0.8) 100%)'
              : 'rgba(20,30,50,0.7)',
            border: v4Active ? '1.5px solid #33ddff' : '1px solid rgba(80,140,220,0.4)',
            boxShadow: v4Active ? '0 0 10px rgba(50,170,255,0.6)' : 'none',
          }}
        >
          <Feather size={14} className="text-white" />
          <span className="text-[9px] font-bold text-white leading-none">SKY</span>
          {v4Active && <Sparkles size={12} className="text-cyan-200" />}
        </div>

        <HealthBar
          label="Player"
          current={state.health}
          max={state.maxHealth}
          color="#33aaff"
          align="left"
        />
        <HealthBar
          label="Dummy"
          current={state.dummyHealth}
          max={state.dummyMaxHealth}
          color="#ff6633"
          align="right"
        />
      </div>

      {/* Aim button — top-left */}
      <div className="absolute pointer-events-auto" style={{ top: 12, left: 12, zIndex: 16 }}>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg select-none transition-all duration-150"
          style={{
            background: aimActive
              ? 'radial-gradient(circle, rgba(255,180,40,0.9) 0%, rgba(200,120,20,0.9) 100%)'
              : 'radial-gradient(circle, rgba(40,50,80,0.7) 0%, rgba(20,25,45,0.8) 100%)',
            border: aimActive ? '2px solid #ffcc44' : '2px solid rgba(80,120,200,0.4)',
            boxShadow: aimActive ? '0 0 12px rgba(255,180,40,0.5)' : '0 0 6px rgba(50,100,200,0.15)',
            touchAction: 'none',
          }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleAim(); }}
        >
          <Crosshair size={16} className={aimActive ? 'text-white' : 'text-white/70'} />
          <span className="text-xs font-bold text-white drop-shadow">{aimActive ? 'AIM ON' : 'AIM'}</span>
        </button>
      </div>

      {/* V4 Awakening button — top-left, below Aim */}
      <div className="absolute pointer-events-auto" style={{ top: 56, left: 12, zIndex: 16 }}>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg select-none transition-all duration-150"
          style={{
            background: v4Active
              ? 'radial-gradient(circle, rgba(50,170,255,0.95) 0%, rgba(20,100,220,0.9) 100%)'
              : 'radial-gradient(circle, rgba(40,50,80,0.7) 0%, rgba(20,25,45,0.8) 100%)',
            border: v4Active ? '2px solid #33ddff' : '2px solid rgba(80,140,220,0.5)',
            boxShadow: v4Active ? '0 0 16px rgba(50,170,255,0.7)' : '0 0 6px rgba(50,100,200,0.15)',
            touchAction: 'none',
          }}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleV4(); }}
        >
          <Sparkles size={16} className="text-white" />
          <span className="text-xs font-bold text-white drop-shadow">
            {v4Active ? `V4 ${state.v4Timer.toFixed(1)}s` : 'V4'}
          </span>
        </button>
      </div>

      {/* Flying indicator */}
      {flying && (
        <div className="absolute top-28 left-12 pointer-events-none" style={{ zIndex: 16 }}>
          <div className="px-2 py-1 rounded-md text-[10px] font-bold text-cyan-200"
            style={{ background: 'rgba(50,170,255,0.3)', border: '1px solid rgba(80,200,255,0.5)' }}>
            FLYING — double-tap jump to land
          </div>
        </div>
      )}

      {/* Shift Lock status */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 5 }}>
        {shiftLock && (
          <div className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(255,180,40,0.3)', border: '1px solid rgba(255,200,60,0.5)' }}>
            SHIFT LOCK ON
          </div>
        )}
      </div>

      {/* Floating damage numbers */}
      {damageNumbers.map((dn) => (
        <div
          key={dn.id}
          className="absolute font-bold pointer-events-none select-none"
          style={{
            left: dn.screenX, top: dn.screenY,
            transform: 'translate(-50%, -50%)',
            color: dn.isCrit ? '#ffdd33' : '#ffffff',
            fontSize: dn.isCrit ? '28px' : '20px',
            opacity: Math.min(1, dn.life / 0.3),
            textShadow: dn.isCrit
              ? '0 0 8px #ff9900, 0 2px 4px rgba(0,0,0,0.8)'
              : '0 0 4px #ff4444, 0 2px 3px rgba(0,0,0,0.8)',
            zIndex: 20,
          }}
        >
          {dn.isCrit ? 'CRIT! ' : ''}{dn.amount}
        </div>
      ))}

      {/* Bottom-right: weapon switcher + action buttons + skill grid */}
      <div className="absolute pointer-events-auto flex flex-col items-end gap-1.5" style={{ bottom: 12, right: 12, zIndex: 15 }}>
        {/* Weapon category tabs */}
        <div className="flex gap-1">
          {WEAPON_CATEGORIES.map((cat) => {
            const Icon = WEAPON_ICONS[cat];
            const isActive = state.activeWeapon === cat;
            const color = WEAPON_COLORS[cat];
            return (
              <button
                key={cat}
                className="flex flex-col items-center justify-center rounded-md select-none transition-all duration-100"
                style={{
                  width: 40, height: 36,
                  background: isActive
                    ? `radial-gradient(circle, ${color}cc 0%, ${color}77 100%)`
                    : 'rgba(20,25,45,0.7)',
                  border: isActive ? `1.5px solid ${color}` : '1.5px solid rgba(80,120,200,0.3)',
                  boxShadow: isActive ? `0 0 8px ${color}66` : 'none',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelectWeapon(cat); }}
              >
                <Icon size={16} className="text-white" style={{ opacity: isActive ? 1 : 0.6 }} />
                <span className="text-[7px] font-bold text-white leading-none mt-0.5" style={{ opacity: isActive ? 1 : 0.5 }}>
                  {WEAPON_LABELS[cat]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row: Shift Lock + Dash + Jump */}
        <div className="flex items-center gap-1.5">
          <ShiftLockButton active={shiftLock} onToggle={onToggleShiftLock} />
          <SkillButton
            label="Dash"
            subLabel="evade"
            color="#2244aa"
            glow="#4488ff"
            cooldown={state.dashCooldown}
            maxCooldown={state.dashMaxCooldown}
            onPress={onDash}
            size="sm"
          />
          <SkillButton
            label="Jump"
            subLabel={v4Active ? '2x tap=fly' : 'leap'}
            color="#2266aa"
            glow="#44aaff"
            cooldown={0}
            maxCooldown={1}
            onPress={onJump}
            size="sm"
          />
        </div>

        {/* Active weapon skills — compact grid */}
        <div className="flex flex-wrap gap-1.5 justify-end" style={{ maxWidth: 180 }}>
          {activeSkills.map((s) => {
            const colorStr = `#${s.color.toString(16).padStart(6, '0')}`;
            return (
              <SkillButton
                key={s.id}
                label={s.shortName}
                subLabel={s.displayName}
                color={colorStr}
                glow={`${colorStr}ff`}
                cooldown={state.cooldowns[s.id]}
                maxCooldown={state.maxCooldowns[s.id]}
                onPress={() => onSkill(s.id)}
                size="sm"
              />
            );
          })}
        </div>
      </div>

      {/* Title watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-5" style={{ zIndex: 1 }}>
        <h1 className="text-6xl font-black text-white tracking-widest">BLOX COMBAT 3D</h1>
      </div>
    </div>
  );
}
