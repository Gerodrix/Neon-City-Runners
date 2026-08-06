// RNG simple basado en Math.random(). Documentado por transparencia:
// para producción real de iGaming se usaría un RNG certificado (no Math.random),
// pero para un proyecto de portfolio esto es suficiente y queda aislado
// en este único módulo para poder reemplazarlo fácil el día de mañana.

export class RNG {
  /** Entero aleatorio en [0, maxExclusive). */
  static randomInt(maxExclusive: number): number {
    return Math.floor(Math.random() * maxExclusive);
  }

  /** Entero aleatorio en [min, max] inclusive. */
  static randomIntInRange(min: number, max: number): number {
    return min + RNG.randomInt(max - min + 1);
  }

  /** Fisher-Yates shuffle, no muta el array original. */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = RNG.randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Elige `count` índices únicos en [0, totalPositions) que no estén en `excluded`. */
  static uniqueRandomPositions(count: number, totalPositions: number, excluded: Set<number>): number[] {
    const available: number[] = [];
    for (let i = 0; i < totalPositions; i++) {
      if (!excluded.has(i)) available.push(i);
    }
    const shuffled = RNG.shuffle(available);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
