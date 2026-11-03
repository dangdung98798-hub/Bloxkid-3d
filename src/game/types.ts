import * as THREE from 'three';

export type WeaponCategory = 'melee' | 'fruit' | 'sword' | 'gun';

export type SkillId =
  // Melee
  | 'melee_dash_punch' | 'melee_combo' | 'melee_ground_slam'
  // Fruit - Kitsune
  | 'fruit_fox_fire' | 'fruit_rapid_flame' | 'fruit_teleport' | 'fruit_explosion' | 'fruit_awakening'
  // Sword - Yama
  | 'sword_crescent' | 'sword_flurry'
  // Gun - Soul Guitar
  | 'gun_stun_bullet' | 'gun_sound_blast';

export interface SkillConfig {
  id: SkillId;
  category: WeaponCategory;
  slot: number;
  displayName: string;
  shortName: string;
  cooldown: number;
  damage: number;
  color: number;
}

export interface CombatState {
  health: number;
  maxHealth: number;
  dummyHealth: number;
  dummyMaxHealth: number;
  cooldowns: Record<SkillId, number>;
  maxCooldowns: Record<SkillId, number>;
  dashCooldown: number;
  dashMaxCooldown: number;
  activeWeapon: WeaponCategory;
  v4Active: boolean;
  v4Timer: number;
  v4MaxTime: number;
  flying: boolean;
}

export interface InputState {
  moveX: number;
  moveZ: number;
  jump: boolean;
  dash: boolean;
  skill: SkillId | null;
  aimAtDummy: boolean;
  toggleV4: boolean;
}

export const SKILLS: Record<SkillId, SkillConfig> = {
  // ── Melee (3 skills) ──
  melee_dash_punch: { id: 'melee_dash_punch', category: 'melee', slot: 1, displayName: 'Dash Punch', shortName: 'Punch', cooldown: 2, damage: 18, color: 0xff2233 },
  melee_combo: { id: 'melee_combo', category: 'melee', slot: 2, displayName: 'Combo Flurry', shortName: 'Combo', cooldown: 4, damage: 30, color: 0xff4433 },
  melee_ground_slam: { id: 'melee_ground_slam', category: 'melee', slot: 3, displayName: 'Ground Slam', shortName: 'Slam', cooldown: 5, damage: 45, color: 0xff6633 },

  // ── Fruit - Kitsune (5 skills) ──
  fruit_fox_fire: { id: 'fruit_fox_fire', category: 'fruit', slot: 1, displayName: 'Fox Fire', shortName: 'Fire', cooldown: 2, damage: 20, color: 0x33aaff },
  fruit_rapid_flame: { id: 'fruit_rapid_flame', category: 'fruit', slot: 2, displayName: 'Rapid Flame', shortName: 'Rapid', cooldown: 3, damage: 12, color: 0x44bbff },
  fruit_teleport: { id: 'fruit_teleport', category: 'fruit', slot: 3, displayName: 'Teleport Strike', shortName: 'Teleport', cooldown: 4, damage: 28, color: 0x66ccff },
  fruit_explosion: { id: 'fruit_explosion', category: 'fruit', slot: 4, displayName: 'Fox Explosion', shortName: 'Explode', cooldown: 6, damage: 50, color: 0x3388ff },
  fruit_awakening: { id: 'fruit_awakening', category: 'fruit', slot: 5, displayName: 'Awakening', shortName: 'Awaken', cooldown: 10, damage: 80, color: 0x00aaff },

  // ── Sword - Yama (2 skills) ──
  sword_crescent: { id: 'sword_crescent', category: 'sword', slot: 1, displayName: 'Crescent Slash', shortName: 'Slash', cooldown: 3, damage: 35, color: 0xaa44ff },
  sword_flurry: { id: 'sword_flurry', category: 'sword', slot: 2, displayName: 'Slash Flurry', shortName: 'Flurry', cooldown: 5, damage: 50, color: 0xbb55ff },

  // ── Gun - Soul Guitar (2 skills) ──
  gun_stun_bullet: { id: 'gun_stun_bullet', category: 'gun', slot: 1, displayName: 'Stun Bullet', shortName: 'Stun', cooldown: 3, damage: 15, color: 0x66ffcc },
  gun_sound_blast: { id: 'gun_sound_blast', category: 'gun', slot: 2, displayName: 'Sound Blast', shortName: 'Blast', cooldown: 4, damage: 30, color: 0x88ffdd },
};

export const WEAPON_CATEGORIES: WeaponCategory[] = ['melee', 'fruit', 'sword', 'gun'];

export const WEAPON_LABELS: Record<WeaponCategory, string> = {
  melee: 'Melee',
  fruit: 'Fruit',
  sword: 'Sword',
  gun: 'Gun',
};

export function getSkillsByCategory(cat: WeaponCategory): SkillConfig[] {
  return Object.values(SKILLS).filter(s => s.category === cat).sort((a, b) => a.slot - b.slot);
}

export function allSkillIds(): SkillId[] {
  return Object.keys(SKILLS) as SkillId[];
}

export function createCooldownMap(): Record<SkillId, number> {
  const map = {} as Record<SkillId, number>;
  for (const id of allSkillIds()) map[id] = 0;
  return map;
}

export function createMaxCooldownMap(): Record<SkillId, number> {
  const map = {} as Record<SkillId, number>;
  for (const id of allSkillIds()) map[id] = SKILLS[id].cooldown;
  return map;
}
