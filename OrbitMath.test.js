import { expect, test } from 'vitest'
import {mod, NewtonMethod, propagate, OrbitalElements, deg2rad, rad2deg} from "./OrbitMath"

test('mod(54, 321) -> 54', () => {
    expect(mod(54, 321)).toBe(54);
});

test('mod(-50, 512) -> 462', () => {
    expect(mod(-50, 512)).toBe(462);
});

test('mod(54, -152) -> -98', () => {
    expect(mod(54, -152)).toBe(-98);
});

test('mod(-500, 300) -> 100', () => {
    expect(mod(-500, 300)).toBe(100);
});

test('mod(512, 0) -> 512', () => {
    expect(mod(-500, 300)).toBe(100);
});

test('mod(0, 52) -> 0', () => {
    expect(mod(0, 52)).toBe(0);
});


test('NewtonMethod cos(x) - x  x0 = 1', () => {
    const f = (x) => Math.cos(x) - x;
    const df = (x) => -Math.sin(x) - 1;
    expect(NewtonMethod(1,f,df,1e-4,10)).toBeCloseTo(0.7390851332, 3);
});

test('NewtonMethod x^3 - 7x^2 + 8x - 3  x0=5', () => {
    const f = (x) => x**3 - 7*x**2 + 8*x - 3;
    const df = (x) => 3*x**2 - 14*x + 8;
    expect(NewtonMethod(5,f,df,1e-4,10)).toBeCloseTo(5.68577952608963, 3);
});

test('propagate', () => {

    const coe = OrbitalElements;
    coe.SemiMajorAxis = 42000;
    coe.Eccentricity = 0.67;
    coe.TrueAnomaly = 92;

    const theta = propagate(coe, -36000, deg2rad(coe.TrueAnomaly))  
    expect(coe.TimeSincePeriapsis).toBeCloseTo(4823.9, 1);
    expect(rad2deg(theta)).toBeCloseTo(-166.4787, 3);
});