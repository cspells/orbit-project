import * as Constants from "./Constants";

// Computed map dimensions
const mapWidth = 2 * Math.PI * Constants.EARTH_SCALED_RADIUS; // Total width (x)
const mapHeight = Math.PI * Constants.EARTH_SCALED_RADIUS; // Total height (y)

export class MouseHandler {
  constructor(viewManager) {
    this.viewManager = viewManager;
    this.isDragging = false;
    this.mouse = {
      x: 0,
      y: 0,
      scroll: 10,
    };
    this.previousMousePosition = { x: 0, y: 0 };
    this.enableMouseControl = true;

    this.fovy = (this.viewManager.sceneManager.camera.fov * Math.PI) / 180; // converting from degrees to radians
    this.fovx =
      2 *
      Math.atan(
        Math.tan(this.fovy / 2) * this.viewManager.sceneManager.camera.aspect
      );

    // Minimum z distance where entire height becomes visible
    this.maxZForFullHeight =
      mapHeight / (2 * Math.tan(this.fovy / 2)) + Constants.EARTH_SCALED_RADIUS;

    this.setupEventListeners();
  }

  setupEventListeners() {
    addEventListener("mousedown", () => (this.isDragging = true));
    addEventListener("mouseup", () => (this.isDragging = false));
    addEventListener("mousemove", this.handleMouseMove.bind(this));
    addEventListener("wheel", this.handleWheel.bind(this));
  }

  getVisibleDimensions(zDistance) {
    const zDistance2 = zDistance - Constants.EARTH_SCALED_RADIUS;
    // At any z distance, visible width = 2 * z * tan(fovx/2)
    const visibleWidth = 2 * zDistance2 * Math.tan(this.fovx / 2);
    const visibleHeight = 2 * zDistance2 * Math.tan(this.fovy / 2);
    return { visibleWidth, visibleHeight };
  }

  // Maximum x offset at a given z (to keep map edges at view boundaries)
  getMaxXOffset(zDistance) {
    const { visibleWidth } = this.getVisibleDimensions(zDistance);
    return Math.max(0, mapWidth / 2 - visibleWidth / 2);
  }

  // Maximum y offset at a given z
  getMaxYOffset(zDistance) {
    const { visibleHeight } = this.getVisibleDimensions(zDistance);
    return Math.max(0, mapHeight / 2 - visibleHeight / 2);
  }

  limitOrthoMouse() {
    const x_limit = this.getMaxXOffset(this.mouse.scroll) + 0.1;
    const y_limit = this.getMaxYOffset(this.mouse.scroll) + 0.1;
    this.mouse.x = Math.max(Math.min(this.mouse.x, x_limit), -x_limit);
    this.mouse.y = Math.max(Math.min(this.mouse.y, y_limit), -y_limit);
  }

  handleMouseMove(event) {
    // Check if we are in the leva container and disable rotation of globe if they are dragging sliders
    const levaContainer = document.querySelector('[class^="leva"]');
    if (levaContainer) {
      levaContainer.addEventListener("mouseenter", () => {
        this.enableMouseControl = false;
        console.log("Disabling mouse control");
      });

      levaContainer.addEventListener("mouseleave", () => {
        this.enableMouseControl = true;
        console.log("Enabling mouse control");
      });
    }

    if (this.enableMouseControl) {
      var xPosition = (event.clientX / innerWidth) * 2 - 1;
      var yPosition = (event.clientY / innerHeight) * 2 - 1;
      var deltaMove = {
        x: xPosition - this.previousMousePosition.x,
        y: yPosition - this.previousMousePosition.y,
      };
      if (true === this.isDragging) {
        if (this.viewManager.currentState === Constants.VIEW_STATES.GLOBE) {
          this.mouse.x += deltaMove.x * 2;
          this.mouse.y += deltaMove.y * 2;
          this.mouse.y = Math.max(this.mouse.y, -Math.PI / 2);
          this.mouse.y = Math.min(this.mouse.y, Math.PI / 2);
        } else if (
          this.viewManager.currentState === Constants.VIEW_STATES.ORTHO
        ) {
          this.mouse.x -= deltaMove.x * 8;
          this.mouse.y += deltaMove.y * 8;
          this.limitOrthoMouse();
        }
      }

      this.previousMousePosition = {
        x: xPosition,
        y: yPosition,
      };
    }
  }

  handleWheel(event) {
    this.mouse.scroll += event.deltaY / 25;
    this.mouse.scroll = Math.max(
      Constants.EARTH_SCALED_RADIUS * 1.25,
      this.mouse.scroll
    );
    this.mouse.scroll = Math.min(200.0, this.mouse.scroll);
    if (
      this.viewManager.currentState === Constants.VIEW_STATES.ORTHO ||
      this.viewManager.currentState ===
        Constants.VIEW_STATES.TRANSITION_TO_ORTHO
    ) {
      this.mouse.scroll = Math.min(this.maxZForFullHeight, this.mouse.scroll);
      this.limitOrthoMouse();
    }
  }
}
