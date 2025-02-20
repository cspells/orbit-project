import * as THREE from "three";
import * as Constants from "../utils/Constants";

export class Stars {
  constructor(loadingScreen) {
    this.loadingScreen = loadingScreen;
    this.loadStarTexture();
    this.createStarField();
  }

  async loadStarTexture() {
    const starTexture = await this.loadingScreen.loadTexture(
      "./img/starmap_2020_8k.avif",
      "Aligning stars"
    );
    this.mesh.material.map = starTexture;
    this.mesh.material.needsUpdate = true;
  }

  createStarField() {
    const geometry = new THREE.SphereGeometry(
      1000,
      6,
      12,
      0,
      Math.PI * 2,
      Constants.EPS,
      Math.PI - 2 * Constants.EPS
    );

    // Create a material that will render on the inside of the sphere
    const material = new THREE.MeshBasicMaterial({
      map: new THREE.Texture(),
      side: THREE.BackSide, // This makes the material render on the inside
      transparent: true,
      opacity: 0.2,
    });

    this.mesh = new THREE.Mesh(geometry, material);
  }
}
