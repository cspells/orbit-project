import * as THREE from "three";
import { Earth } from "./Earth";
import { Stars } from "./Stars";
import { Orbit } from "./Orbit";
import { ViewManager } from "./ViewManager";
import * as Constants from "../utils/Constants";
import { LoadingScreen } from "../utils/LoadingScreen";
import Stats from "stats.js";

export class SceneManager {
  constructor() {
    this.time = 0.0;
    this.deltaTime = 5.0;

    this.loadingScreen = new LoadingScreen();

    // Set up completion callback
    this.loadingScreen.onComplete(() => {
      console.log("Liftoff. All systems nominal.");
    });

    this.initializeScene();
    this.initializeStats();
    this.setupRenderer();
    this.setupCamera();

    this.earth = new Earth(this.loadingScreen);
    this.stars = new Stars(this.loadingScreen);
    this.orbit = new Orbit(this.loadingScreen);
    this.earth.uniforms.mapTexture.value = this.orbit.groundTrack.getTexture();
    this.viewManager = new ViewManager(this);

    this.group = new THREE.Group();
    this.addObjectsToScene();
    this.setupLighting();
  }

  initializeScene() {
    this.scene = new THREE.Scene();
    this.canvas = document.querySelector("#c");
  }

  initializeStats() {
    this.stats = new Stats();
    this.stats.showPanel(1);
    document.body.appendChild(this.stats.dom);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio * 2);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupCamera() {
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1.0, 1500);
    this.camera.position.z = 4;
  }

  addObjectsToScene() {
    this.group.add(this.earth.mesh);
    this.group.add(this.stars.mesh);
    this.group.add(this.orbit.line);
    this.group.add(this.orbit.plane);
    this.group.add(this.orbit.nadirLine);
    this.group.add(this.orbit.satellite);
    this.scene.add(this.group);
  }

  setupLighting() {
    const color = 0xffffff;
    const intensity = 1.5;

    this.ambientLight = new THREE.AmbientLight(color, intensity);
    this.pointLight = new THREE.PointLight(color, intensity);
    this.pointLight.position.set(0, 0, 50);

    this.scene.add(this.ambientLight);
    this.scene.add(this.pointLight);
  }

  updateSimulationTime() {
    this.time += this.deltaTime;
  }

  resizeRendererToDisplaySize() {
    const currentCanvas = this.renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = (window.innerWidth * pixelRatio) | 0;
    const height = (window.innerHeight * pixelRatio) | 0;

    const needResize =
      currentCanvas.width !== width * 2 || currentCanvas.height !== height * 2;
    if (needResize) {
      // c += 1;
      // console.log(c);
      console.log("needResize is true");
      this.renderer.setSize(width, height, false);
    }
    return needResize;
  }

  render() {
    this.stats.begin();
    this.viewManager.update(this.time);
    this.orbit.update(this.time);
    this.earth.update(this.time);
    this.renderer.render(this.scene, this.camera);
    if (
      this.viewManager.currentState === Constants.VIEW_STATES.ORTHO ||
      this.viewManager.currentState === Constants.VIEW_STATES.GLOBE
    ) {
      this.updateSimulationTime();
    }
    this.stats.end();
    if (this.resizeRendererToDisplaySize()) {
      console.log("resizeRendererToDisplaySize");
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    requestAnimationFrame(this.render.bind(this));
  }
}
