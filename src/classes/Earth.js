import * as THREE from "three";
import vertexShader from "../shaders/earthVertex.glsl";
import fragmentShader from "../shaders/earthFragment.glsl";
import * as Constants from "../utils/Constants";
import { group } from "d3";

export class Earth {
  constructor(loadingScreen) {
    this.loadingScreen = loadingScreen;
    // Initialize uniforms with null/empty textures first
    this.uniforms = {
      dayTexture: {
        value: new THREE.Texture(), // Initialize with empty texture
      },
      nightTexture: {
        value: new THREE.Texture(),
      },
      cloudTexture: {
        value: new THREE.Texture(),
      },
      mapTexture: {
        value: new THREE.Texture(),
      },
      opacity: {
        value: 1.0,
      },
      sunDirection: {
        value: new THREE.Vector3(1.0, -0.2, 0.0),
      },
      atmosphereColor: {
        value: new THREE.Vector3(0.3, 0.6, 0.8),
      },
      flatten: {
        value: 0.0,
      },
      EARTH_SCALED_RADIUS: {
        value: Constants.EARTH_SCALED_RADIUS,
      },
      time: {
        value: 0.0,
      },
    };
    this.loadTextures();
    this.createEarthMesh();
  }

  async loadTextures() {
    try {
      // Load all textures in parallel
      const [dayTexture, nightTexture, cloudTexture] = await Promise.all([
        this.loadingScreen.loadTexture(
          "./img/world.200412.3x10800x5400.avif",
          "Moving mountains"
        ),
        this.loadingScreen.loadTexture(
          "./img/earth_vir_2016_lrg.avif",
          "Aligning stars"
        ),
        this.loadingScreen.loadTexture(
          "./img/cloud_combined_8192.png",
          "Seeding clouds"
        ),
      ]);

      // Update your uniforms with the loaded textures
      this.uniforms.dayTexture.value = dayTexture;
      this.uniforms.nightTexture.value = nightTexture;
      this.uniforms.cloudTexture.value = cloudTexture;
    } catch (error) {
      console.error("Error loading assets:", error);
      this.loadingScreen.setLoadingText(
        "Error loading assets. Please refresh the page."
      );
    }
  }

  createEarthMesh() {
    const geometry = new THREE.SphereGeometry(
      Constants.EARTH_SCALED_RADIUS,
      150,
      150,
      0,
      Math.PI * 2,
      Constants.EPS,
      Math.PI - 2 * Constants.EPS
    );
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Fix z-fighting with earth and orbit plane
    this.mesh.renderOrder = 0;
  }

  update(time) {
    if (this.uniforms) {
      this.uniforms.time.value = time;
    }
    this.earthRotation = Constants.EARTH_ROTATION_RATE * time;
  }

  rotate() {
    this.mesh.rotation.y = this.earthRotation;
  }

  updateSunDirection(groupRotation, viewState) {
    var sunAngle = new THREE.Vector3(1.0, -0.25, 0.0);
    if (viewState != Constants.VIEW_STATES.GLOBE) {
      sunAngle.applyEuler(
        new THREE.Euler(0.0, this.mesh.rotation.y - this.earthRotation, 0.0)
      );
    }
    sunAngle.applyEuler(groupRotation);
    this.uniforms.sunDirection.value = sunAngle;
  }
}
