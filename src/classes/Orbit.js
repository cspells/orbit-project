import * as THREE from 'three';
import * as constants from '../utils/Constants';
// import { LineGeometry, LineMaterial, Line2 } from 'three/examples/jsm/lines/LineGeometry.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import * as OrbitMath from '../utils/OrbitMath';
import { LoadingScreen } from '../utils/LoadingScreen';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GroundTrack } from './GroundTrack';

export class Orbit {
    constructor(loadingScreen) {
        this.loadingScreen = loadingScreen;
        this.gltfLoader = new GLTFLoader();
        this.groundTrackLineColor = new THREE.Color(constants.initialColor);
        this.lineColor = new THREE.Color(constants.initialColor);
        this.planeColor = new THREE.Color(constants.initialColor);
        this.groundTrack = new GroundTrack();
        this.createOrbitLine();
        this.createOrbitPlane();
        this.createNadirLine();
        this.createSatellite();
        this.satellitePosition = 0;
        this.orbitalElements = OrbitMath.OrbitalElements;
        this.orbitalElements.SemiMajorAxis = 26312;
        this.orbitalElements.Eccentricity = 0.75;
        this.orbitalElements.Inclination = 45;
        this.orbitalElements.RAAN = 225;
        this.orbitalElements.ArgumentPerigee = 225;
        this.orbitalElements.TrueAnomaly = 129;
    }

    async loadSatellite() {
        // Load the model
        this.loadingScreen.setLoadingText('Launching satellite...');
        const gltfModel = await new Promise((resolve, reject) => {
      this.gltfLoader.load(
        'model/Hubble.glb',
        (gltf) => {
          this.loadingScreen.updateProgress();
          resolve(gltf);
        },
        (xhr) => {
          // Additional progress tracking if needed
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          if (percentComplete < 25) {
            this.loadingScreen.setLoadingText('Launching satellite... 3');
          }
          else if(percentComplete < 50) {
            this.loadingScreen.setLoadingText('Launching satellite... 3, 2');
          }
          else if(percentComplete < 75) {
            this.loadingScreen.setLoadingText('Launching satellite... 3, 2, 1');
          }
          else if(percentComplete < 100) {
            this.loadingScreen.setLoadingText('Liftoff. All systems nominal.');
          }
        },
        (error) => {
          console.error('Error loading model:', error);
          reject(error);
        }
      );
    });

        this.satellite.add(gltfModel.scene);
    }

    createNadirLine() {
        var geometry = new LineGeometry();
        const positions = [];
        const colors = [];
        positions.push(10, 0, 0);
        positions.push(0, 10, 0);
        colors.push(1, 1, 1);
        colors.push(0.2, 0.2, 0.2);
        geometry.setPositions(positions);
        geometry.setColors(colors);
        const material = new LineMaterial({
          color:  this.groundTrackLineColor,
          linewidth: 1.0,
          vertexColors: true,
          transparent: true,
          opacity: 1.0,
        });
        material.resolution.set(window.innerWidth, window.innerHeight);
        this.nadirLine = new Line2(geometry, material);
    }

    createOrbitLine() {
        // Create a curve to interpolate points from orbit
        this.curve = new THREE.CatmullRomCurve3();
        this.curve.closed = true;
        this.curve.points = [
        new THREE.Vector3(-10, 0, 10),
        new THREE.Vector3(-5, 5, 5),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(5, -5, 5),
        new THREE.Vector3(10, 0, 10),
        ];

        const maxPoints = 200; // More than you expect to need
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxPoints * 3); // * 3 for x, y, z
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color:  this.lineColor,
            linewidth: 1.0,
            transparent: true,
            opacity: 1.0,
        });
        
        this.line = new THREE.Line(geometry, material);
    }

    createOrbitPlane() {

        const initialShape = new THREE.Shape();
        initialShape.moveTo(0, 0);
        initialShape.bezierCurveTo(1, 1, 1, 0, 0, 0); // Tiny initial shape
        const geometry = new THREE.ShapeGeometry(initialShape, 200);
        const material = new THREE.MeshBasicMaterial({
        color:  this.planeColor,
        opacity: 0.08,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false, 
        depthTest: true, 
        });
        
        this.plane = new THREE.Mesh(geometry, material);

        // Fix z-fighting with earth and orbit plane
        this.plane.renderOrder = 1; // Higher number renders later
    }

    createSatellite() {
        this.satellite = new THREE.Group();
        this.satellite.scale.set(0.05, 0.05, 0.05);

        this.loadSatellite();
        
    }

    updateOrbit(time) {
        const theta = OrbitMath.propagate(this.orbitalElements, time, 0);
        this.orbitalElements.TrueAnomaly = OrbitMath.rad2deg(theta);

        // Update orbit geometries
        const pts = OrbitMath.COE2IJK(this.orbitalElements, true, null, true);
        this.curve.points = pts;
        this.line.geometry.setFromPoints(this.curve.getPoints(199));
        this.plane.geometry.setFromPoints(this.curve.getPoints(199));

        // Update 3D satellite position
        const satelliteRIJK = OrbitMath.COE2IJK(this.orbitalElements, false, null, true);
        this.satellite.position.set(satelliteRIJK.x, satelliteRIJK.y, satelliteRIJK.z);

        const nadirPosition = new Float32Array([
            0,
            0,
            0, // Earth center
            satelliteRIJK.x,
            satelliteRIJK.y,
            satelliteRIJK.z, // Satellite position
        ]);
        this.nadirLine.geometry.setPositions(nadirPosition);

        // Update ground track
        this.groundTrack.update(time, this.orbitalElements);
        // const gpts = OrbitMath.computeGroundTrack(this.orbitalElements, time);
    }

    update(time) {
        this.updateOrbit(time);
    }

    setVisibility(visible) {
        this.line.visible = visible;
        this.plane.visible = visible;
        this.satellite.visible = visible;
    }
} 