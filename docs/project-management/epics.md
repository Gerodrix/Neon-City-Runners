# Backlog — Neon City Runners

Formato: cada Epic agrupa historias de usuario con criterios de aceptación. Los IDs (`NCR-E1`, `NCR-S1.1`, etc.) son solo para referencia interna del repo — al importar `backlog.csv` a Jira, Jira asigna sus propios IDs.

---

## NCR-E1 — Core Engine (Backend)
**Estado:** ✅ Done
**Objetivo:** motor de juego server-side: grid, Core AI → Wilds, evaluación de líneas.

- **NCR-S1.1** — Como desarrollador, quiero un módulo de RNG aislado para poder reemplazarlo por un RNG certificado sin tocar el resto del motor.
  *Criterios de aceptación:* `RNG.ts` expone `randomInt`, `randomIntInRange`, `shuffle`, `uniqueRandomPositions`; ningún otro módulo llama a `Math.random()` directamente.
- **NCR-S1.2** — Como desarrollador, quiero generar un grid 5x4 a partir de reel strips configurables.
  *Criterios de aceptación:* `generateGrid()` devuelve una matriz `reel x row` usando `REEL_STRIP_COUNTS` de `SlotConfig.ts`.
- **NCR-S1.3** — Como jugador, quiero que cada Core AI en pantalla genere entre 2 y 4 wilds en posiciones aleatorias.
  *Criterios de aceptación:* los wilds nunca pisan un CORE ni un SCATTER existente; múltiples Cores generan wilds independientes sin duplicar posiciones.
- **NCR-S1.4** — Como jugador, quiero que el sistema evalúe mis 12 líneas y calcule el premio total.
  *Criterios de aceptación:* `POST /spin` devuelve `lineWins`, `totalLineWin`, `scatterWin`, `totalWin`.

---

## NCR-E2 — Free Spins & Sticky Cores
**Estado:** 🔲 To Do
**Objetivo:** lógica de sesión para Heist Free Spins con Cores pegajosos.

- **NCR-S2.1** — Como jugador, quiero que 3+ Data Vault activen 8 Free Spins.
  *Criterios de aceptación:* ya cubierto por `evaluateScatter` (E1); esta historia agrega el manejo de sesión que dispara la secuencia.
- **NCR-S2.2** — Como jugador, quiero que los Core AI que caen durante Free Spins queden fijos (sticky) el resto de la ronda.
  *Criterios de aceptación:* nuevo endpoint o parámetro de sesión que recuerde posiciones de Core entre giros consecutivos de la misma ronda de Free Spins.
- **NCR-S2.3** — Como jugador, quiero que los Cores sticky sigan generando wilds en cada giro de Free Spins.
  *Criterios de aceptación:* cada giro de FS reaplica `applyCoreWildGeneration` incluyendo los Cores sticky acumulados, además de los nuevos que caigan.
- **NCR-S2.4** — Como jugador, quiero ver cuántos Free Spins me quedan y el total acumulado ganado en la ronda.
  *Criterios de aceptación:* la respuesta de cada giro en FS incluye `freeSpinsRemaining` y `totalFreeSpinsWin`.

---

## NCR-E3 — Frontend Base
**Estado:** ✅ Done
**Objetivo:** cliente PixiJS que pinta el grid y consume la API.

- **NCR-S3.1** — Como jugador, quiero ver una grilla 5x4 en pantalla al cargar el juego.
- **NCR-S3.2** — Como jugador, quiero apretar SPIN y ver el resultado del servidor reflejado en la grilla.
- **NCR-S3.3** — Como jugador, quiero ver mi saldo y el último premio actualizados después de cada giro.

---

## NCR-E4 — Animaciones & FX
**Estado:** 🔲 To Do
**Objetivo:** feedback visual — sin esto el juego "funciona" pero no se siente un slot real.

- **NCR-S4.1** — Como jugador, quiero ver los rodillos girar antes de que se detengan en el resultado (no que el grid cambie instantáneo).
- **NCR-S4.2** — Como jugador, quiero ver un highlight visual sobre las líneas ganadoras.
- **NCR-S4.3** — Como jugador, quiero ver una animación/glow cuando aparece un wild generado por Core AI.
- **NCR-S4.4** — Como jugador, quiero una transición visual clara al entrar y salir de Free Spins.

---

## NCR-E5 — UI/UX & Paytable
**Estado:** 🔲 To Do
**Objetivo:** reemplazar placeholders de color por arte real y agregar controles de juego.

- **NCR-S5.1** — Como jugador, quiero ver sprites reales de cada símbolo en vez de rectángulos de color.
- **NCR-S5.2** — Como jugador, quiero poder ajustar mi apuesta por línea desde la UI.
- **NCR-S5.3** — Como jugador, quiero abrir una tabla de pagos (paytable) que muestre qué paga cada símbolo.
- **NCR-S5.4** — Como jugador, quiero que la estética general (tipografía, colores, fondo) sea consistente con el tema cyberpunk.

---

## NCR-E6 — Matemática & Simulación
**Estado:** 🔲 To Do
**Objetivo:** validar el RTP real de los reel strips actuales (no un número inventado).

- **NCR-S6.1** — Como desarrollador, quiero un script que reutilice `SlotEngine.ts` y corra 1M+ giros simulados.
  *Criterios de aceptación:* el script imprime RTP real (ganado/apostado), hit frequency, y frecuencia de activación de Free Spins.
- **NCR-S6.2** — Como desarrollador, quiero poder ajustar `REEL_STRIP_COUNTS` y volver a correr la simulación para calibrar el RTP hacia ~96%.
- **NCR-S6.3** — Como desarrollador, quiero documentar el RTP final validado en `docs/math.md`, reemplazando el estimado inicial.

---

## NCR-E7 — Documentación & Demo
**Estado:** 🔲 To Do
**Objetivo:** dejar el repo listo para mostrar a estudios de iGaming.

- **NCR-S7.1** — Como reclutador/evaluador, quiero un README claro que explique el juego, el stack y cómo correrlo.
  *Criterios de aceptación:* ya cubierto parcialmente; falta agregar capturas/GIF una vez esté E4/E5 avanzado.
- **NCR-S7.2** — Como reclutador/evaluador, quiero poder ver una demo jugable sin instalar nada localmente.
  *Criterios de aceptación:* deploy del frontend (ej. Vercel/Netlify) + backend (ej. Render/Railway).
- **NCR-S7.3** — Como reclutador/evaluador, quiero entender las decisiones de diseño del juego (por qué Core AI, por qué el Wild no está en el strip, etc.).
  *Criterios de aceptación:* `docs/architecture.md` y `docs/math.md` actualizados y linkeados desde el README.
