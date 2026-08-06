import { Application } from 'pixi.js';
import { SlotGame } from './game/SlotGame';

async function bootstrap() {
  const app = new Application();
  await app.init({ width: 800, height: 640, backgroundColor: 0x0a0a12 });

  document.getElementById('pixi-container')!.appendChild(app.canvas);

  new SlotGame(app);
}

bootstrap();
