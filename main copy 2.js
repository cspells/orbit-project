import gsap from 'gsap';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useControls } from 'leva';
import vertexShader from './shaders/earthVertex.glsl';
import fragmentShader from './shaders/earthFragment.glsl';
import atmosphereVertexShader from './shaders/atmosphereVertex.glsl';
import atmosphereFragmentShader from './shaders/atmosphereFragment.glsl';
import { matrix, multiply, abs, divide } from 'mathjs';
import * as d3 from 'd3';
import { COE2IJK, computeGroundTrack, OrbitalElements, propagate, rad2deg } from './Orbit';
import Stats from 'stats.js';
// import gui from './gui.jsx'; // Ensure this path is correct

var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const PROJECTION_AR = 2;
const CANVAS_WIDTH = 1.5 * 1.5 * 1080;
const CANVAS_HEIGHT = CANVAS_WIDTH / PROJECTION_AR;

const TWO_PI = 2 * Math.PI;
const mue = 3.986004418e14;
const EARTH_ROTATION_PERIOD = 23 * 3600 + 56 * 60 + 4.1;
const EARTH_ROTATION_RATE = TWO_PI / EARTH_ROTATION_PERIOD;

const eps = 0.0001;
var simulationTime = 0.0;
var deltaTime = 5.0;

const PROJECTION = d3.geoEquirectangular()
  .translate([CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2])
  .scale(Math.min(CANVAS_WIDTH / PROJECTION_AR / Math.PI, CANVAS_HEIGHT / Math.PI));

const scene = new THREE.Scene();
const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio * 2);
renderer.setSize(window.innerWidth, window.innerHeight);

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 20000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 20;

const uniforms = {
  dayTexture: { value: new THREE.TextureLoader().load('./img/world.topo.bathy.200412.3x1920x960.jpg') },
  nightTexture: { value: new THREE.TextureLoader().load('./img/world.topo.bathy.night.3x1920x960.jpg') },
  mapTexture: { value: new THREE.Texture() },
  opacity: { value: 1.0 },
  sunDirection: { value: new THREE.Vector3(1.0, -0.2, 0.0) },
  atmosphereColor: { value: new THREE.Vector3(0.3, 0.6, 0.8) },
  flatten: { value: 0.0 }
};

const groundPlotCanvas = d3.select("body").append("canvas")
  .attr("background", "#ff0000")
  .attr("width", CANVAS_WIDTH)
  .attr("height", CANVAS_HEIGHT);

const context = groundPlotCanvas.node().getContext("2d");
const path = d3.geoPath().projection(PROJECTION).context(context);

context.strokeStyle = "#ff0000";
context.lineWidth = 2.0;
context.beginPath();
path({
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [[0, 0], [5, 0], [10, 10], [0.1278, 51.5074]]
  }
});
context.fill();
context.stroke();
context.closePath();

const texture = new THREE.CanvasTexture(groundPlotCanvas.node());
texture.needsUpdate = true;
groundPlotCanvas.remove();
uniforms.mapTexture.value = texture;

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });

var starVertices = [];
for (let index = 0; index < 40000; index++) {
  const radius = Math.random() * 8000 + 10000;
  const x = Math.random() * 2 - 1.0;
  const y = Math.random() * 2 - 1.0;
  const z = Math.random() * 2 - 1.0;
  starVertices.push(radius * x, radius * y, radius * z);
}

function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) return gaussian();
  return num;
}

for (let index = 0; index < 100000; index++) {
  const radius = Math.random() * 8000 + 10000;
  const phi = gaussian() * 1.8 - 0.9;
  const gamma = Math.random() * 2 * Math.PI;
  const s_phi = Math.sin(phi);
  const c_phi = Math.cos(phi);
  const s_theta = Math.sin(gamma);
  const c_theta = Math.cos(gamma);
  starVertices.push(radius * c_phi * c_theta, radius * c_phi * s_theta, radius * s_phi);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);

const earth = new THREE.Mesh(
  new THREE.SphereBufferGeometry(6.3781, 150, 150, 0, Math.PI * 2, eps, Math.PI - 2 * eps),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms
  })
);
earth.material.transparent = true;

const atmosphere = new THREE.Mesh(
  new THREE.SphereBufferGeometry(6.4581, 50, 50),
  new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
);

scene.add(atmosphere);

const group = new THREE.Group();
group.add(earth);
group.add(stars);
scene.add(group);

const color = 0xFFFFFF;
const intensity = 1.5;
const ambientLight = new THREE.AmbientLight(color, intensity);
scene.add(ambientLight);

const light = new THREE.PointLight(color, intensity);
light.position.set(0, 0, 50);
scene.add(light);

const satellite = new THREE.Group();
group.add(satellite);
satellite.scale.set(0.05, 0.05, 0.05);
satellite.position.x = 10;
const gltfLoader = new GLTFLoader();
gltfLoader.load('model/Hubble.glb',
  function (gltf) {
    satellite.add(gltf.scene);
    console.log(satellite);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
  },
  (error) => {
    console.log(error);
  }
);

renderer.render(scene, camera);

const mouse = {
  x: 0,
  y: 0,
  scroll: camera.position.z
};

var isDragging = false;
var c = 0;
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = canvas.clientWidth * pixelRatio | 0;
  const height = canvas.clientHeight * pixelRatio | 0;
  const needResize = canvas.width !== width * 2 || canvas.height !== height * 2;
  if (needResize) {
    c += 1;
    console.log(c);
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function updateOrbit(OrbitalElements, time = 0) {
  const theta = propagate(OrbitalElements, time, 0);
  OrbitalElements.TrueAnomaly = rad2deg(theta);
  const pts = COE2IJK(OrbitalElements, true, null, true);
  curve.points = pts;
  curveObject.geometry.setFromPoints(curve.getPoints(200));
  mesh6.geometry.setFromPoints(curve.getPoints(200));
  const satelliteRIJK = COE2IJK(OrbitalElements, false, null, true);
  satellite.position.set(satelliteRIJK.x, satelliteRIJK.y, satelliteRIJK.z);
  const positions = [];
  positions.push(0, 0, 0);
  positions.push(satelliteRIJK.x, satelliteRIJK.y, satelliteRIJK.z);
  curveObject2.geometry.setPositions(positions);
  const gpts = computeGroundTrack(OrbitalElements, time);
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.beginPath();
  path({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: gpts
    }
  });
  context.fill();
  context.stroke();
  context.closePath();
  texture.needsUpdate = true;
}

updateOrbit(OrbitalElements);

function updateSimulationTime() {
  simulationTime += deltaTime;
}

const initialTime = new Date();
console.log(initialTime);
var newRotation = null;

function render(time) {
  stats.begin();
  const timeNow = new Date();
  time = (timeNow.getTime() - initialTime.getTime()) / 1000.0;

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  var sunAngle = new THREE.Vector3(1.0, -0.25, 0.0);
  const earthRotation = (EARTH_ROTATION_RATE * simulationTime);
  const nearestTwoPi = earthRotation % TWO_PI;

  switch (viewState) {
    case viewStates.GLOBE:
      updateSimulationTime();
      earth.rotation.y = earthRotation;
      gsap.to(group.rotation, {
        y: mouse.x,
        x: mouse.y,
        duration: 1.5
      });
      gsap.to(camera.position, {
        z: mouse.scroll,
        duration: 1.5
      });
      break;

    case viewStates.TRANSITION_TO_ORTHO:
      gsap.to(camera.position, {
        y: 0,
        x: 0,
        z: 16,
        duration: 1.5,
      });
      gsap.timeline()
        .to(group.rotation, {
          y: 0,
          x: 0,
          duration: 1.5
        })
        .to(earth.rotation, {
          y: earthRotation - nearestTwoPi - Math.PI / 2,
          duration: 1.5
        })
        .to(uniforms.flatten, {
          value: 1,
          duration: 1.5,
          onComplete: () => {
            uniforms.flatten.value = 1.0;
            viewState = viewStates.ORTHO;
          }
        });
      viewState = viewStates.WAIT;
      break;

    case viewStates.ORTHO:
      updateSimulationTime();
      gsap.to(camera.position, {
        x: -3 * mouse.x,
        y: 3 * mouse.y,
        z: 16,
        duration: 1.5
      });
      satellite.visible = false;
      curveObject.visible = false;
      stars.visible = false;
      atmosphere.visible = false;
      ambientLight.visible = false;
      light.visible = false;
      break;

    case viewStates.TRANSITION_TO_GLOBE:
      satellite.visible = true;
      curveObject.visible = true;
      stars.visible = true;
      atmosphere.visible = true;
      ambientLight.visible = true;
      light.visible = true;
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: mouse.scroll,
        duration: 1.5
      });
      gsap.timeline().to(uniforms.flatten, {
        value: 0,
        duration: 1.0,
        ease: "none",
        onComplete: () => {
          uniforms.flatten.value = 0.0;
        }
      }).fromTo(earth.rotation, {
        y: earthRotation - nearestTwoPi - Math.PI / 2,
      }, {
        y: earthRotation,
        duration: 1.5,
        ease: "none",
      }).to(group.rotation, {
        y: mouse.x,
        x: mouse.y,
        duration: 1.5,
        onComplete: () => {
          viewState = viewStates.GLOBE;
          console.log("Finishing Transition to Globe");
        }
      });
      viewState = viewStates.WAIT;
      break;

    case viewStates.WAIT:
      break;
  }

  if (viewState != viewStates.GLOBE) {
    sunAngle.applyEuler(new THREE.Euler(0.0, earth.rotation.y - earthRotation, 0.0));
  }

  sunAngle.applyEuler(group.rotation);
  earth.material.uniforms.sunDirection.value = sunAngle;

  stats.end();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

var previousMousePosition = {
  x: 0,
  y: 0
};

addEventListener('mousedown', () => {
  isDragging = true;
});

addEventListener('mouseup', () => {
  isDragging = false;
});

addEventListener('mousemove', (event) => {
  if (false === mouseOverSlider) {
    var xPosition = ((event.clientX / innerWidth) * 2 - 1);
    var yPosition = ((event.clientY / innerHeight) * 2 - 1);
    var deltaMove = {
      x: xPosition - previousMousePosition.x,
      y: yPosition - previousMousePosition.y
    };
    if (true === isDragging) {
      mouse.x += deltaMove.x * 2;
      mouse.y += deltaMove.y * 2;
      mouse.y = Math.max(mouse.y, -Math.PI / 2);
      mouse.y = Math.min(mouse.y, Math.PI / 2);
    }
    previousMousePosition = {
      x: xPosition,
      y: yPosition
    };
  }
});

addEventListener('wheel', (event) => {
  mouse.scroll += event.deltaY / 25;
  mouse.scroll = Math.max(12.000, mouse.scroll);
  mouse.scroll = Math.min(200.000, mouse.scroll);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}

animate();