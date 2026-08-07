const STORAGE_KEY = 'ncr_player_id';

/**
 * El playerId identifica al jugador ante el servidor, que es quien calcula
 * y guarda el saldo real (ver PlayerBalance.ts en el backend — Zero Trust).
 * No es autenticación real, es suficiente para un portfolio demo.
 */
export function getPlayerId(): string {
  let playerId = localStorage.getItem(STORAGE_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, playerId);
  }
  return playerId;
}
