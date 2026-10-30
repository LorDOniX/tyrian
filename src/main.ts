import './style.css';
import { createScene } from './scene';

const container = document.querySelector<HTMLElement>('#app');

if (!container) {
  throw new Error('Chybí kontejner #app.');
}

const dispose = createScene(container);

if (import.meta.hot) {
  import.meta.hot.dispose(dispose);
}
