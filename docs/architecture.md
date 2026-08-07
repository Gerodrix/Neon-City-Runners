# Arquitectura

```
neon-city-runners/
├─ client/                  # Frontend: TypeScript + Vite + PixiJS
│  ├─ index.html
│  ├─ public/
│  │  └─ assets/symbols/    # Arte final de símbolos (PNG) — ver README.md ahí para el brief
│  └─ src/
│     ├─ main.ts              # Bootstrap de la app PixiJS, carga texturas antes de iniciar
│     └─ game/
│        ├─ SlotGame.ts       # Grid, spin, conexión a la API, saldo (mostrado, no calculado)
│        ├─ SymbolAssets.ts   # Carga de sprites finales con fallback al placeholder
│        └─ PlayerId.ts       # Identificador de jugador persistente (localStorage)
│
├─ server/                  # Backend: Node.js + TypeScript + Express
│  └─ src/
│     ├─ index.ts           # Servidor Express — /spin, /free-spin, /balance
│     ├─ config/
│     │  ├─ SlotConfig.ts   # Constantes del juego (grid, strips, Core, Scatter)
│     │  └─ paytable.json   # Tabla de pagos externalizada — editable sin recompilar
│     ├─ scripts/
│     │  └─ simulate.ts     # Simulación Monte Carlo (npm run simulate)
│     └─ slot/
│        ├─ RNG.ts               # Módulo aislado de aleatoriedad
│        ├─ Symbol.ts            # Tipos de símbolos, lee paytable.json
│        ├─ ReelStrip.ts         # Construcción y giro de rodillos
│        ├─ Paylines.ts          # Definición de las 12 líneas
│        ├─ SlotEngine.ts        # Lógica central: grid, Core→Wild, evaluación, saldo
│        ├─ PlayerBalance.ts     # Saldo por jugador — server-side, Zero Trust real
│        ├─ FreeSpinsSession.ts  # Sesiones de Free Spins en memoria
│        └─ FreeSpinsLogic.ts    # Lógica de un giro dentro de una ronda de Free Spins
│
└─ docs/
   ├─ math.md                        # Matemática del juego
   ├─ architecture.md                # Este archivo
   ├─ GDD.md                          # Game Design Document — fuente de verdad, incluye Registro de decisiones
   ├─ Neon_City_Runners_GDD.pdf       # Export pulido del GDD para compartir (portfolio/recruiters)
   └─ project-management/
      ├─ epics.md                     # Épicas + historias de usuario, legible en el repo
      └─ backlog.csv                  # Mismo backlog en formato importable a Jira
```

## Decisiones de diseño

- **Wild solo generado por Core AI, nunca en el reel strip**: hace la matemática más controlable (se ajusta volatilidad vía cantidad de wilds por Core, no tocando probabilidades del strip), a cambio de depender de la frecuencia del Core para dar variedad al giro base.
- **RNG aislado en un único módulo** (`RNG.ts`): permite reemplazarlo por un RNG certificado el día de mañana sin tocar el resto del engine.
- **Saldo server-side (Zero Trust real, no solo declarado)**: `PlayerBalance.ts` calcula y guarda el saldo por `playerId`. El cliente nunca hace la cuenta — solo muestra el `balance` que le devuelve cada respuesta de `/spin` y `/free-spin`. Ver GDD, decisión D-12.
- **Tabla de pagos externalizada** (`paytable.json`): separada del código para poder ajustar pagos sin recompilar. Ver GDD, decisión D-14.
- **Cada giro tiene un `spinId` único (UUID)**: trazabilidad, necesaria en cualquier sistema real de apuestas. Ver GDD, decisión D-13.
- **Sesión de Free Spins en memoria, sin persistencia**: si el server se reinicia a mitad de una ronda de bonus, se pierde. Limitación conocida y documentada (GDD, D-07) — resolverla requeriría Redis/DB, fuera de alcance para un portfolio demo.
- **Pipeline de assets con fallback automático**: `SymbolAssets.ts` intenta cargar el PNG final de cada símbolo desde `client/public/assets/symbols/`; el que todavía no existe cae al placeholder de color sin romper nada. Así el arte se puede ir entregando de a un archivo por vez.

## Próximos módulos (no implementados aún)
- Animaciones de giro, highlight de líneas, feedback visual del Core AI (NCR-E4).
- Arte final de los símbolos en `client/public/assets/symbols/` (brief en el README de esa carpeta).
