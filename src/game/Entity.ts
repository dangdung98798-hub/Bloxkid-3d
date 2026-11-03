import * as THREE from 'three';
import { Engine } from './Engine';
import { ARENA } from './Environment';

export interface EntityOptions {
  color: number;
  emissive: number;
  maxHealth: number;
  hasWings?: boolean;
}

let entityIdCounter = 0;

export class Entity {
  public id: number;
  public mesh: THREE.Group;
  public health: number;
  public maxHealth: number;
  public velocity: THREE.Vector3;
  public facingAngle: number = 0;
  public grounded = false;
  public stunned = false;
  public stunTimer = 0;
  public burning = false;
  public burnTimer = 0;
  public knockbackImmune = 0;

  private engine: Engine;
  private bodyMat: THREE.MeshStandardMaterial;
  private wingL: THREE.Group | null = null;
  private wingR: THREE.Group | null = null;
  private wingMatL: THREE.MeshStandardMaterial | null = null;
  private wingMatR: THREE.MeshStandardMaterial | null = null;
  private hasWings: boolean;
  private v4Active = false;
  private auraRing: THREE.Mesh | null = null;
  private wingFlapTime = 0;

  constructor(engine: Engine, x: number, z: number, opts: EntityOptions) {
    this.id = entityIdCounter++;
    this.engine = engine;
    this.health = opts.maxHealth;
    this.maxHealth = opts.maxHealth;
    this.velocity = new THREE.Vector3();
    this.hasWings = opts.hasWings ?? false;

    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.8, 1.4, 3, 6);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: opts.color, emissive: opts.emissive, emissiveIntensity: 0.3,
      roughness: 0.6, metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, this.bodyMat);
    body.position.y = 1.5;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.55, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: opts.color, emissive: opts.emissive, emissiveIntensity: 0.3, roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.9;
    this.mesh.add(head);

    if (this.hasWings) {
      this.buildWings(opts.emissive);
    }

    this.mesh.position.set(x, 0, z);
    engine.scene.add(this.mesh);
  }

  private buildWings(emissive: number): void {
    this.wingMatL = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive, emissiveIntensity: 0.4, roughness: 0.5,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    });
    this.wingMatR = this.wingMatL.clone();

    // Left wing — a simple feathered shape using a cone
    const wingGeo = new THREE.ConeGeometry(0.8, 2.2, 4, 1, false);
    const wingL = new THREE.Mesh(wingGeo, this.wingMatL);
    wingL.rotation.z = Math.PI / 2.5;
    wingL.rotation.y = Math.PI / 2;
    wingL.position.set(-0.6, 2.2, -0.3);
    this.wingL = new THREE.Group();
    this.wingL.add(wingL);
    this.wingL.position.set(-0.5, 0, 0);
    this.mesh.add(this.wingL);

    // Right wing
    const wingR = new THREE.Mesh(wingGeo, this.wingMatR);
    wingR.rotation.z = -Math.PI / 2.5;
    wingR.rotation.y = -Math.PI / 2;
    wingR.position.set(0.6, 2.2, -0.3);
    this.wingR = new THREE.Group();
    this.wingR.add(wingR);
    this.wingR.position.set(0.5, 0, 0);
    this.mesh.add(this.wingR);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  setFacingAngle(angle: number): void {
    this.facingAngle = angle;
    this.mesh.rotation.y = angle;
  }

  faceTowards(target: THREE.Vector3): void {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    this.setFacingAngle(Math.atan2(dx, dz));
  }

  getForward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
  }

  setV4(active: boolean): void {
    this.v4Active = active;
    if (active) {
      // Expand wings
      if (this.wingL) this.wingL.scale.setScalar(2.0);
      if (this.wingR) this.wingR.scale.setScalar(2.0);
      if (this.wingMatL) { this.wingMatL.emissiveIntensity = 1.5; this.wingMatL.opacity = 0.9; }
      if (this.wingMatR) { this.wingMatR.emissiveIntensity = 1.5; this.wingMatR.opacity = 0.9; }
      // Show aura ring
      if (!this.auraRing) {
        const ringGeo = new THREE.RingGeometry(3, 4, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x33aaff, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
        });
        this.auraRing = new THREE.Mesh(ringGeo, ringMat);
        this.auraRing.rotation.x = -Math.PI / 2;
        this.auraRing.position.y = 0.1;
        this.mesh.add(this.auraRing);
      }
      this.auraRing.visible = true;
    } else {
      // Revert wings
      if (this.wingL) this.wingL.scale.setScalar(1.0);
      if (this.wingR) this.wingR.scale.setScalar(1.0);
      if (this.wingMatL) { this.wingMatL.emissiveIntensity = 0.4; this.wingMatL.opacity = 0.85; }
      if (this.wingMatR) { this.wingMatR.emissiveIntensity = 0.4; this.wingMatR.opacity = 0.85; }
      if (this.auraRing) this.auraRing.visible = false;
    }
  }

  isV4Active(): boolean {
    return this.v4Active;
  }

  getAuraRadius(): number {
    return this.v4Active ? 4.0 : 0;
  }

  updatePhysics(dt: number, platforms: THREE.Mesh[], flying: boolean = false): void {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.stunned = false;
    }

    // Gravity — disabled when flying
    if (!flying) {
      this.velocity.y -= 35 * dt;
    }

    // Apply velocity
    const pos = this.mesh.position;
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;
    pos.z += this.velocity.z * dt;

    // Ground collision
    if (pos.y <= ARENA.groundY) {
      pos.y = ARENA.groundY;
      this.velocity.y = 0;
      this.grounded = true;
    } else if (!flying) {
      this.grounded = false;
    }

    // Platform collision
    if (!flying) {
      for (const p of platforms) {
        const px = p.position.x, py = p.position.y, pz = p.position.z;
        const hw = (p.geometry as THREE.BoxGeometry).parameters.width / 2;
        const hh = (p.geometry as THREE.BoxGeometry).parameters.height / 2;
        const hd = (p.geometry as THREE.BoxGeometry).parameters.depth / 2;
        if (pos.x > px - hw && pos.x < px + hw && pos.z > pz - hd && pos.z < pz + hd &&
            pos.y >= py - hh && pos.y < py + hh + 0.5 && this.velocity.y <= 0) {
          pos.y = py + hh;
          this.velocity.y = 0;
          this.grounded = true;
        }
      }
    }

    // Boundary clamping
    pos.x = Math.max(ARENA.minX + 1, Math.min(ARENA.maxX - 1, pos.x));
    pos.z = Math.max(ARENA.minZ + 1, Math.min(ARENA.maxZ - 1, pos.z));
    if (pos.x <= ARENA.minX + 1 || pos.x >= ARENA.maxX - 1) this.velocity.x = 0;
    if (pos.z <= ARENA.minZ + 1 || pos.z >= ARENA.maxZ - 1) this.velocity.z = 0;

    // Friction
    this.velocity.x *= 0.85;
    this.velocity.z *= 0.85;
    if (flying) this.velocity.y *= 0.9;

    // Wing flap animation
    if (this.hasWings && this.wingL && this.wingR) {
      this.wingFlapTime += dt * 8;
      const flap = Math.sin(this.wingFlapTime) * 0.25;
      this.wingL.rotation.z = flap;
      this.wingR.rotation.z = -flap;

      // Aura ring pulse
      if (this.v4Active && this.auraRing) {
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        this.auraRing.scale.setScalar(pulse);
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
      }
    }

    // Stun visual
    this.bodyMat.emissiveIntensity = this.stunned ? 0.8 : 0.3;
  }

  takeDamage(amount: number, knockbackDir: THREE.Vector3): void {
    this.health = Math.max(0, this.health - amount);
    if (this.knockbackImmune <= 0) {
      this.velocity.x += knockbackDir.x;
      this.velocity.z += knockbackDir.z;
      if (knockbackDir.y !== 0 || knockbackDir.length() > 0.1) {
        this.velocity.y = 8;
      }
      this.knockbackImmune = 0.3;
    }
  }

  updateTimers(dt: number): void {
    if (this.knockbackImmune > 0) this.knockbackImmune -= dt;
    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      if (this.burnTimer <= 0) this.burning = false;
    }
  }

  destroy(): void {
    this.engine.scene.remove(this.mesh);
  }
}
