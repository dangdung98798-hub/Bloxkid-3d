import * as THREE from 'three';
import { Engine } from './Engine';
import { Entity } from './Entity';
import { ParticleSystem } from './ParticleSystem';
import { ARENA } from './Environment';
import { SKILLS, SkillId } from './types';

export interface DamageEvent {
  targetId: number;
  amount: number;
  isCrit: boolean;
  position: THREE.Vector3;
}

type ProjectileType = 'fox_fire' | 'rapid_flame' | 'crescent' | 'stun_bullet' | 'sound_blast';

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  type: ProjectileType;
  damage: number;
  life: number;
  pierce: boolean;
  hitEntities: Set<number>;
  color: number;
  homing: boolean;
  spin: number;
  knockback: number;
  stunOnHit: number;
}

interface DamageNumberEntry {
  id: number;
  amount: number;
  isCrit: boolean;
  worldPos: THREE.Vector3;
  screenX: number;
  screenY: number;
  life: number;
  vy: number;
}

let dmgNumId = 0;

export class CombatSystem {
  private engine: Engine;
  private particles: ParticleSystem;
  private projectiles: Projectile[] = [];
  public damageNumbers: DamageNumberEntry[] = [];
  public onDamage?: (event: DamageEvent) => void;

  constructor(engine: Engine, particles: ParticleSystem) {
    this.engine = engine;
    this.particles = particles;
  }

  private aimAtDummy = false;

  useSkill(
    skill: SkillId,
    attacker: Entity,
    target: Entity,
    cooldowns: Record<SkillId, number>,
    aimAtDummy: boolean,
  ): void {
    if (cooldowns[skill] > 0) return;
    const cfg = SKILLS[skill];
    cooldowns[skill] = cfg.cooldown;

    this.aimAtDummy = aimAtDummy;

    // If aim at dummy, face the dummy before executing
    if (aimAtDummy) {
      attacker.faceTowards(target.position);
    }

    switch (skill) {
      case 'melee_dash_punch': this.meleeDashPunch(attacker, target); break;
      case 'melee_combo': this.meleeCombo(attacker, target); break;
      case 'melee_ground_slam': this.meleeGroundSlam(attacker, target); break;
      case 'fruit_fox_fire': this.fruitFoxFire(attacker, target); break;
      case 'fruit_rapid_flame': this.fruitRapidFlame(attacker, target); break;
      case 'fruit_teleport': this.fruitTeleport(attacker, target); break;
      case 'fruit_explosion': this.fruitExplosion(attacker, target); break;
      case 'fruit_awakening': this.fruitAwakening(attacker, target); break;
      case 'sword_crescent': this.swordCrescent(attacker, target); break;
      case 'sword_flurry': this.swordFlurry(attacker, target); break;
      case 'gun_stun_bullet': this.gunStunBullet(attacker, target); break;
      case 'gun_sound_blast': this.gunSoundBlast(attacker, target); break;
    }
  }

  // ═══════════════════════════════════════════
  // MELEE (3 skills)
  // ═══════════════════════════════════════════

  private meleeDashPunch(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.melee_dash_punch;
    const forward = attacker.getForward();
    attacker.velocity.x = forward.x * 25;
    attacker.velocity.z = forward.z * 25;

    // Cast effect at attacker
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.25, gravity: 1,
    });

    const hitPos = attacker.position.clone().add(forward.clone().multiplyScalar(2.5));
    hitPos.y += 1.5;
    const dist = attacker.position.distanceTo(target.position);
    if (dist < 6) {
      const dmg = cfg.damage * (0.85 + Math.random() * 0.3);
      const isCrit = Math.random() < 0.25;
      const final = isCrit ? dmg * 2 : dmg;
      target.takeDamage(final, forward.clone().multiplyScalar(20));
      this.spawnDamageNumber(target, final, isCrit);
      this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: hitPos.clone() });
    }
    this.particles.burst(hitPos, { color: cfg.color, count: 4, speed: 6, size: 0.5, lifetime: 0.3, gravity: 2 });
  }

  private meleeCombo(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.melee_combo;
    const forward = attacker.getForward();

    // Cast effect — initial swing
    this.spawnSlashEffect(attacker, cfg.color, 1.5);
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.25, gravity: 1,
    });

    // 5 rapid hits with visible slash effects
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const currentDist = attacker.position.distanceTo(target.position);
        const hitPos = attacker.position.clone().add(attacker.getForward().clone().multiplyScalar(2.5));
        hitPos.y += 1.5;

        // Always show slash visual regardless of distance
        this.spawnSlashEffect(attacker, cfg.color, 1.8);
        this.particles.burst(hitPos, { color: cfg.color, count: 3, speed: 5, size: 0.4, lifetime: 0.2, gravity: 2 });

        if (currentDist > 6) return;
        if (currentDist < 5.5) {
          const dmg = cfg.damage * 0.25 * (0.8 + Math.random() * 0.4);
          target.takeDamage(dmg, attacker.getForward().clone().multiplyScalar(8));
          this.spawnDamageNumber(target, dmg, false);
        }
      }, i * 100);
    }

    // Heavy smash at end with shockwave
    setTimeout(() => {
      const currentDist = attacker.position.distanceTo(target.position);
      const hitPos = attacker.position.clone().add(attacker.getForward().clone().multiplyScalar(2.5));
      hitPos.y += 1.5;

      // Big slash + shockwave always visible
      this.spawnSlashEffect(attacker, cfg.color, 3.0);
      this.spawnShockwave(hitPos, cfg.color, 4);
      this.particles.burst(hitPos, { color: cfg.color, count: 5, speed: 8, size: 0.6, lifetime: 0.4, gravity: 2 });

      if (currentDist > 7) return;
      if (currentDist < 6) {
        const dmg = cfg.damage * 0.6;
        const isCrit = Math.random() < 0.3;
        const final = isCrit ? dmg * 2 : dmg;
        target.takeDamage(final, attacker.getForward().clone().multiplyScalar(25));
        this.spawnDamageNumber(target, final, isCrit);
        this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: hitPos.clone() });
      }
    }, 550);
  }

  private meleeGroundSlam(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.melee_ground_slam;

    // Cast effect
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.25, gravity: 1,
    });

    // Jump up then slam
    attacker.velocity.y = 14;
    setTimeout(() => {
      // Slam down
      attacker.velocity.y = -25;
      const slamPos = attacker.position.clone();
      slamPos.y = 0;

      // AoE check — re-check distance at slam time
      const dist = attacker.position.distanceTo(target.position);
      if (dist < 7) {
        const dmg = cfg.damage * (0.85 + Math.random() * 0.3);
        const isCrit = Math.random() < 0.25;
        const final = isCrit ? dmg * 2 : dmg;
        const knockDir = target.position.clone().sub(attacker.position);
        knockDir.y = 0;
        knockDir.normalize().multiplyScalar(22);
        target.takeDamage(final, knockDir);
        this.spawnDamageNumber(target, final, isCrit);
        this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: slamPos.clone() });
      }
      // Shockwave particles
      this.particles.burst(slamPos, { color: cfg.color, count: 6, speed: 10, size: 0.6, lifetime: 0.5, gravity: 1 });
    }, 300);
  }

  // ═══════════════════════════════════════════
  // FRUIT - KITSUNE (5 skills)
  // ═══════════════════════════════════════════

  private fruitFoxFire(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.fruit_fox_fire;
    const forward = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Cast effect at hands
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.25, gravity: 0,
    });

    const startPos = attacker.position.clone().add(forward.clone().multiplyScalar(1.5));
    startPos.y += 1.8;

    const geo = new THREE.SphereGeometry(0.5, 5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(startPos);
    this.engine.scene.add(sphere);

    this.projectiles.push({
      mesh: sphere, velocity: forward.clone().multiplyScalar(24), type: 'fox_fire',
      damage: cfg.damage, life: 5, pierce: false, hitEntities: new Set(),
      color: cfg.color, homing: true, spin: 0, knockback: 10, stunOnHit: 0,
    });
  }

  private fruitRapidFlame(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.fruit_rapid_flame;
    const baseDir = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Cast effect
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.2, gravity: 0,
    });

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const startPos = attacker.position.clone().add(baseDir.clone().multiplyScalar(1.5));
        startPos.y += 1.5;
        const spread = 0.15;
        const dir = baseDir.clone();
        dir.x += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();

        const geo = new THREE.SphereGeometry(0.3, 4, 3);
        const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        this.engine.scene.add(mesh);

        this.projectiles.push({
          mesh, velocity: dir.multiplyScalar(30), type: 'rapid_flame',
          damage: cfg.damage, life: 2, pierce: false, hitEntities: new Set(),
          color: cfg.color, homing: false, spin: 0, knockback: 5, stunOnHit: 0,
        });
      }, i * 80);
    }
  }

  private fruitTeleport(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.fruit_teleport;

    // Trail particles at start
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 4, speed: 6, size: 0.5, lifetime: 0.4, gravity: 0,
    });

    // Teleport behind/near dummy — max range 20
    const distToTarget = attacker.position.distanceTo(target.position);
    if (distToTarget > 20) {
      // Too far, just dash forward instead
      const fwd = attacker.getForward();
      attacker.position.add(fwd.multiplyScalar(8));
      this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
        color: cfg.color, count: 4, speed: 6, size: 0.5, lifetime: 0.4, gravity: 0,
      });
      return;
    }

    const dir = target.position.clone().sub(attacker.position);
    dir.y = 0;
    dir.normalize();
    const teleportPos = target.position.clone().sub(dir.multiplyScalar(4));
    teleportPos.y = 0;
    attacker.position.copy(teleportPos);
    attacker.faceTowards(target.position);

    // Strike damage — re-check distance after teleport
    const dist = attacker.position.distanceTo(target.position);
    if (dist < 6) {
      const dmg = cfg.damage * (0.85 + Math.random() * 0.3);
      const isCrit = Math.random() < 0.3;
      const final = isCrit ? dmg * 2 : dmg;
      const strikeDir = target.position.clone().sub(attacker.position);
      strikeDir.y = 0;
      strikeDir.normalize().multiplyScalar(15);
      target.takeDamage(final, strikeDir);
      this.spawnDamageNumber(target, final, isCrit);
      this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: target.position.clone().add(new THREE.Vector3(0, 2, 0)) });
    }

    // Trail particles at arrival
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 4, speed: 6, size: 0.5, lifetime: 0.4, gravity: 0,
    });
  }

  private fruitExplosion(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.fruit_explosion;
    const forward = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Cast effect at attacker — charging up
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      color: cfg.color, count: 4, speed: 5, size: 0.5, lifetime: 0.3, gravity: 0,
    });

    // Launch a visible giant fox-fire ball toward target
    const startPos = attacker.position.clone().add(forward.clone().multiplyScalar(1.5));
    startPos.y += 2;
    const geo = new THREE.SphereGeometry(0.9, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const ball = new THREE.Mesh(geo, mat);
    ball.position.copy(startPos);
    this.engine.scene.add(ball);

    this.projectiles.push({
      mesh: ball, velocity: forward.clone().multiplyScalar(22), type: 'fox_fire',
      damage: cfg.damage, life: 3, pierce: false, hitEntities: new Set(),
      color: cfg.color, homing: this.aimAtDummy, spin: 0, knockback: 25, stunOnHit: 0,
    });

    // Schedule the big explosion after travel time
    const dist = attacker.position.distanceTo(target.position);
    const travelTime = Math.min(dist / 22, 1.5) * 1000;
    setTimeout(() => {
      if (target.health <= 0) return;

      // Explosion center: where the ball actually is (not necessarily at target)
      const center = ball.position.clone();

      // Big explosion visual
      this.particles.burst(center, { color: cfg.color, count: 8, speed: 14, size: 0.8, lifetime: 0.6, gravity: 2 });
      this.particles.burst(center, { color: 0x88ddff, count: 5, speed: 8, size: 0.5, lifetime: 0.4, gravity: 1 });
      this.spawnShockwave(center, cfg.color, 5);

      // AoE damage — only if dummy is within explosion radius (5 units)
      const dummyDist = center.distanceTo(target.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
      if (dummyDist < 5) {
        const dmg = cfg.damage * (0.85 + Math.random() * 0.3);
        const isCrit = Math.random() < 0.2;
        const final = isCrit ? dmg * 2 : dmg;
        const knockDir = target.position.clone().sub(center);
        knockDir.y = 0;
        if (knockDir.length() < 0.1) knockDir.set(0, 0, 1);
        knockDir.normalize().multiplyScalar(25);
        target.takeDamage(final, knockDir);
        this.spawnDamageNumber(target, final, isCrit);
        this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: center.clone() });
      }
    }, travelTime);
  }

  private fruitAwakening(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.fruit_awakening;

    // Cast effect — big burst at attacker
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      color: cfg.color, count: 6, speed: 10, size: 0.7, lifetime: 0.5, gravity: 0,
    });

    // Multi-stage burn: 5 ticks over 5 seconds
    const burnPerTick = cfg.damage / 5;
    target.burning = true;
    target.burnTimer = 5;

    for (let i = 1; i <= 5; i++) {
      setTimeout(() => {
        if (target.health <= 0) return;
        const isCrit = i === 5 && Math.random() < 0.5;
        const dmg = isCrit ? burnPerTick * 2 : burnPerTick;
        target.takeDamage(dmg, new THREE.Vector3(0, 0, 0));
        this.spawnDamageNumber(target, dmg, isCrit);
        this.onDamage?.({
          targetId: target.id, amount: dmg, isCrit,
          position: target.position.clone().add(new THREE.Vector3(0, 2, 0)),
        });
        this.particles.burst(target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
          color: cfg.color, count: 4, speed: 5, size: 0.6, lifetime: 0.5, gravity: 1,
        });
      }, i * 1000);
    }

    // Initial burst
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 8, speed: 12, size: 0.8, lifetime: 0.6, gravity: 0,
    });
  }

  // ═══════════════════════════════════════════
  // SWORD - YAMA (2 skills)
  // ═══════════════════════════════════════════

  private swordCrescent(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.sword_crescent;
    const forward = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Cast slash effect at attacker
    this.particles.burst(attacker.position.clone().add(forward.clone().multiplyScalar(1)), {
      color: cfg.color, count: 3, speed: 5, size: 0.4, lifetime: 0.25, gravity: 0,
    });

    const startPos = attacker.position.clone().add(forward.clone().multiplyScalar(1.5));
    startPos.y += 1.5;

    const geo = new THREE.TorusGeometry(1.4, 0.4, 4, 8, Math.PI);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const crescent = new THREE.Mesh(geo, mat);
    crescent.position.copy(startPos);
    crescent.rotation.y = attacker.facingAngle;
    crescent.rotation.x = Math.PI / 2;
    this.engine.scene.add(crescent);

    this.projectiles.push({
      mesh: crescent, velocity: forward.clone().multiplyScalar(18), type: 'crescent',
      damage: cfg.damage, life: 3, pierce: true, hitEntities: new Set(),
      color: cfg.color, homing: false, spin: 0, knockback: 15, stunOnHit: 0,
    });
  }

  private swordFlurry(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.sword_flurry;
    const forward = attacker.getForward();

    // Cast effect
    this.particles.burst(attacker.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
      color: cfg.color, count: 3, speed: 5, size: 0.4, lifetime: 0.25, gravity: 0,
    });

    // Dash through enemies with multiple slashes
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        // Move attacker forward rapidly
        attacker.velocity.x = forward.x * 28;
        attacker.velocity.z = forward.z * 28;

        const hitPos = attacker.position.clone().add(forward.clone().multiplyScalar(2));
        hitPos.y += 1.5;
        const dist = attacker.position.distanceTo(target.position);
        if (dist < 5) {
          const dmg = cfg.damage * 0.3 * (0.8 + Math.random() * 0.4);
          const isCrit = Math.random() < 0.2;
          const final = isCrit ? dmg * 2 : dmg;
          target.takeDamage(final, forward.clone().multiplyScalar(12));
          this.spawnDamageNumber(target, final, isCrit);
        }
        this.particles.burst(hitPos, { color: cfg.color, count: 3, speed: 6, size: 0.5, lifetime: 0.3, gravity: 1 });
      }, i * 120);
    }
  }

  // ═══════════════════════════════════════════
  // GUN - SOUL GUITAR (2 skills)
  // ═══════════════════════════════════════════

  private gunStunBullet(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.gun_stun_bullet;
    const forward = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Muzzle flash effect
    this.particles.burst(attacker.position.clone().add(forward.clone().multiplyScalar(1)), {
      color: cfg.color, count: 3, speed: 4, size: 0.35, lifetime: 0.2, gravity: 0,
    });

    const startPos = attacker.position.clone().add(forward.clone().multiplyScalar(1.2));
    startPos.y += 2;

    const geo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const bullet = new THREE.Mesh(geo, mat);
    bullet.position.copy(startPos);
    bullet.lookAt(startPos.clone().add(forward));
    bullet.rotateX(Math.PI / 2);
    this.engine.scene.add(bullet);

    this.projectiles.push({
      mesh: bullet, velocity: forward.clone().multiplyScalar(42), type: 'stun_bullet',
      damage: cfg.damage, life: 2, pierce: false, hitEntities: new Set(),
      color: cfg.color, homing: false, spin: 0, knockback: 5, stunOnHit: 1.5,
    });
  }

  private gunSoundBlast(attacker: Entity, target: Entity): void {
    const cfg = SKILLS.gun_sound_blast;
    const forward = this.aimAtDummy
      ? this.aimDir3D(attacker, target)
      : attacker.getForward();

    // Cast effect
    this.particles.burst(attacker.position.clone().add(forward.clone().multiplyScalar(1)), {
      color: cfg.color, count: 3, speed: 4, size: 0.4, lifetime: 0.25, gravity: 0,
    });

    const startPos = attacker.position.clone().add(forward.clone().multiplyScalar(1.5));
    startPos.y += 1.5;

    // Wide sound wave
    const geo = new THREE.SphereGeometry(0.8, 5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const wave = new THREE.Mesh(geo, mat);
    wave.position.copy(startPos);
    this.engine.scene.add(wave);

    this.projectiles.push({
      mesh: wave, velocity: forward.clone().multiplyScalar(20), type: 'sound_blast',
      damage: cfg.damage, life: 1.5, pierce: true, hitEntities: new Set(),
      color: cfg.color, homing: false, spin: 0, knockback: 30, stunOnHit: 0.5,
    });
  }

  // ── Shared helpers ──

  private spawnSlashEffect(attacker: Entity, color: number, scale: number): void {
    const forward = attacker.getForward();
    const pos = attacker.position.clone().add(forward.clone().multiplyScalar(1.5));
    pos.y += 1.5;
    const geo = new THREE.RingGeometry(0.3 * scale, 1.0 * scale, 6, 1, 0, Math.PI * 1.2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const slash = new THREE.Mesh(geo, mat);
    slash.position.copy(pos);
    slash.rotation.y = attacker.facingAngle;
    slash.rotation.x = Math.PI / 2;
    this.engine.scene.add(slash);
    setTimeout(() => {
      this.engine.scene.remove(slash);
      mat.dispose();
      geo.dispose();
    }, 200);
  }

  private spawnShockwave(pos: THREE.Vector3, color: number, radius: number): void {
    const geo = new THREE.RingGeometry(0.5, 0.8, 12);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI / 2;
    this.engine.scene.add(ring);
    let life = 0.4;
    const expand = () => {
      life -= 0.016;
      if (life <= 0) {
        this.engine.scene.remove(ring);
        mat.dispose();
        geo.dispose();
        return;
      }
      const s = 1 + (0.4 - life) * radius * 2;
      ring.scale.setScalar(s);
      mat.opacity = life / 0.4 * 0.7;
      requestAnimationFrame(expand);
    };
    expand();
  }

  private aimDir3D(attacker: Entity, target: Entity): THREE.Vector3 {
    const dir = target.position.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(attacker.position);
    if (dir.length() < 0.1) return new THREE.Vector3(0, 0, 1);
    return dir.normalize();
  }

  spawnDamageNumberPublic(target: Entity, amount: number, isCrit: boolean): void {
    this.spawnDamageNumber(target, amount, isCrit);
  }

  private spawnDamageNumber(target: Entity, amount: number, isCrit: boolean): void {
    const pos = target.position.clone();
    pos.y += 3.5;
    pos.x += (Math.random() - 0.5) * 2;
    pos.z += (Math.random() - 0.5) * 1;
    this.damageNumbers.push({
      id: dmgNumId++, amount: Math.round(amount), isCrit,
      worldPos: pos, screenX: 0, screenY: 0, life: 1.2, vy: 60,
    });
  }

  updateProjectiles(dt: number, target: Entity): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;
      proj.spin += dt * 5;

      // Homing
      if (proj.homing) {
        const toTarget = target.position.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(proj.mesh.position);
        toTarget.normalize();
        proj.velocity.lerp(toTarget.multiplyScalar(proj.velocity.length()), dt * 3);
      }

      // Move
      proj.mesh.position.x += proj.velocity.x * dt;
      proj.mesh.position.y += proj.velocity.y * dt;
      proj.mesh.position.z += proj.velocity.z * dt;

      // Sound blast grows
      if (proj.type === 'sound_blast') {
        proj.mesh.scale.multiplyScalar(1 + dt * 2);
        (proj.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.98;
      }

      // Spin for crescent
      if (proj.type === 'crescent') {
        proj.mesh.rotation.z = proj.spin;
      }

      // Gravity for fox fire
      if (proj.type === 'fox_fire') {
        proj.velocity.y -= 2 * dt;
      }

      // Collision
      const targetCenter = target.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const dist = proj.mesh.position.distanceTo(targetCenter);
      const hitDist = proj.type === 'crescent' ? 2.8 : proj.type === 'sound_blast' ? 3.5 : 2.0;

      if (dist < hitDist && !proj.hitEntities.has(target.id)) {
        proj.hitEntities.add(target.id);
        const dmg = proj.damage * (0.85 + Math.random() * 0.3);
        const isCrit = Math.random() < 0.2;
        const final = isCrit ? dmg * 2 : dmg;
        const knockbackDir = proj.velocity.clone().setY(0).normalize().multiplyScalar(proj.knockback);

        target.takeDamage(final, knockbackDir);

        if (proj.stunOnHit > 0) {
          target.stunned = true;
          target.stunTimer = proj.stunOnHit;
        }

        this.particles.burst(proj.mesh.position.clone(), { color: proj.color, count: 4, speed: 5, size: 0.5, lifetime: 0.3 });
        this.spawnDamageNumber(target, final, isCrit);
        this.onDamage?.({ targetId: target.id, amount: final, isCrit, position: proj.mesh.position.clone() });

        if (!proj.pierce) {
          this.removeProjectile(i);
          continue;
        }
      }

      // Out of bounds or expired
      if (
        proj.life <= 0 ||
        proj.mesh.position.x < ARENA.minX || proj.mesh.position.x > ARENA.maxX ||
        proj.mesh.position.z < ARENA.minZ || proj.mesh.position.z > ARENA.maxZ ||
        proj.mesh.position.y < -2
      ) {
        this.removeProjectile(i);
      }
    }
  }

  private removeProjectile(index: number): void {
    const proj = this.projectiles[index];
    this.engine.scene.remove(proj.mesh);
    (proj.mesh.material as THREE.Material).dispose();
    (proj.mesh.geometry as THREE.BufferGeometry).dispose();
    this.projectiles.splice(index, 1);
  }

  updateDamageNumbers(dt: number, camera: THREE.Camera, container: HTMLElement): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
        continue;
      }
      dn.worldPos.y += dn.vy * dt;
      dn.vy *= 0.92;
      const screen = dn.worldPos.clone().project(camera);
      dn.screenX = (screen.x * 0.5 + 0.5) * container.clientWidth;
      dn.screenY = (-screen.y * 0.5 + 0.5) * container.clientHeight;
    }
  }

  dispose(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }
    this.damageNumbers = [];
  }
}
