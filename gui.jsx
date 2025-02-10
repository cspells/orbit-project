import { useControls } from 'leva';
import React from 'react';
import ReactDOM from 'react-dom';

const Movie = () =>
  React.createElement('div', { className: 'movie-container' }, [
    React.createElement('h1', {}, 'Aquaman'),
    React.createElement('h2', {}, '2018-12-07'),
  ]);

const ControlPanel = () => {
  const { name, semiMajorAxis } = useControls({
    name: 'Leva',
    semiMajorAxis: 10000,
  });

  return (
    <div>
      <p>Name: {name}</p>
      <p>Semi-Major Axis: {semiMajorAxis}</p>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <ControlPanel />
      <Movie />
    </div>
  );
};

console.log(React);
ReactDOM.render(<App />, document.querySelector('#gui_container'));

// Add this line to export the App component as the default export
export default App;