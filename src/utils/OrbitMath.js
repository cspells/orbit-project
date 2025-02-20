import { matrix, multiply } from "mathjs";
import { Vector3 } from "three";
import * as Constants from "./Constants";

const OrbitTypes = {
  ELLIPTICAL: "Elliptical",
  PARABOLIC: "Parabolic",
  HYPERBOLIC: "Hyperbolic",
};

const TimeUnits = {
  SECONDS: "Seconds",
  MINUTES: "Minutes",
  HOURS: "Hours",
};

export function deg2rad(degrees) {
  return degrees * (Constants.PI / 180);
}

export function rad2deg(radians) {
  return radians * (180 / Constants.PI);
}

export function NewtonMethod(E, f, df, e, Maxiter) {
  // Inputs:
  //   M is the initial value
  //   f is the function handle
  //   df is the derivative of the function handle
  //   e is the error in decimal form
  //   Maxiter is the total number of allowed iterations
  // Outputs:
  //   X is the approximate final value
  var diff = 1;
  var iter = 0;
  while (diff > e) {
    var Enew = E - f(E) / df(E);
    diff = Math.abs(Enew - E);
    iter = iter + 1;
    E = Enew;
    if (iter >= Maxiter) {
      console.log("Newton Method: ");
      console.log("  Maximum number of iterations reached.");
      break;
    }
  }
  return E;
}

export const OrbitalElements = {
  OrbitType: OrbitTypes.ELLIPTICAL,
  TimeUnit: TimeUnits.SECONDS,
  Momentum: 0.0,
  Eccentricity: 0.0,
  SemiLatusRectum: 0.0, // [km]
  SemiMajorAxis: 0.0, // [km]
  Period: 0.0, // [Depends on Time Units]
  RadiusPerigee: 0.0, // [km]
  RadiusApogee: 0.0, // [km]
  Inclination: 0.0, // [Degrees]
  RAAN: 0.0, // [Degrees]
  ArgumentPerigee: 0.0, // [Degrees]
  TrueAnomaly: 0.0, // [Degrees]
  NewTrueAnomaly: 0.0, // [Degrees]
  IntEccentricAnomaly: 0.0, // [Degrees]
  IntMeanAnomaly: 0.0, // [Degrees]
  TimeSincePeriapsis: 0.0, // [Depends on Time Units]
  NewPosition: 0.0, // [km]
  NewVelocity: 0.0, // [km]
  ThetaInfinity: 0.0, // [Degrees]
  VelocityInfinity: 0.0, // [Degrees]
  ImpactParameter: 0.0, // [km]
  DeltaTime: 0.0,
};

const OrbitECEFState = {
  Position: [0.0, 0.0, 0.0], // [km]
  Velocity: [0.0, 0.0, 0.0], // [km/s]
};

export function mod(q, m) {
  if (m == 0) {
    return q;
  }

  const result = q % m;
  return (result >= 0 && m > 0) || (q <= 0 && m < 0) ? result : result + m;
}

export function COE2IJK(
  OrbitalElementsIn,
  computeFullOrbit = false,
  trueAnomalyRadians = null,
  rotateForCamera = false
) {
  var a = OrbitalElementsIn.SemiMajorAxis,
    e = OrbitalElementsIn.Eccentricity,
    i = deg2rad(OrbitalElementsIn.Inclination),
    Omega = deg2rad(OrbitalElementsIn.RAAN),
    omega = deg2rad(OrbitalElementsIn.ArgumentPerigee);
  if (trueAnomalyRadians == null) {
    trueAnomalyRadians = deg2rad(OrbitalElementsIn.TrueAnomaly);
  }

  // Compute the semi-latus rectum (pg 37 of Lilly)
  var P = a * (1 - e ** 2);

  var c_omega = Math.cos(omega);
  var s_omega = Math.sin(omega);
  var c_Omega = Math.cos(Omega);
  var s_Omega = Math.sin(Omega);
  var c_i = Math.cos(i);
  var s_i = Math.sin(i);

  // Create alpha matrix
  const alphaPQW2IJK = matrix([
    [
      c_omega * c_Omega - s_omega * c_i * s_Omega,
      -s_omega * c_Omega - c_omega * c_i * s_Omega,
      s_i * s_Omega,
    ],
    [
      c_omega * s_Omega + s_omega * c_i * c_Omega,
      -s_omega * s_Omega + c_omega * c_i * c_Omega,
      -s_i * c_Omega,
    ],
    [s_omega * s_i, c_omega * s_i, c_i],
  ]);

  function computePosition(thetaRadians) {
    var r = P / (1 + e * Math.cos(thetaRadians));
    var rplane = matrix([
      r * Math.cos(thetaRadians),
      r * Math.sin(thetaRadians),
      0,
    ]);

    var RIJK = multiply(multiply(alphaPQW2IJK, rplane), 1 / 1000.0);
    var RIJKVector;
    if (rotateForCamera) {
      RIJKVector = new Vector3(RIJK._data[0], RIJK._data[2], -RIJK._data[1]);
    } else {
      RIJKVector = new Vector3(RIJK._data[0], RIJK._data[1], RIJK._data[2]);
    }

    return RIJKVector;
  }

  if (computeFullOrbit) {
    const points = [];
    for (var theta = 0; theta < Constants.TWO_PI; theta += Constants.PI / 100) {
      points.push(computePosition(theta));
    }
    return points;
  } else {
    return computePosition(trueAnomalyRadians);
  }
}

export function computePeriod(OrbitalElementsIn) {
  return (
    Constants.TWO_PI *
    Math.sqrt(Math.pow(OrbitalElementsIn.SemiMajorAxis, 3) / Constants.MUE)
  );
}

export function propagate(OrbitalElementsIn, deltaTime, thetaRadians) {
  // Compute period of orbit
  const P = computePeriod(OrbitalElementsIn);
  const e = OrbitalElementsIn.Eccentricity;
  // thetaRadians = thetaRadians * (Math.PI/180.0)
  // const Theta = OrbitalElementsIn.TrueAnomaly;

  // Mean Motion
  const n = Constants.TWO_PI / P;
  // Eccentric Anomaly
  var E = Math.acos(
    (e + Math.cos(thetaRadians)) / (1 + e * Math.cos(thetaRadians))
  );

  E = mod(E, Constants.TWO_PI);
  if (mod(thetaRadians, Constants.TWO_PI) > Constants.PI) {
    E = Constants.TWO_PI - E;
  }

  // Mean Anomaly
  var M = E - e * Math.sin(E);
  // First time since periapsis
  const tp = M / n;

  OrbitalElementsIn.IntEccentricAnomaly = rad2deg(E);
  OrbitalElementsIn.IntMeanAnomaly = rad2deg(M);
  OrbitalElementsIn.TimeSincePeriapsis = tp;

  // Propogate time
  var t = tp + deltaTime;
  // Find new Mean Anomaly
  M = n * t;
  // Ensure the Mean Anomaly is less than 2*pi
  M = mod(M, Constants.TWO_PI);
  // Find Eccentric Anomaly from new Mean Anomaly using Newton
  // Method
  const f = (x) => x - e * Math.sin(x) - M;
  const df = (x) => 1 - e * Math.cos(x);

  E = NewtonMethod(M, f, df, 1e-4, 10);

  // console.log(f(E))
  // console.log("M:", rad2deg(M))
  // console.log("E:", rad2deg(E))

  // Find new theta
  const Theta2 = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
  // OrbitalElementsIn.TrueAnomaly = Theta2 * ( 180 / Math.PI );
  return Theta2; // * ( 180.0 / Math.PI );
}

export function computeGroundTrack(OrbitalElementsIn, startTime = 0) {
  // startTime = 0
  const GWOff = 0 * Constants.EARTH_ROTATION_RATE * startTime;
  const geodetic = [];
  const P = computePeriod(OrbitalElementsIn);

  var initialThetaRadians = deg2rad(OrbitalElementsIn.TrueAnomaly);
  for (var percentOrbit = 0; percentOrbit <= 30.0; percentOrbit += 0.1) {
    var elapsedTime = (-P * percentOrbit) / 100.0; // + startTime;
    const thetaRadians = propagate(
      OrbitalElementsIn,
      elapsedTime,
      initialThetaRadians
    );
    // console.log("Initial Theta:", rad2deg(initialThetaRadians))
    // console.log("Elapsed Time:", elapsedTime, "Theta:", rad2deg(thetaRadians))
    var RIJK = COE2IJK(OrbitalElementsIn, false, thetaRadians);
    var Long =
      Math.atan2(RIJK.y, RIJK.x) -
      (GWOff + Constants.EARTH_ROTATION_RATE * (elapsedTime + startTime));
    var Lat = Math.asin(RIJK.z / RIJK.length());

    geodetic.push([rad2deg(Long), rad2deg(Lat)]);
  }

  return geodetic;
}
