import { SceneManager } from './classes/SceneManager';
import { Controls } from './classes/Controls';

const scene = new SceneManager();
const controls = new Controls(scene);

scene.render(0);