export const PROJECTION_AR = 2;
export const CANVAS_WIDTH = 4 * 1.5 * 1.5 * 1080;
export const CANVAS_HEIGHT = CANVAS_WIDTH / PROJECTION_AR;

export const PI = Math.PI;
export const TWO_PI = 2 * PI;
export const MUE = 0.3986e6; // 3.986004418e14;
export const EARTH_ROTATION_PERIOD = 23 * 3600 + 56 * 60 + 4.1;
export const EARTH_ROTATION_RATE = TWO_PI / EARTH_ROTATION_PERIOD;
export const EARTH_SCALED_RADIUS = 6.3781;

export const EPS = 0.0001;

export const initialColor = 0x59ff00;

export const VIEW_STATES = {
  GLOBE: "GLOBE",
  ORTHO: "ORTHO",
  TRANSITION_TO_ORTHO: "TRANSITION_TO_ORTHO",
  TRANSITION_TO_GLOBE: "TRANSITION_TO_GLOBE",
  WAIT: "WAIT",
};
