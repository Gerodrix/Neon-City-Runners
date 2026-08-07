// El saldo se calcula y guarda ACÁ, nunca en el cliente. El frontend solo
// muestra el valor que el servidor le devuelve en cada respuesta — no lo
// calcula por su cuenta. Esto es lo que "Zero Trust" significa en la práctica,
// no solo que el servidor decida el resultado del giro sino también el dinero.
//
// En memoria del proceso, sin persistencia — mismo criterio y misma limitación
// conocida que las sesiones de Free Spins (ver GDD, decisión D-07).

const STARTING_BALANCE = 1000;

const balances = new Map<string, number>();

export function getOrCreateBalance(playerId: string): number {
  if (!balances.has(playerId)) {
    balances.set(playerId, STARTING_BALANCE);
  }
  return balances.get(playerId)!;
}

/** Suma (o resta, con delta negativo) al saldo del jugador y devuelve el nuevo total. */
export function adjustBalance(playerId: string, delta: number): number {
  const current = getOrCreateBalance(playerId);
  const updated = current + delta;
  balances.set(playerId, updated);
  return updated;
}
