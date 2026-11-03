import * as THREE from 'three';
import { Engine } from './Engine';
import { Environment, ARENA } from './Environment';
import { Entity } from './Entity';
import { ParticleSystem } from './ParticleSystem';
import { CombatSystem } from './CombatSystem';
import { InputState, SkillId, CombatState, WeaponCategory, createCooldownMap, createMaxCooldownMap, SKILLS } from './types';

export interface GameCallbacks {
  onStateChange: (state: CombatState) => void;
}

const V4_DURATION = 15;
const V4_COOLDOWN = 10;
const V4_AURA_DAMAGE = 2;
const V4_AURA_INTERVAL = 0.5;
const SKY_SPEED_MULT = 1.15;

export class Game {
  private engine: Engine;
  private env: Environment;
  private player: Entity;
  private dummy: Entity;
  private particles: ParticleSystem;
  private combat: CombatSystem;

  private input: InputState = {
    moveX: 0, moveZ: 0, jump: false, dash: false, skill: null, aimAtDummy: false, toggleV4: false,
  };

  private cooldowns = createCooldownMap();
  private maxCooldowns = createMaxCooldownMap();

  private dashCooldown = 0;
  private dashMaxCooldown = 0.1;
  private jumpCount = 0;
  private maxJumps = 10;
  private callbacks: GameCallbacks;
  private container: HTMLElement;
  private stateEmitTimer = 0;
  private stateDirty = true;
  private dummyRespawnTimer = 0;

  private activeWeapon: WeaponCategory = 'melee';
  private aimAtDummy = false;

  // V4 Awakening
  private v4Active = false;
  private v4Timer = 0;
  private v4Cooldown = 0;
  private flying = false;
  private jumpTapTime = 0;
  private jumpTapCount = 0;
  private auraTickTimer = 0;

  // Camera orbit
  private cameraYaw = 0;
  private cameraPitch = 0.45;
  private cameraDist = 16;
  private smoothedCamPos = new THREE.Vector3(0, 12, 16);
  private smoothedLook = new THREE.Vector3(0, 3, 0);

  // Shift lock
  private shiftLock = false;

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.engine = new Engine(container, {
      onUpdate: (dt) => this.update(dt),
      onResize: () => {},
    });

    this.env = new Environment(this.engine);
    this.particles = new ParticleSystem(this.engine);
    this.combat = new CombatSystem(this.engine, this.particles);

    this.player = new Entity(this.engine, -6, 6, {
      color: 0x2244cc, emissive: 0x33aaff, maxHealth: 100, hasWings: true,
    });
    this.player.setFacingAngle(0);

    this.dummy = new Entity(this.engine, 6, -4, {
      color: 0x884422, emissive: 0xff6633, maxHealth: 300,
    });

    this.combat.onDamage = () => { this.stateDirty = true; };
  }

  setInput(input: Partial<InputState>): void {
    Object.assign(this.input, input);
  }

  triggerSkill(skill: SkillId): void {
    // V4 reduces cooldowns by 40%
    if (this.v4Active) {
      const cfg = SKILLS[skill];
      if (this.cooldowns[skill] <= 0) {
        this.cooldowns[skill] = cfg.cooldown * 0.6;
        this.combat.useSkill(skill, this.player, this.dummy, { ...this.cooldowns, [skill]: 0 }, this.aimAtDummy);
        this.stateDirty = true;
        return;
      }
    }
    this.combat.useSkill(skill, this.player, this.dummy, this.cooldowns, this.aimAtDummy);
    this.stateDirty = true;
  }

  setActiveWeapon(weapon: WeaponCategory): void {
    this.activeWeapon = weapon;
    this.stateDirty = true;
  }

  toggleAim(): void {
    this.aimAtDummy = !this.aimAtDummy;
    this.stateDirty = true;
  }

  isAiming(): boolean {
    return this.aimAtDummy;
  }

  toggleV4(): void {
    if (this.v4Active) {
      // Deactivate early
      this.deactivateV4();
    } else if (this.v4Cooldown <= 0) {
      this.activateV4();
    }
    this.stateDirty = true;
  }

  isV4Active(): boolean {
    return this.v4Active;
  }

  private activateV4(): void {
    this.v4Active = true;
    this.v4Timer = V4_DURATION;
    this.player.setV4(true);
    // Burst particles
    this.particles.burst(this.player.position.clone().add(new THREE.Vector3(0, 2, 0)), {
      color: 0x33aaff, count: 8, speed: 12, size: 0.8, lifetime: 0.6, gravity: 0,
    });
  }

  private deactivateV4(): void {
    this.v4Active = false;
    this.v4Timer = 0;
    this.flying = false;
    this.v4Cooldown = V4_COOLDOWN;
    this.player.setV4(false);
  }

  rotateCamera(deltaX: number, deltaY: number): void {
    this.cameraYaw -= deltaX * 0.006;
    this.cameraPitch = Math.max(0.1, Math.min(1.3, this.cameraPitch + deltaY * 0.004));
  }

  toggleShiftLock(): void {
    this.shiftLock = !this.shiftLock;
  }

  isShiftLock(): boolean {
    return this.shiftLock;
  }

  private getCameraForward(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
  }

  private update(dt: number): void {
    // ── V4 toggle ──
    if (this.input.toggleV4) {
      this.toggleV4();
      this.input.toggleV4 = false;
    }

    // ── V4 timer ──
    if (this.v4Active) {
      this.v4Timer -= dt;
      if (this.v4Timer <= 0) {
        this.deactivateV4();
      }
      this.stateDirty = true;
    }
    if (this.v4Cooldown > 0) this.v4Cooldown -= dt;

    // ── Shift Lock ──
    if (this.shiftLock) {
      const camFwd = this.getCameraForward();
      this.player.setFacingAngle(Math.atan2(camFwd.x, camFwd.z));
    }

    // ── Player movement ──
    if (!this.player.stunned) {
      const speed = 8 * SKY_SPEED_MULT * (this.v4Active ? 1.3 : 1);
      const moveLen = Math.sqrt(this.input.moveX ** 2 + this.input.moveZ ** 2);
      if (moveLen > 0.05) {
        const nx = this.input.moveX / moveLen;
        const nz = this.input.moveZ / moveLen;
        const camFwd = this.getCameraForward();
        const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
        const worldX = camRight.x * nx + camFwd.x * nz;
        const worldZ = camRight.z * nx + camFwd.z * nz;

        this.player.velocity.x += worldX * speed * dt * 10;
        this.player.velocity.z += worldZ * speed * dt * 10;

        // Flight: also move vertically based on joystick up/down
        if (this.flying) {
          this.player.velocity.y += nz * 20 * dt;
        }

        if (!this.shiftLock) {
          this.player.setFacingAngle(Math.atan2(worldX, worldZ));
        }
      }
    }

    // ── Jump + double-tap flight ──
    if (this.input.jump) {
      const now = performance.now();
      if (now - this.jumpTapTime < 300) {
        this.jumpTapCount++;
      } else {
        this.jumpTapCount = 1;
      }
      this.jumpTapTime = now;

      // Double-tap during V4 activates flight
      if (this.jumpTapCount >= 2 && this.v4Active) {
        this.flying = !this.flying;
        this.jumpTapCount = 0;
        if (this.flying) {
          this.player.velocity.y = 6;
        }
      } else {
        // Normal jump
        if (this.player.grounded) this.jumpCount = 0;
        if (this.jumpCount < this.maxJumps) {
          this.player.velocity.y = 16 * (this.v4Active ? 1.3 : 1);
          this.jumpCount++;
        }
      }
      this.input.jump = false;
    }

    // ── Flying physics: hold altitude, gentle hover ──
    if (this.flying) {
      // Gentle gravity counteraction
      this.player.velocity.y += 35 * dt * 0.8;
      // Prevent flying too high
      if (this.player.position.y > 25) {
        this.player.position.y = 25;
        this.player.velocity.y = 0;
      }
      // Landing if touches ground
      if (this.player.grounded) {
        this.flying = false;
      }
    }

    // ── Dash — direction follows joystick input, not facing ──
    if (this.input.dash) {
      if (this.dashCooldown <= 0) {
        const dashPower = this.v4Active ? 50 : 30;
        const moveLen = Math.sqrt(this.input.moveX ** 2 + this.input.moveZ ** 2);

        if (moveLen > 0.05) {
          // Dash in joystick direction (camera-relative)
          const nx = this.input.moveX / moveLen;
          const nz = this.input.moveZ / moveLen;
          const camFwd = this.getCameraForward();
          const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
          const worldX = camRight.x * nx + camFwd.x * nz;
          const worldZ = camRight.z * nx + camFwd.z * nz;
          const len = Math.sqrt(worldX * worldX + worldZ * worldZ);
          if (len > 0.01) {
            this.player.velocity.x = (worldX / len) * dashPower;
            this.player.velocity.z = (worldZ / len) * dashPower;
          }
          // Vertical dash: joystick up = dash up, down = dash down
          if (this.flying || !this.player.grounded) {
            this.player.velocity.y = nz * dashPower * 0.6;
          } else {
            this.player.velocity.y = 5;
          }
        } else {
          // No joystick input — dash forward
          const forward = this.player.getForward();
          this.player.velocity.x = forward.x * dashPower;
          this.player.velocity.z = forward.z * dashPower;
          this.player.velocity.y = this.flying ? 8 : 5;
        }
        this.dashCooldown = this.dashMaxCooldown;
        this.particles.burst(this.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), {
          color: 0x33aaff, count: 4, speed: 6, size: 0.5, lifetime: 0.3,
        });
      }
      this.input.dash = false;
    }

    // ── Skills ──
    if (this.input.skill) {
      this.triggerSkill(this.input.skill);
      this.input.skill = null;
    }

    // ── V4 Aura damage tick ──
    if (this.v4Active) {
      this.auraTickTimer -= dt;
      if (this.auraTickTimer <= 0) {
        this.auraTickTimer = V4_AURA_INTERVAL;
        const auraR = this.player.getAuraRadius();
        const dist = this.player.position.distanceTo(this.dummy.position);
        if (dist < auraR + 1.5 && this.dummy.health > 0) {
          this.dummy.takeDamage(V4_AURA_DAMAGE, new THREE.Vector3(0, 0, 0));
          this.combat.spawnDamageNumberPublic(this.dummy, V4_AURA_DAMAGE, false);
          // Minor pushback
          const pushDir = this.dummy.position.clone().sub(this.player.position);
          pushDir.y = 0;
          if (pushDir.length() > 0.1) {
            pushDir.normalize().multiplyScalar(3);
            this.dummy.velocity.x += pushDir.x;
            this.dummy.velocity.z += pushDir.z;
          }
          this.stateDirty = true;
        }
      }
    }

    // ── Dummy AI ──
    if (!this.dummy.stunned && this.dummy.health > 0) {
      const toPlayer = this.player.position.clone().sub(this.dummy.position);
      const dist = toPlayer.length();
      this.dummy.faceTowards(this.player.position);
      if (dist > 5) {
        toPlayer.normalize();
        this.dummy.velocity.x += toPlayer.x * 3 * dt;
        this.dummy.velocity.z += toPlayer.z * 3 * dt;
      }
    }

    // ── Physics ──
    this.player.updateTimers(dt);
    this.dummy.updateTimers(dt);
    this.player.updatePhysics(dt, this.env.getPlatforms(), this.flying);
    this.dummy.updatePhysics(dt, this.env.getPlatforms(), false);

    // ── Cooldowns ──
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    let cdChanged = false;
    for (const key of Object.keys(this.cooldowns) as SkillId[]) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
        cdChanged = true;
      }
    }
    if (cdChanged) this.stateDirty = true;

    // ── Combat ──
    this.combat.updateProjectiles(dt, this.dummy);
    this.combat.updateDamageNumbers(dt, this.engine.camera, this.container);
    this.particles.update(dt);

    // ── Camera ──
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;
    const horiz = this.cameraDist * Math.cos(this.cameraPitch);
    const camX = px + Math.sin(this.cameraYaw) * horiz;
    const camY = py + this.cameraDist * Math.sin(this.cameraPitch);
    const camZ = pz + Math.cos(this.cameraYaw) * horiz;
    const lerpFactor = this.shiftLock ? 0.12 : 0.08;
    this.smoothedCamPos.lerp(new THREE.Vector3(camX, camY, camZ), lerpFactor);
    this.engine.camera.position.copy(this.smoothedCamPos);
    const lookTarget = new THREE.Vector3(px, py + 2, pz);
    this.smoothedLook.lerp(lookTarget, 0.12);
    this.engine.camera.lookAt(this.smoothedLook);

    // ── Dummy respawn ──
    if (this.dummy.health <= 0) {
      if (this.dummyRespawnTimer <= 0) this.dummyRespawnTimer = 2;
      this.dummyRespawnTimer -= dt;
      if (this.dummyRespawnTimer <= 0) {
        this.dummy.health = this.dummy.maxHealth;
        this.dummy.position.set((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 24);
        this.dummy.velocity.set(0, 0, 0);
        this.stateDirty = true;
      }
    }

    // ── Emit state ──
    this.stateEmitTimer -= dt;
    if (this.stateDirty) {
      this.stateDirty = false;
      this.emitState();
      this.stateEmitTimer = 0.2;
    } else if (this.stateEmitTimer <= 0) {
      this.emitState();
      this.stateEmitTimer = 0.2;
    }
  }

  private emitState(): void {
    this.callbacks.onStateChange({
      health: this.player.health, maxHealth: this.player.maxHealth,
      dummyHealth: this.dummy.health, dummyMaxHealth: this.dummy.maxHealth,
      cooldowns: { ...this.cooldowns }, maxCooldowns: { ...this.maxCooldowns },
      dashCooldown: this.dashCooldown, dashMaxCooldown: this.dashMaxCooldown,
      activeWeapon: this.activeWeapon,
      v4Active: this.v4Active, v4Timer: this.v4Timer, v4MaxTime: V4_DURATION,
      flying: this.flying,
    });
  }

  getDamageNumbers() {
    return this.combat.damageNumbers;
  }

  start(): void {
    this.engine.start();
    this.emitState();
  }

  dispose(): void {
    this.combat.dispose();
    this.particles.dispose();
    this.player.destroy();
    this.dummy.destroy();
    this.engine.dispose();
  }
}
