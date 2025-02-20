import * as THREE from 'three';
import { computeGroundTrack } from '../utils/OrbitMath';
import * as d3 from "d3";
import * as constants from '../utils/Constants';

export class GroundTrack {
    constructor() {
        this.setupCanvas();
        this.createTexture();
    }

    setupCanvas() {
        this.projection = d3
            .geoEquirectangular()
            .translate([
                constants.CANVAS_WIDTH / 2,
                constants.CANVAS_HEIGHT / 2,
            ])
            .scale(
                Math.min(
                constants.CANVAS_WIDTH / constants.PROJECTION_AR / Math.PI,
                constants.CANVAS_HEIGHT / Math.PI
                )
            ); // D3 geo projection for canvas
    }

    createTexture() {
        // Append canvas and save reference
        const groundPlotCanvas = d3
        .select("body")
        .append("canvas")
        .attr("background", "#ff0000")
        .attr("width", constants.CANVAS_WIDTH )
        .attr("height", constants.CANVAS_HEIGHT );

        // Get 2d context of canvas
        this.context = groundPlotCanvas.node().getContext("2d");

        // Create geo path generator
        this.path = d3.geoPath().projection(this.projection).context(this.context);

        // Draw features from geojson
        this.context.strokeStyle = "#59ff00";
        this.context.lineWidth = 3.0; //3.25;
        this.context.beginPath();

        // Generate texture from canvas
        this.texture = new THREE.CanvasTexture(groundPlotCanvas.node());
        this.texture.anisotropy = 16;
        this.texture.needsUpdate = true;

        // Remove canvas
        groundPlotCanvas.remove();
        // uniforms.mapTexture.value = texture;

        this.context.beginPath();
        this.path({
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
        this.context.fill();
        this.context.stroke();
        this.context.closePath();

        console.log(d3.select("path.Feature").remove());

        this.context.clearRect(
        0,
        0,
        constants.CANVAS_WIDTH,
        constants.CANVAS_HEIGHT  
        );
        this.texture.needsUpdate = true;
    }

    clearTrack() {
        // Clear the entire canvas
        this.context.clearRect(
            0,
            0,
            constants.CANVAS_WIDTH,
            constants.CANVAS_HEIGHT  
        );
    }

    setColor(color) {
        this.context.strokeStyle = color;
    }

    update(time, orbitalElements) 
    {
        this.clearTrack();
        // Update ground track
        const gpts = computeGroundTrack(orbitalElements, time);

        this.context.beginPath();
        this.path({
            type: "Feature",
            geometry: {
            type: "LineString",
            coordinates: gpts,
            },
        });
        this.context.fill();
        this.context.stroke();
        this.context.closePath();

        this.texture.needsUpdate = true;
    }

    getTexture() {
        return this.texture;
    }

    dispose() {
        this.texture.dispose();
    }
} 