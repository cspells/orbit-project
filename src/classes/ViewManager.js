import { gsap } from "gsap";
import * as Constants from "../utils/Constants";
import { MouseHandler } from "../utils/MouseHandler";

export class ViewManager {
  constructor(sceneManager, uniforms) {
    this.sceneManager = sceneManager;
    this.uniforms = uniforms;
    this.currentState = Constants.VIEW_STATES.GLOBE;
    this.mouseHandler = new MouseHandler(this);
  }

  transform() {
    console.log("transform");
    switch (this.currentState) {
      case Constants.VIEW_STATES.GLOBE:
        this.transitionToOrtho();
        break;
      case Constants.VIEW_STATES.ORTHO:
        this.transitionToGlobe();
        break;
    }
  }

  transitionToOrtho() {
    gsap.to(this.sceneManager.orbit.plane.material, {
      opacity: 0.0,
      duration: 1.5,
    });
    gsap.to(this.sceneManager.orbit.nadirLine.material, {
      opacity: 0.0,
      duration: 1.5,
    });
    gsap.to(this.sceneManager.orbit.line.material, {
      opacity: 0.0,
      duration: 1.5,
    });

    this.mouseHandler.mouse.x = 0.0;
    this.mouseHandler.mouse.y = 0.0;

    // gsap.to(this.sceneManager.camera.position, {
    //   y: 0,
    //   x: 0,
    //   z: this.mouseHandler.mouse.scroll,
    //   duration: 1.5,
    // });
    const newEarthRotation =
      this.sceneManager.earth.earthRotation - this.nearestTwoPi;
    gsap
      .timeline()
      .to(
        [
          this.sceneManager.group.rotation,
          this.sceneManager.earth.mesh.rotation,
        ],
        {
          y: function (i) {
            // Return different opacity values based on index
            if (i === 0) {
              return -Math.PI / 2;
            } else {
              return newEarthRotation;
            }
          },
          x: 0,
          duration: 3.0,
          ease: "none",
        }
      )
      .to(this.sceneManager.earth.uniforms.flatten, {
        value: 1,
        duration: 1.5,
        onComplete: () => {
          this.sceneManager.earth.uniforms.flatten.value = 1.0;
          this.currentState = Constants.VIEW_STATES.ORTHO;
        },
      });

    this.currentState = Constants.VIEW_STATES.WAIT;
  }

  transitionToGlobe() {
    gsap.to(this.sceneManager.camera.position, {
      x: 0,
      y: 0,
      z: this.mouseHandler.mouse.scroll,
      duration: 1.5,
    });

    this.mouseHandler.mouse.x = -Math.PI / 2;
    this.mouseHandler.mouse.y = 0.0;

    gsap
      .timeline()
      .to(this.sceneManager.earth.uniforms.flatten, {
        value: 0,
        duration: 1.0,
        ease: "none",
        onComplete: () => {
          this.sceneManager.earth.uniforms.flatten.value = 0.0;
        },
      })
      .fromTo(
        this.sceneManager.earth.mesh.rotation,
        {
          y:
            this.sceneManager.earth.earthRotation -
            this.nearestTwoPi -
            (0.0 * Math.PI) / 2,
        },
        {
          y: this.sceneManager.earth.earthRotation,
          duration: 1.5,
          ease: "none",
        }
      )
      .to(this.sceneManager.group.rotation, {
        y: this.mouseHandler.mouse.x,
        x: this.mouseHandler.mouse.y,
        duration: 1.5,
        onComplete: () => {
          this.currentState = Constants.VIEW_STATES.GLOBE;
          console.log("Finishing Transition to Globe");
        },
      })
      .to(
        [
          this.sceneManager.orbit.plane.material,
          this.sceneManager.orbit.nadirLine.material,
          this.sceneManager.orbit.line.material,
        ],
        {
          opacity: function (i) {
            // Return different opacity values based on index
            return i === 0 ? 0.08 : 1.0;
          },
          duration: 1.5,
        }
      );

    this.currentState = Constants.VIEW_STATES.WAIT;
  }

  updateOrthoView(time) {
    gsap.to(this.sceneManager.camera.position, {
      x: this.mouseHandler.mouse.x,
      y: this.mouseHandler.mouse.y,
      z: this.mouseHandler.mouse.scroll, // 16
      duration: 1.5,
    });
  }

  updateGlobeView(time) {
    // Rotate the earth
    this.sceneManager.earth.rotate();

    // Add controls for rotation and zoom,
    // use GSAP to make smooth interpolation
    gsap.to(this.sceneManager.group.rotation, {
      y: this.mouseHandler.mouse.x,
      x: this.mouseHandler.mouse.y,
      duration: 1.5,
    });
    gsap.to(this.sceneManager.camera.position, {
      z: this.mouseHandler.mouse.scroll,
      duration: 1.5,
    });
  }

  update(time) {
    this.nearestTwoPi =
      this.sceneManager.earth.earthRotation % Constants.TWO_PI;
    // Update logic based on current state
    switch (this.currentState) {
      case Constants.VIEW_STATES.GLOBE:
        this.updateGlobeView(time);
        break;
      case Constants.VIEW_STATES.ORTHO:
        this.updateOrthoView(time);
        break;
      // ... other state updates ...
    }

    this.sceneManager.earth.updateSunDirection(
      this.sceneManager.group.rotation,
      this.currentState
    );
  }
}
