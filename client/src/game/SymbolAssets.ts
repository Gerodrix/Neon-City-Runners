import { Assets, Texture } from 'pixi.js';

// Ruta esperada de cada símbolo. El nombre de archivo tiene que coincidir
// exactamente con el SymbolId del backend (server/src/slot/Symbol.ts).
// Ver docs/GDD.md sección 10.9 para el brief de producción completo.
export const SYMBOL_ASSET_PATHS: Record<string, string> = {
  RUNNER: '/assets/symbols/RUNNER.png',
  NETRUNNER: '/assets/symbols/NETRUNNER.png',
  CYBERDOG: '/assets/symbols/CYBERDOG.png',
  DRONE: '/assets/symbols/DRONE.png',
  A: '/assets/symbols/A.png',
  K: '/assets/symbols/K.png',
  Q: '/assets/symbols/Q.png',
  J: '/assets/symbols/J.png',
  CORE: '/assets/symbols/CORE.png',
  WILD: '/assets/symbols/WILD.png',
  SCATTER: '/assets/symbols/SCATTER.png',
};

const textureCache = new Map<string, Texture>();

/**
 * Intenta cargar el arte final de cada símbolo desde client/public/assets/symbols/.
 * Los que todavía no existen ahí se ignoran en silencio (Promise.allSettled) —
 * SlotGame cae al placeholder de color para esos casos. Así el arte se puede
 * ir soltando de a un archivo por vez sin romper el juego ni tocar código.
 */
export async function loadSymbolTextures(): Promise<void> {
  const entries = Object.entries(SYMBOL_ASSET_PATHS);

  const results = await Promise.allSettled(
    entries.map(async ([symbolId, path]) => {
      const texture = await Assets.load(path);
      return { symbolId, texture };
    })
  );

  let loadedCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      textureCache.set(result.value.symbolId, result.value.texture);
      loadedCount++;
    }
    // rechazado = el archivo todavía no existe -> se ignora, sigue el placeholder
  }

  console.log(`Sprites finales cargados: ${loadedCount}/${entries.length}`);
}

export function getSymbolTexture(symbolId: string): Texture | undefined {
  return textureCache.get(symbolId);
}
