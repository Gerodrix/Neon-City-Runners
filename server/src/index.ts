import express from 'express';
import cors from 'cors';
import { spin } from './slot/SlotEngine.js';
import { spinFreeSpins } from './slot/FreeSpinsLogic.js';
import { getOrCreateBalance, adjustBalance } from './slot/PlayerBalance.js';
import { MIN_BET_PER_LINE, MAX_BET_PER_LINE, BET_STEPS } from './config/SlotConfig.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// El frontend pide los límites acá en vez de hardcodearlos — si el servidor
// cambia BET_STEPS/MIN/MAX, la UI se actualiza sola sin tocar el cliente.
app.get('/bet-config', (_req, res) => {
  res.json({ minBetPerLine: MIN_BET_PER_LINE, maxBetPerLine: MAX_BET_PER_LINE, betSteps: BET_STEPS });
});

app.get('/balance', (req, res) => {
  const playerId = String(req.query.playerId ?? '');

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }

  const balance = getOrCreateBalance(playerId);
  res.json({ balance });
});

// Recarga de saldo para pruebas — no existiría en un sistema real con dinero (D-16).
app.post('/balance/topup', (req, res) => {
  const playerId = String(req.body?.playerId ?? '');

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }

  const balance = adjustBalance(playerId, 1000);
  res.json({ balance });
});

app.post('/spin', (req, res) => {
  const betPerLine = Number(req.body?.betPerLine ?? 1);
  const playerId = String(req.body?.playerId ?? '');

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }
  if (!Number.isFinite(betPerLine) || betPerLine < MIN_BET_PER_LINE || betPerLine > MAX_BET_PER_LINE) {
    return res
      .status(400)
      .json({ error: `betPerLine debe estar entre ${MIN_BET_PER_LINE} y ${MAX_BET_PER_LINE}` });
  }

  const response = spin(betPerLine, playerId);

  if (!response.ok) {
    return res.status(400).json({ error: response.error });
  }

  res.json(response.result);
});

app.post('/free-spin', (req, res) => {
  const sessionId = String(req.body?.sessionId ?? '');

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId es requerido' });
  }

  const response = spinFreeSpins(sessionId);

  if (!response.ok) {
    return res.status(400).json({ error: response.error });
  }

  res.json(response.result);
});

app.listen(PORT, () => {
  console.log(`Neon City Runners server escuchando en http://localhost:${PORT}`);
});
