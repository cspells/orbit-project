import { useControls } from 'leva';
import React from 'react';

const ControlPanel = ({ onChange }) => {
  const { semiMajorAxis, eccentricity, inclination, RAAN, argumentPerigee, trueAnomaly } = useControls({
    semiMajorAxis: { value: 10000, min: 0, max: 20000, step: 100 },
    eccentricity: { value: 0.1, min: 0, max: 1, step: 0.01 },
    inclination: { value: 0, min: 0, max: 180, step: 1 },
    RAAN: { value: 0, min: 0, max: 360, step: 1 },
    argumentPerigee: { value: 0, min: 0, max: 360, step: 1 },
    trueAnomaly: { value: 0, min: 0, max: 360, step: 1 },
  });

  React.useEffect(() => {
    onChange({ semiMajorAxis, eccentricity, inclination, RAAN, argumentPerigee, trueAnomaly });
  }, [semiMajorAxis, eccentricity, inclination, RAAN, argumentPerigee, trueAnomaly]);

  return (
    <div>
      <p>Semi-Major Axis: {semiMajorAxis}</p>
      <p>Eccentricity: {eccentricity}</p>
      <p>Inclination: {inclination}</p>
      <p>RAAN: {RAAN}</p>
      <p>Argument of Perigee: {argumentPerigee}</p>
      <p>True Anomaly: {trueAnomaly}</p>
    </div>
  );
};

const App = ({ onChange }) => {
  return (
    <div>
      <ControlPanel onChange={onChange} />
    </div>
  );
};

export default App;