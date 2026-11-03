import * as THREE from 'three';
import { Engine } from './Engine';

export const ARENA = {
  minX: -25,
  maxX: 25,
  minZ: -18,
  maxZ: 18,
  groundY: 0,
  wallHeight: 16,
};

export class Environment {
  private engine: Engine;
  private platforms: THREE.Mesh[] = [];

  constructor(engine: Engine) {
    this.engine = engine;
    this.build();
  }

  private build(): void {
    const scene = this.engine.scene;

    // Ground — single flat plane
    const groundGeo = new THREE.PlaneGeometry(
      (ARENA.maxX - ARENA.minX) + 4,
      (ARENA.maxZ - ARENA.minZ) + 4
    );
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x141826 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, ARENA.groundY, (ARENA.maxZ + ARENA.minZ) / 2);
    scene.add(ground);

    this.buildBoundaryWalls();
  }

  private buildBoundaryWalls(): void {
    const scene = this.engine.scene;
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x2244aa,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });

    const width = ARENA.maxX - ARENA.minX;
    const depth = ARENA.maxZ - ARENA.minZ;
    const cx = (ARENA.maxX + ARENA.minX) / 2;
    const cz = (ARENA.maxZ + ARENA.minZ) / 2;

    // Left wall
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, ARENA.wallHeight, depth + 4), wallMat);
    left.position.set(ARENA.minX - 0.25, ARENA.wallHeight / 2, cz);
    scene.add(left);

    // Right wall
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, ARENA.wallHeight, depth + 4), wallMat);
    right.position.set(ARENA.maxX + 0.25, ARENA.wallHeight / 2, cz);
    scene.add(right);

    // Back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(width + 4, ARENA.wallHeight, 0.5), wallMat);
    back.position.set(cx, ARENA.wallHeight / 2, ARENA.minZ - 0.25);
    scene.add(back);

    // Front wall
    const front = new THREE.Mesh(new THREE.BoxGeometry(width + 4, ARENA.wallHeight, 0.5), wallMat);
    front.position.set(cx, ARENA.wallHeight / 2, ARENA.maxZ + 0.25);
    scene.add(front);
  }

  getPlatforms(): THREE.Mesh[] {
    return this.platforms;
  }
}
