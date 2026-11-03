import * as THREE from 'three';
import { Engine } from './Engine';

export interface ParticleConfig {
  color: number;
  count: number;
  speed: number;
  size: number;
  lifetime: number;
  gravity?: number;
  spread?: number;
}

export class ParticleSystem {
  private engine: Engine;
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    gravity: number;
  }[] = [];

  private sharedGeo = new THREE.SphereGeometry(0.25, 4, 3);
  private materialCache = new Map<number, THREE.MeshBasicMaterial>();

  constructor(engine: Engine) {
    this.engine = engine;
  }

  private getMaterial(color: number): THREE.MeshBasicMaterial {
    let mat = this.materialCache.get(color);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      this.materialCache.set(color, mat);
    }
    return mat;
  }

  burst(origin: THREE.Vector3, config: ParticleConfig): void {
    const count = Math.min(config.count, 4);
    for (let i = 0; i < count; i++) {
      const mat = this.getMaterial(config.color).clone();
      const mesh = new THREE.Mesh(this.sharedGeo, mat);
      mesh.scale.setScalar(config.size);
      mesh.position.copy(origin);

      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed * 0.5;

      this.engine.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * speed + 1,
          Math.sin(angle) * speed
        ),
        life: config.lifetime,
        maxLife: config.lifetime,
        gravity: config.gravity ?? 5,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.engine.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;

      const ratio = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      this.engine.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
    this.sharedGeo.dispose();
    this.materialCache.clear();
  }
}
