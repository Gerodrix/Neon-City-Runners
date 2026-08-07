import { Ticker } from 'pixi.js';

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  // Rebote sutil (overshoot + settle) — usado para el aterrizaje de símbolos.
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Anima un valor de `from` a `to` en `durationMs`, llamando a `onUpdate` en cada frame
 * vía el Ticker compartido de PixiJS. Resuelve la promesa cuando termina.
 */
export function tweenValue(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
  easing: EasingFn = Easing.easeOutQuad
): Promise<void> {
  return new Promise((resolve) => {
    let elapsedMs = 0;

    const step = (ticker: Ticker) => {
      elapsedMs += ticker.deltaMS;
      const t = Math.min(elapsedMs / durationMs, 1);
      onUpdate(from + (to - from) * easing(t));

      if (t >= 1) {
        Ticker.shared.remove(step);
        resolve();
      }
    };

    Ticker.shared.add(step);
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
