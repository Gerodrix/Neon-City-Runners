import { Application } from 'pixi.js';
import { SlotGame } from './game/SlotGame';
import { loadSymbolTextures } from './game/SymbolAssets';

async function bootstrap() {
  const app = new Application();
  await app.init({ width: 800, height: 640, backgroundColor: 0x0a0a12 });

  document.getElementById('pixi-container')!.appendChild(app.canvas);

  // Carga el arte final que ya exista en public/assets/symbols/ — los símbolos
  // sin archivo todavía se resuelven con el placeholder de color (ver SlotGame.renderGrid).
  await loadSymbolTextures();

  new SlotGame(app);
}

bootstrap();
