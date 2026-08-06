// Tipos base de símbolos y su definición (nombre, si es wild/scatter/core, tabla de pago).

export type SymbolId =
  | 'RUNNER'
  | 'NETRUNNER'
  | 'CYBERDOG'
  | 'DRONE'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'CORE'
  | 'SCATTER'
  | 'WILD';

export interface SymbolPayout {
  three: number;
  four: number;
  five: number;
}

export interface SymbolDefinition {
  id: SymbolId;
  name: string;
  isWild: boolean;
  isScatter: boolean;
  isCore: boolean;
  /** Pago en monedas por unidad de apuesta por línea. Ausente = sin pago directo (CORE, WILD en v1). */
  payout?: SymbolPayout;
}

export const SYMBOL_DEFINITIONS: Record<SymbolId, SymbolDefinition> = {
  RUNNER: { id: 'RUNNER', name: 'Runner', isWild: false, isScatter: false, isCore: false, payout: { three: 5, four: 25, five: 100 } },
  NETRUNNER: { id: 'NETRUNNER', name: 'Netrunner', isWild: false, isScatter: false, isCore: false, payout: { three: 4, four: 20, five: 75 } },
  CYBERDOG: { id: 'CYBERDOG', name: 'CyberDog', isWild: false, isScatter: false, isCore: false, payout: { three: 3, four: 15, five: 50 } },
  DRONE: { id: 'DRONE', name: 'Drone', isWild: false, isScatter: false, isCore: false, payout: { three: 2, four: 10, five: 35 } },
  A: { id: 'A', name: 'A', isWild: false, isScatter: false, isCore: false, payout: { three: 1, four: 5, five: 20 } },
  K: { id: 'K', name: 'K', isWild: false, isScatter: false, isCore: false, payout: { three: 1, four: 4, five: 15 } },
  Q: { id: 'Q', name: 'Q', isWild: false, isScatter: false, isCore: false, payout: { three: 0.5, four: 3, five: 10 } },
  J: { id: 'J', name: 'J', isWild: false, isScatter: false, isCore: false, payout: { three: 0.5, four: 2, five: 8 } },
  CORE: { id: 'CORE', name: 'Core AI', isWild: false, isScatter: false, isCore: true },
  SCATTER: { id: 'SCATTER', name: 'Data Vault', isWild: false, isScatter: true, isCore: false },
  WILD: { id: 'WILD', name: 'Glitch', isWild: true, isScatter: false, isCore: false },
};
