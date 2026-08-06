import express from 'express';
import cors from 'cors';
import { spin } from './slot/SlotEngine.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.post('/spin', (req, res) => {
  const betPerLine = Number(req.body?.betPerLine ?? 1);

  if (!Number.isFinite(betPerLine) || betPerLine <= 0) {
    return res.status(400).json({ error: 'betPerLine debe ser un número mayor a 0' });
  }

  const result = spin(betPerLine);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Neon City Runners server escuchando en http://localhost:${PORT}`);
});
