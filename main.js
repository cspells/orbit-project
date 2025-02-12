import gsap from "gsap";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useControls } from "leva";
import vertexShader from "./shaders/earthVertex.glsl";
import fragmentShader from "./shaders/earthFragment.glsl";
import atmosphereVertexShader from "./shaders/atmosphereVertex.glsl";
import atmosphereFragmentShader from "./shaders/atmosphereFragment.glsl";
import { matrix, multiply, abs, divide } from "mathjs";
import * as d3 from "d3";
import {
  COE2IJK,
  computeGroundTrack,
  OrbitalElements,
  propagate,
  rad2deg,
} from "./Orbit";
import Stats from "stats.js";
import * as constants from "./Constants";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { createLevaControls } from "./LevaWrapper";
import { folder } from "leva";
// import gui from './gui.jsx'; // Ensure this path is correct

var stats = new Stats();
stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const SCALE = 4;

const eps = 0.0001;
var simulationTime = 0.0;
var deltaTime = 5.0;

// Set initial orbit parameters
OrbitalElements.SemiMajorAxis = 26312;
OrbitalElements.Eccentricity = 0.75;
OrbitalElements.Inclination = 45;
OrbitalElements.RAAN = 225;
OrbitalElements.ArgumentPerigee = 225;
OrbitalElements.TrueAnomaly = 129;
console.log(OrbitalElements);

const viewStates = {
  GLOBE: 'Globe',
  TRANSITION_TO_ORTHO: 'Transition to ortho',
  ORTHO: 'Otho',
  TRANSITION_TO_GLOBE: 'Transition to globe',
  WAIT: 'Wait for animation'
}

// Initially the view will start by looking at the globe
var viewState = viewStates.GLOBE;

function transform() {

  switch (viewState) {
    case viewStates.GLOBE:
      viewState = viewStates.TRANSITION_TO_ORTHO;
      break;
    case viewStates.ORTHO:
      viewState = viewStates.TRANSITION_TO_GLOBE;
      break;
  }
  console.log(viewState)
}

const PROJECTION = d3
  .geoEquirectangular()
  .translate([
    (constants.CANVAS_WIDTH * SCALE) / 2,
    (constants.CANVAS_HEIGHT * SCALE) / 2,
  ])
  .scale(
    Math.min(
      (constants.CANVAS_WIDTH * SCALE) / constants.PROJECTION_AR / Math.PI,
      (constants.CANVAS_HEIGHT * SCALE) / Math.PI
    )
  ); // D3 geo projection for canvas

const scene = new THREE.Scene();
const canvas = document.querySelector("#c");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio * 2);
renderer.setSize(window.innerWidth, window.innerHeight);

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 20000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

camera.position.z = 20;

var uniforms = {
  dayTexture: {
    value: new THREE.TextureLoader().load(
      "./img/world.topo.bathy.200412.3x5400x2700.avif" //200412.3x1920x960.jpg"
    ),
  },
  nightTexture: {
    value: new THREE.TextureLoader().load(
      "./img/earth_vir_2016_lrg.avif" //world.topo.bathy.night.3x1920x960.jpg"
    ),
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
};

// Append canvas and save reference
const groundPlotCanvas = d3
  .select("body")
  .append("canvas")
  .attr("background", "#ff0000")
  .attr("width", constants.CANVAS_WIDTH * SCALE)
  .attr("height", constants.CANVAS_HEIGHT * SCALE);

// Get 2d context of canvas
const context = groundPlotCanvas.node().getContext("2d");

// Create geo path generator
const path = d3.geoPath().projection(PROJECTION).context(context);

// Draw features from geojson
context.strokeStyle = "#ff0000";
context.lineWidth = 5.0; //3.25;
context.beginPath();

// Generate texture from canvas
const texture = new THREE.CanvasTexture(groundPlotCanvas.node());
texture.anisotropy = 16;
texture.needsUpdate = true;

// Remove canvas
groundPlotCanvas.remove();
uniforms.mapTexture.value = texture;

context.beginPath();
path({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [5, 0],
      [10, 10],
      [0.1278, 51.5074],
    ],
  },
});
context.fill();
context.stroke();
context.closePath();

console.log(d3.select("path.Feature").remove());

context.clearRect(
  0,
  0,
  constants.CANVAS_WIDTH * SCALE,
  constants.CANVAS_HEIGHT * SCALE
);
texture.needsUpdate = true;

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
const numStars = 40000;
var starVertices = [];
for (let index = 0; index < numStars; index++) {
  const radius = Math.random() * 8000 + 10000;

  const x = Math.random() * 2 - 1.0;
  const y = Math.random() * 2 - 1.0;
  const z = Math.random() * 2 - 1.0;

  starVertices.push(radius * x, radius * y, radius * z);
}

function gaussian() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return gaussian(); // resample between 0 and 1
  return num;
}

// Add milky way
for (let index = 0; index < 100000; index++) {
  const radius = Math.random() * 8000 + 10000;
  const phi = gaussian() * 1.8 - 0.9; // *Math.PI / 2;
  const gamma = Math.random() * 2 * Math.PI;

  const s_phi = Math.sin(phi);
  const c_phi = Math.cos(phi);
  const s_theta = Math.sin(gamma);
  const c_theta = Math.cos(gamma);

  starVertices.push(
    radius * c_phi * c_theta,
    radius * c_phi * s_theta,
    radius * s_phi
  );
}

starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starVertices, 3)
);

const stars = new THREE.Points(starGeometry, starMaterial);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(
    6.3781,
    150,
    150,
    0,
    Math.PI * 2,
    eps,
    Math.PI - 2 * eps
  ),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  })
);
earth.material.transparent = true;

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(6.4581 * 0.992, 50, 50), // 5.06 //4
  new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
);

// Create a curve to interpolate points from orbit
var curve = new THREE.CatmullRomCurve3();
curve.closed = true;
curve.points = [
  new THREE.Vector3(-10, 0, 10),
  new THREE.Vector3(-5, 5, 5),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(5, -5, 5),
  new THREE.Vector3(10, 0, 10),
];

const maxPoints = 200; // More than you expect to need
const orbitGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(maxPoints * 3); // * 3 for x, y, z
orbitGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const orbitMaterial = new THREE.LineBasicMaterial({
  color: 0xff0099,
  linewidth: 20,
  transparent: true,
  opacity: 1.0,
});

// Create the final object to add to the scene
const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);

// Create a Line2 object to trace the nadir of the spacecraft on the surface of the earth
var nadirGeometry = new LineGeometry();
const nadirPositions = [];
const nadirColors = [];
nadirPositions.push(10, 0, 0);
nadirPositions.push(0, 10, 0);
nadirColors.push(1, 0, 1);
nadirColors.push(1, 0, 0);
nadirGeometry.setPositions(nadirPositions);
nadirGeometry.setColors(nadirColors);
const nadirMaterial = new LineMaterial({
  color: 0xff0099,
  linewidth: 1.0,
  vertexColors: true,
  transparent: true,
  opacity: 1.0,
});
nadirMaterial.resolution.set(window.innerWidth, window.innerHeight);
const nadirLine = new Line2(nadirGeometry, nadirMaterial);

const initialShape = new THREE.Shape();
initialShape.moveTo(0, 0);
initialShape.bezierCurveTo(1, 1, 1, 0, 0, 0); // Tiny initial shape
const orbitPlaneGeometry = new THREE.ShapeGeometry(initialShape, 200);
const orbitPlaneMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  opacity: 0.08,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false, 
  depthTest: true, 
});

const orbitPlane = new THREE.Mesh(orbitPlaneGeometry, orbitPlaneMaterial);

// Fix z-fighting with earth and orbit plane
orbitPlane.renderOrder = 1; // Higher number renders later
earth.renderOrder = 0; // Lower number renders first

const group = new THREE.Group();
group.add(earth);
group.add(atmosphere);
group.add(orbitLine);
group.add(nadirLine);
group.add(stars);
group.add(orbitPlane);

scene.add(group);

const color = 0xffffff;
const intensity = 1.5;
const ambientLight = new THREE.AmbientLight(color, intensity);
scene.add(ambientLight);

const light = new THREE.PointLight(color, intensity);
light.position.set(0, 0, 50);
// light.target.position.set(0, 0, 0);
scene.add(light);

const satellite = new THREE.Group();
group.add(satellite);
satellite.scale.set(0.05, 0.05, 0.05);
satellite.position.x = 10;
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  "model/Hubble.glb",
  function (gltf) {
    satellite.add(gltf.scene);
    console.log(satellite);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.log(error);
  }
);

renderer.render(scene, camera);

const mouse = {
  x: 0,
  y: 0,
  scroll: camera.position.z,
};

var isDragging = false;
var c = 0;
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = (canvas.clientWidth * pixelRatio) | 0;
  const height = (canvas.clientHeight * pixelRatio) | 0;

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

  // Update orbit geometries
  const pts = COE2IJK(OrbitalElements, true, null, true);
  curve.points = pts;
  orbitLine.geometry.setFromPoints(curve.getPoints(199));
  orbitPlane.geometry.setFromPoints(curve.getPoints(199));

  // Update 3D satellite position
  const satelliteRIJK = COE2IJK(OrbitalElements, false, null, true);
  satellite.position.set(satelliteRIJK.x, satelliteRIJK.y, satelliteRIJK.z);

  const nadirPosition = new Float32Array([
    0,
    0,
    0, // Earth center
    satelliteRIJK.x,
    satelliteRIJK.y,
    satelliteRIJK.z, // Satellite position
  ]);
  nadirGeometry.setPositions(nadirPosition);

  // Update ground track
  const gpts = computeGroundTrack(OrbitalElements, time);

  context.clearRect(
    0,
    0,
    constants.CANVAS_WIDTH * SCALE,
    constants.CANVAS_HEIGHT * SCALE
  );
  context.beginPath();
  path({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: gpts,
    },
  });
  context.fill();
  context.stroke();
  context.closePath();

  texture.needsUpdate = true;
}

updateOrbit(OrbitalElements);

// Create the GUI with your controls
const cleanup = createLevaControls(
  {
    Controls: folder(
      {
        // Define your controls here
        SemiMajorAxis: { value: OrbitalElements.SemiMajorAxis, min: 5200, max: 100000 },
        Eccentricity: { value: OrbitalElements.Eccentricity, min: 0, max: 0.999, step: 0.01 },
        Inclination: { value: OrbitalElements.Inclination, min: 0, max: 180 },
        RAAN: { value: OrbitalElements.RAAN, min: 0, max: 360 },
        ArgumentPerigee: { value: OrbitalElements.ArgumentPerigee, min: 0, max: 360 },
        TrueAnomaly: { value: OrbitalElements.TrueAnomaly, min: 0, max: 360 },
        // satelliteColor: { value: '#ff0000' }
      },
      { collapsed: true }
    ), // This makes it collapsed by default
    Visualization: folder(
      {
        // Define your controls here

        satelliteColor: { value: "#ff0000" },
      },
      { collapsed: true }
    ), // This makes it collapsed by default
     View: {
      options: ['Globe', 'Orthographic'],
      value: 'Globe',
     }
  },
  (values) => {
    // This callback runs whenever values change
    // console.log('Updated values:', values)
    // Update your scene based on the new values
    // For example:
    // satellite.position.x = values.orbitRadius
    // satellite.material.color.set(values.satelliteColor)

    OrbitalElements.SemiMajorAxis = values.SemiMajorAxis;
    OrbitalElements.Eccentricity = values.Eccentricity;
    OrbitalElements.Inclination = values.Inclination;
    OrbitalElements.RAAN = values.RAAN;
    OrbitalElements.ArgumentPerigee = values.ArgumentPerigee;
    // OrbitalElements.TrueAnomaly     = parseFloat(trueAnomaly.value)

    if (values.View === 'Orthographic' && viewState === viewStates.GLOBE) {
      transform();
    }

    if (values.View === 'Globe' && viewState === viewStates.ORTHO) {
      transform();
    }

    updateOrbit(OrbitalElements, simulationTime);
  }
);

function updateSimulationTime() {
  simulationTime += deltaTime;
}

const initialTime = new Date();
console.log(initialTime);
var newRotation = null;
function render(time) {
  // var result = JSON.parse(document.querySelector('#gui_container').innerHTML);
  // console.log(result)

  stats.begin();
  const timeNow = new Date();
  time = (timeNow.getTime() - initialTime.getTime()) / 1000.0;

  // if (true === mouseOverSlider) {
  //   // OrbitalElements.SemiMajorAxis   = parseFloat(semiMajorAxis.value)
  //   // OrbitalElements.Eccentricity    = parseFloat(eccentricity.value)
  //   // OrbitalElements.Inclination     = parseFloat(inclination.value)
  //   // OrbitalElements.RAAN            = parseFloat(RAAN.value)
  //   // OrbitalElements.ArgumentPerigee = parseFloat(argumentPerigee.value)
  //   // OrbitalElements.TrueAnomaly     = parseFloat(trueAnomaly.value)

  //   updateOrbit(OrbitalElements, simulationTime)
  // }
  updateOrbit(OrbitalElements, simulationTime);

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  var sunAngle = new THREE.Vector3(1.0, -0.25, 0.0);

  const earthRotation = constants.EARTH_ROTATION_RATE * simulationTime;
  const nearestTwoPi = earthRotation % constants.TWO_PI;

  

  switch (viewState) {
    case viewStates.GLOBE:
      // Only update simulation time in Orth and Globe view and not
      // in transition states
      updateSimulationTime();

      // Rotate the earth
      earth.rotation.y = earthRotation;

      
      // Add controls for rotation and zoom,
      // use GSAP to make smooth interpolation
      gsap.to(group.rotation, {
        y: mouse.x,
        x: mouse.y,
        duration: 1.5,
      });
      gsap.to(camera.position, {
        z: mouse.scroll,
        duration: 1.5,
      });

      
    
      break;

    case viewStates.TRANSITION_TO_ORTHO:
      gsap.to(orbitPlane.material, { opacity: 0.0, duration: 1.5 })
      gsap.to(nadirLine.material, { opacity: 0.0, duration: 1.5 })
      gsap.to(orbitLine.material, { opacity: 0.0, duration: 1.5 })
      gsap
      .to(camera.position, {
        y: 0,
        x: 0,
        z: 16,
        duration: 1.5,
      });
      gsap
        .timeline()
        .to(group.rotation, {
          y: 0,
          x: 0,
          duration: 1.5,
        })
        .to(earth.rotation, {
          y: earthRotation - nearestTwoPi - Math.PI / 2,
          duration: 1.5,
        })        
        .to(uniforms.flatten, {
          value: 1,
          duration: 1.5,
          onComplete: () => {
            uniforms.flatten.value = 1.0;
            viewState = viewStates.ORTHO;
          },
        });

      viewState = viewStates.WAIT;
      break;

    case viewStates.ORTHO:
      // Only update simulation time in Orth and Globe view and not
      // in transition states
      updateSimulationTime();

      gsap.to(camera.position, {
        x: -3 * mouse.x,
        y: 3 * mouse.y,
        z: 16,
        duration: 1.5,
      });
    

      satellite.visible = false;
      orbitLine.visible = false;
      orbitPlane.visible = false;
      nadirLine.visible = false;
      stars.visible = false;
      atmosphere.visible = false;
      ambientLight.visible = false;
      light.visible = false;

      break;
    case viewStates.TRANSITION_TO_GLOBE:
      satellite.visible = true;
      orbitLine.visible = true;   
      orbitPlane.visible = true;   
      nadirLine.visible = true;
      stars.visible = true;
      atmosphere.visible = true;
      ambientLight.visible = true;
      light.visible = true;
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: mouse.scroll,
        duration: 1.5,
      });

      gsap
        .timeline()
        .to(uniforms.flatten, {
          value: 0,
          duration: 1.0,
          ease: "none",
          onComplete: () => {
            uniforms.flatten.value = 0.0;
          },
        })
        .fromTo(
          earth.rotation,
          {
            y: earthRotation - nearestTwoPi - Math.PI / 2,
          },
          {
            y: earthRotation,
            duration: 1.5,
            ease: "none",
          }
        )
        .to(group.rotation, {
          y: mouse.x,
          x: mouse.y,
          duration: 1.5,
          onComplete: () => {
            viewState = viewStates.GLOBE;
            console.log("Finishing Transition to Globe");
          },
        }).to([
          orbitPlane.material,
          nadirLine.material,
          orbitLine.material
        ], {
          opacity: function(i) {
            // Return different opacity values based on index
            return i === 0 ? 0.08 : 1.0;
          },
          duration: 1.5
        });

      viewState = viewStates.WAIT;
      break;

    case viewStates.WAIT:
      break;
  }

  if (viewState != viewStates.GLOBE) {
    sunAngle.applyEuler(
      new THREE.Euler(0.0, earth.rotation.y - earthRotation, 0.0)
    );
  }

  sunAngle.applyEuler(group.rotation);

  earth.material.uniforms.sunDirection.value = sunAngle;

  stats.end();

  renderer.render(scene, camera);

  // console.log("Scene polycount:", renderer.info.render.triangles)
  // console.log("Active Drawcalls:", renderer.info.render.calls)
  // console.log("Textures in Memory", renderer.info.memory.textures)
  // console.log("Geometries in Memory", renderer.info.memory.geometries)

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

var previousMousePosition = {
  x: 0,
  y: 0,
};

addEventListener("mousedown", () => {
  isDragging = true;
});

addEventListener("mouseup", () => {
  isDragging = false;
});

var enableMouseControl = true;
addEventListener("mousemove", (event) => {
  // Check if we are in the leva container and disable rotation of globe if they are dragging sliders
  const levaContainer = document.querySelector('[class^="leva"]');
  if (levaContainer) {
    levaContainer.addEventListener("mouseenter", () => {
      enableMouseControl = false;
      console.log("Disabling mouse control");
    });

    levaContainer.addEventListener("mouseleave", () => {
      enableMouseControl = true;
      console.log("Enabling mouse control");
    });
  }

  if (enableMouseControl) {
    var xPosition = (event.clientX / innerWidth) * 2 - 1;
    var yPosition = (event.clientY / innerHeight) * 2 - 1;
    var deltaMove = {
      x: xPosition - previousMousePosition.x,
      y: yPosition - previousMousePosition.y,
    };
    if (true === isDragging) {
      mouse.x += deltaMove.x * 2;
      mouse.y += deltaMove.y * 2;
      mouse.y = Math.max(mouse.y, -Math.PI / 2);
      mouse.y = Math.min(mouse.y, Math.PI / 2);
    }
    previousMousePosition = {
      x: xPosition,
      y: yPosition,
    };
  }
});

addEventListener("wheel", (event) => {
  mouse.scroll += event.deltaY / 25;
  mouse.scroll = Math.max(12.0, mouse.scroll);
  mouse.scroll = Math.min(200.0, mouse.scroll);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}

animate();
