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
  RUNNER: { id: 'RUNNER', name: 'Runner', isWild: false, isScatter: false, isCore: false, payout: { three: 6.5, four: 34, five: 136 } },
  NETRUNNER: { id: 'NETRUNNER', name: 'Netrunner', isWild: false, isScatter: false, isCore: false, payout: { three: 5.5, four: 27, five: 103 } },
  CYBERDOG: { id: 'CYBERDOG', name: 'CyberDog', isWild: false, isScatter: false, isCore: false, payout: { three: 4.4, four: 21, five: 69 } },
  DRONE: { id: 'DRONE', name: 'Drone', isWild: false, isScatter: false, isCore: false, payout: { three: 2.7, four: 13.6, five: 48 } },
  A: { id: 'A', name: 'A', isWild: false, isScatter: false, isCore: false, payout: { three: 1.3, four: 6.5, five: 27 } },
  K: { id: 'K', name: 'K', isWild: false, isScatter: false, isCore: false, payout: { three: 1.3, four: 5.5, five: 21 } },
  Q: { id: 'Q', name: 'Q', isWild: false, isScatter: false, isCore: false, payout: { three: 0.7, four: 4.4, five: 14 } },
  J: { id: 'J', name: 'J', isWild: false, isScatter: false, isCore: false, payout: { three: 0.7, four: 2.7, five: 11 } },
  CORE: { id: 'CORE', name: 'Core AI', isWild: false, isScatter: false, isCore: true },
  SCATTER: { id: 'SCATTER', name: 'Data Vault', isWild: false, isScatter: true, isCore: false },
  WILD: { id: 'WILD', name: 'Glitch', isWild: true, isScatter: false, isCore: false },
};
