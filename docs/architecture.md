# Arquitectura

```
neon-city-runners/
├─ client/                  # Frontend: TypeScript + Vite + PixiJS
│  ├─ index.html
│  └─ src/
│     ├─ main.ts            # Bootstrap de la app PixiJS
│     └─ game/
│        └─ SlotGame.ts     # Grid, spin, conexión a la API
│
├─ server/                  # Backend: Node.js + TypeScript + Express
│  └─ src/
│     ├─ index.ts           # Servidor Express, endpoint POST /spin
│     ├─ config/
│     │  └─ SlotConfig.ts   # Constantes del juego (grid, strips, Core, Scatter)
│     └─ slot/
│        ├─ RNG.ts          # Módulo aislado de aleatoriedad
│        ├─ Symbol.ts       # Tipos y tabla de pagos de símbolos
│        ├─ ReelStrip.ts    # Construcción y giro de rodillos
│        ├─ Paylines.ts     # Definición de las 12 líneas
│        └─ SlotEngine.ts   # Lógica central: grid, Core→Wild, evaluación
│
└─ docs/
   ├─ math.md                        # Matemática del juego
   ├─ architecture.md                # Este archivo
   └─ project-management/            # Epics/backlog (práctica de PM/Scrum/PMO)
```

## Decisiones de diseño

- **Wild solo generado por Core AI, nunca en el reel strip**: hace la matemática más controlable (se ajusta volatilidad vía cantidad de wilds por Core, no tocando probabilidades del strip), a cambio de depender de la frecuencia del Core para dar variedad al giro base.
- **RNG aislado en un único módulo** (`RNG.ts`): permite reemplazarlo por un RNG certificado el día de mañana sin tocar el resto del engine.
- **Sin free spins con estado todavía**: el endpoint `/spin` es stateless (un giro = una request). La lógica de Cores pegajosos entre giros de Free Spins se suma en una fase siguiente, cuando haya manejo de sesión.

## Próximos módulos (no implementados aún)
- `server/src/slot/FreeSpinsLogic.ts` — estado de sesión y Cores pegajosos.
- Script de simulación Monte Carlo para validar RTP real.
- `client/src/game/` — sprites reales en vez de placeholders de color, animaciones de giro.
