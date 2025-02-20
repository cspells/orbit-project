import { folder } from "leva";
import { createLevaControls } from "../utils/LevaWrapper";
import * as Constants from "../utils/Constants";
import * as OrbitMath from "../utils/OrbitMath";

export class Controls {
  constructor(scene) {
    this.scene = scene;

    this.initialColors = {
      GroundTrackLineColor: "#59ff00",
      OrbitLineColor: "#59ff00",
      OrbitPlaneColor: "#59ff00",
    };

    this.setupControls();

    this.interval = setInterval(() => {
      this.update();
    }, 100);
  }

  setupControls() {
    const { cleanup, set } = createLevaControls(
      {
        "Orbit Info": folder({
          "Orbital Elements": folder(
            {
              SemiMajorAxis: {
                value: this.scene.orbit.orbitalElements.SemiMajorAxis,
                min: 5200,
                max: 100000,
              },
              Eccentricity: {
                value: this.scene.orbit.orbitalElements.Eccentricity,
                min: 0,
                max: 0.999,
                step: 0.01,
              },
              Inclination: {
                value: this.scene.orbit.orbitalElements.Inclination,
                min: 0,
                max: 180,
              },
              RAAN: {
                value: this.scene.orbit.orbitalElements.RAAN,
                min: 0,
                max: 360,
              },
              ArgumentPerigee: {
                value: this.scene.orbit.orbitalElements.ArgumentPerigee,
                min: 0,
                max: 360,
              },
              TrueAnomaly: {
                value: this.scene.orbit.orbitalElements.TrueAnomaly,
                min: -180,
                max: 180,
              },
            },
            { collapsed: true }
          ),
          Position: [0, 0, 0],
          Velocity: [0, 0, 0],
        }),
        Visualization: folder(
          {
            GroundTrackLineColor: {
              value: "#59ff00",
            },
            OrbitLineColor: {
              value: "#59ff00",
            },
            OrbitPlaneColor: {
              value: "#59ff00",
            },
          },
          { collapsed: true }
        ),
        View: {
          options: ["Globe", "Orthographic"],
          value: "Globe",
        },
      },
      this.handleControlsUpdate.bind(this)
    );

    this.set = set;
    this.cleanup = cleanup;
  }

  handleControlsUpdate(values) {
    // Update orbital elements
    this.scene.orbit.orbitalElements.SemiMajorAxis = values.SemiMajorAxis;
    this.scene.orbit.orbitalElements.Eccentricity = values.Eccentricity;
    this.scene.orbit.orbitalElements.Inclination = values.Inclination;
    this.scene.orbit.orbitalElements.RAAN = values.RAAN;
    this.scene.orbit.orbitalElements.ArgumentPerigee = values.ArgumentPerigee;
    this.scene.orbit.orbitalElements.TrueAnomaly = values.TrueAnomaly;

    this.scene.orbit.plane.material.color.set(values.OrbitPlaneColor);
    this.scene.orbit.line.material.color.set(values.OrbitLineColor);
    this.scene.orbit.nadirLine.material.color.set(values.GroundTrackLineColor);
    this.scene.orbit.groundTrack.setColor(values.GroundTrackLineColor);

    // Handle view state changes
    if (
      values.View === "Orthographic" &&
      this.scene.viewManager.currentState === Constants.VIEW_STATES.GLOBE
    ) {
      this.scene.viewManager.transform();
    }

    if (
      values.View === "Globe" &&
      this.scene.viewManager.currentState === Constants.VIEW_STATES.ORTHO
    ) {
      this.scene.viewManager.transform();
    }
  }

  update() {
    this.set({ TrueAnomaly: this.scene.orbit.orbitalElements.TrueAnomaly });
    const satelliteRIJK = OrbitMath.COE2IJK(
      this.scene.orbit.orbitalElements,
      false,
      null,
      false
    );
    this.set({ Position: [satelliteRIJK.x, satelliteRIJK.y, satelliteRIJK.z] });
  }

  dispose() {
    if (this.cleanup) {
      this.cleanup();
    }
    clearInterval(this.interval);
  }
}
