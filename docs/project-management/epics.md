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
**Estado:** ✅ Done
**Objetivo:** lógica de sesión para Heist Free Spins con Cores pegajosos.

- **NCR-S2.1** — Como jugador, quiero que 3+ Data Vault activen 8 Free Spins.
  *Criterios de aceptación:* ya cubierto por `evaluateScatter` (E1); esta historia agrega el manejo de sesión que dispara la secuencia. ✅
- **NCR-S2.2** — Como jugador, quiero que los Core AI que caen durante Free Spins queden fijos (sticky) el resto de la ronda.
  *Criterios de aceptación:* nuevo endpoint o parámetro de sesión que recuerde posiciones de Core entre giros consecutivos de la misma ronda de Free Spins. ✅
- **NCR-S2.3** — Como jugador, quiero que los Cores sticky sigan generando wilds en cada giro de Free Spins.
  *Criterios de aceptación:* cada giro de FS reaplica `applyCoreWildGeneration` incluyendo los Cores sticky acumulados, además de los nuevos que caigan. ✅
- **NCR-S2.4** — Como jugador, quiero ver cuántos Free Spins me quedan y el total acumulado ganado en la ronda.
  *Criterios de aceptación:* la respuesta de cada giro en FS incluye `spinsRemaining` y `sessionTotalWin`. ✅

**Hallazgo de QA (D-08, ver GDD sección 10):** en rondas avanzadas, un grid saturado de Cores sticky + Wilds podía pagar 0 en ese giro porque el Wild no tenía tabla propia (D-02). **Corregido por D-19** — ver NCR-E9.

---

## NCR-E3 — Frontend Base
**Estado:** ✅ Done
**Objetivo:** cliente PixiJS que pinta el grid y consume la API.

- **NCR-S3.1** — Como jugador, quiero ver una grilla 5x4 en pantalla al cargar el juego.
- **NCR-S3.2** — Como jugador, quiero apretar SPIN y ver el resultado del servidor reflejado en la grilla.
- **NCR-S3.3** — Como jugador, quiero ver mi saldo y el último premio actualizados después de cada giro.
- **NCR-S3.4** — Como jugador, quiero que al activarse Free Spins el juego encadene los giros automáticamente, mostrando giros restantes y ganancia acumulada, sin que tenga que apretar SPIN de nuevo.
  *Criterios de aceptación:* `SlotGame.ts` llama a `POST /free-spin` en loop hasta `sessionOver`, actualiza saldo solo al cerrar la ronda. ✅ (D-11)

---

## NCR-E4 — Animaciones & FX
**Estado:** 🟡 En progreso (primera pasada con placeholders — falta la transición de salida y ajustar sobre arte real)
**Objetivo:** feedback visual — sin esto el juego "funciona" pero no se siente un slot real.

- **NCR-S4.1** — Como jugador, quiero ver los rodillos girar antes de que se detengan en el resultado (no que el grid cambie instantáneo).
  *Criterios de aceptación:* cada rodillo cicla símbolos aleatorios y para en cascada (reel 0 primero). ✅ `animateSpinAndReveal` / `spinReelColumn`.
- **NCR-S4.2** — Como jugador, quiero ver un highlight visual sobre las líneas ganadoras.
  *Criterios de aceptación:* glow pulsante sobre las celdas exactas de cada línea ganadora. ✅ `highlightWinningLines`, requirió agregar `positions` a `LineWin` en el backend (D-18).
- **NCR-S4.3** — Como jugador, quiero ver una animación/glow cuando aparece un wild generado por Core AI.
  *Criterios de aceptación:* pulso en el Core, efecto glitch (parpadeo de colores) en cada Wild generado antes de asentarse. ✅ `pulseCore` / `glitchFlicker`.
- **NCR-S4.4** — Como jugador, quiero una transición visual clara al entrar y salir de Free Spins.
  *Criterios de aceptación:* overlay "ACCESS GRANTED" con glitch al activar. ✅ Entrada implementada (`showAccessGrantedOverlay`); transición de salida (fin de ronda) queda con el texto de resumen actual, sin efecto visual dedicado — pendiente.

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
**Estado:** ✅ Done
**Objetivo:** validar el RTP real de los reel strips actuales (no un número inventado).

- **NCR-S6.1** — Como desarrollador, quiero un script que reutilice `SlotEngine.ts` y corra 1M+ giros simulados.
  *Criterios de aceptación:* el script imprime RTP real (ganado/apostado), hit frequency, y frecuencia de activación de Free Spins. ✅ `server/src/scripts/simulate.ts`, `npm run simulate`.
- **NCR-S6.4 (QA)** — Como desarrollador, quiero medir si los giros tardíos de una ronda de Free Spins (muchos Cores sticky) pagan significativamente menos que los tempranos.
  *Criterios de aceptación:* la simulación reporta spinWin promedio por número de orden dentro de la ronda de FS (giro 1, 2, ... 8); con ese dato se decide si D-08 amerita ajustar D-02. ✅ Confirmado: caía de 31.90 (giro 3) a 8.96 (giro 8), 83.8% de giros en 0 al final. Corregido en NCR-E9 (D-19).
- **NCR-S6.2** — Como desarrollador, quiero poder ajustar `REEL_STRIP_COUNTS` y volver a correr la simulación para calibrar el RTP hacia ~96%.
  *Criterios de aceptación:* RTP medido dentro de un rango razonable del objetivo. ✅ RTP inicial ~140% → recalibrado, validado en 96.77% agrupando 46M de giros (corridas individuales de 1-30M variaron entre 90% y 105%, por eso se agrupó en vez de confiar en una sola corrida). Ver GDD, D-09/D-10.
- **NCR-S6.3** — Como desarrollador, quiero documentar el RTP final validado en `docs/math.md`, reemplazando el estimado inicial.
  *Criterios de aceptación:* `math.md` refleja el número medido, no una intención de diseño. ✅

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

---

## NCR-E8 — Hardening técnico (Zero Trust real)
**Estado:** ✅ Done
**Objetivo:** cerrar huecos detectados al comparar contra una matriz de referencia de otro estudio/modelo — ver GDD, decisiones D-12 a D-15.

- **NCR-S8.1** — Como jugador, quiero que mi saldo lo calcule y guarde el servidor, no mi navegador.
  *Criterios de aceptación:* `PlayerBalance.ts` server-side, identificado por `playerId`; el frontend solo muestra `balance` de la respuesta, nunca lo calcula. ✅ (D-12)
- **NCR-S8.2** — Como desarrollador, quiero que cada giro tenga un identificador único para trazabilidad.
  *Criterios de aceptación:* `spinId` (UUID) presente en la respuesta de `/spin` y `/free-spin`. ✅ (D-13)
- **NCR-S8.3** — Como desarrollador, quiero poder ajustar la tabla de pagos sin recompilar el backend.
  *Criterios de aceptación:* pagos leídos desde `paytable.json`, no hardcodeados en TS. ✅ (D-14)
- **NCR-S8.4 (decisión de no hacer)** — Evaluar si sumar cascadas/tumbling, Scatter Pays con conteo global, o multiplicadores globales acumulativos.
  *Criterios de aceptación:* decisión documentada con motivo — son mecánicas de un género de slot distinto (ways/cluster), incompatibles con el diseño actual de 12 líneas + Core AI. No se adoptan. ✅ (D-15)
- **NCR-S8.5** — Como jugador (en modo demo), quiero elegir cuánto saldo cargar en vez de un monto fijo.
  *Criterios de aceptación:* `POST /balance/topup` recibe `amount`, validado contra `MIN_TOPUP_AMOUNT`/`MAX_TOPUP_AMOUNT`; UI con input numérico. Multi-moneda queda fuera de esta iteración (ver `pending-features-plan.md`). ✅

---

## NCR-E9 — Corrección de saturación en Free Spins (D-19)
**Estado:** ✅ Done
**Objetivo:** corregir D-08 tras un caso real observado (tablero 100% Core+Wild, 0 símbolos normales, ronda sin poder pagar nada).

- **NCR-S9.1** — Evaluar opciones de corrección (tope duro, generación decreciente, multiplicador global, sticky con expiración, combinada) con pros/contras de cada una.
  *Criterios de aceptación:* comparación documentada, decisión justificada. ✅ Elegida: Wild con pago propio + generación decreciente de wilds según saturación del tablero.
- **NCR-S9.2** — Como jugador, quiero que el Wild pague por sí mismo cuando forma una línea completa.
  *Criterios de aceptación:* `paytable.json` incluye entrada para WILD; `Symbol.ts` lo trata como símbolo pagador. ✅
- **NCR-S9.3** — Como jugador, quiero que el tablero nunca llegue a saturarse al 100% de símbolos especiales.
  *Criterios de aceptación:* `applyCoreWildGeneration` reduce la cantidad de wilds por Core según cuán ocupado está el tablero, sin tope duro fijo. ✅
- **NCR-S9.4** — Como desarrollador, quiero confirmar que la corrección realmente mejora la curva de premios dentro de la ronda, no solo en teoría.
  *Criterios de aceptación:* comparación medida antes/después con la misma metodología de simulación. ✅ El promedio pasó de desplomarse (32→9 entre giro 4 y 8) a sostenerse (43→57 entre giro 4 y 8).
- **NCR-S9.5** — Recalibrar el RTP general tras el cambio de tabla de pagos.
  *Criterios de aceptación:* RTP medido dentro del objetivo, agrupando múltiples corridas grandes. ✅ 95.99% (15M de giros agrupados).

---

## NCR-E13 — Selector de apuesta con mínimo y máximo
**Estado:** ✅ Done
**Objetivo:** poder cambiar `betPerLine` desde la UI, dentro de límites validados por el servidor.

- **NCR-S13.1** — Como jugador, quiero subir/bajar mi apuesta con botones, entre valores discretos razonables (0.1 a 10).
  *Criterios de aceptación:* selector -/+ en la UI, recorre `BET_STEPS`; se bloquea mientras hay un giro en curso. ✅
- **NCR-S13.2** — Como desarrollador, quiero que el servidor rechace cualquier apuesta fuera de rango, sin confiar en lo que mande el cliente.
  *Criterios de aceptación:* `POST /spin` valida `betPerLine` contra `MIN_BET_PER_LINE`/`MAX_BET_PER_LINE`. ✅ Probado con 100 (rechaza) y 0.01 (rechaza).
- **NCR-S13.3** — Como desarrollador, quiero que el frontend no hardcodee los límites por separado del servidor.
  *Criterios de aceptación:* `GET /bet-config` expone los límites; el cliente los pide al iniciar. ✅ (D-20)
- **NCR-S13.4 (fuera de esta iteración)** — Soporte multi-moneda con límites que cambien según la moneda usada. Documentado en `pending-features-plan.md`, no implementado.

---

## NCR-E11 — Buy Bonus
**Estado:** ✅ Done
**Objetivo:** activar Free Spins directamente a cambio de un costo calibrado por simulación.

- **NCR-S11.1** — Como desarrollador, quiero medir cuánto gana en promedio una ronda de Free Spins, para calcular un precio de compra justo.
  *Criterios de aceptación:* `simulate.ts` reporta la ganancia promedio de una ronda en unidades de apuesta total. ✅ 3 corridas grandes (10M-15M giros): 27.00x, 28.27x, 28.42x.
- **NCR-S11.2** — Como desarrollador, quiero que el precio de compra tenga el mismo RTP que el juego general, no un número arbitrario.
  *Criterios de aceptación:* precio = ganancia promedio / RTP objetivo (95.99%, ya validado). ✅ `BUY_BONUS_MULTIPLIER = 29.5`.
- **NCR-S11.3** — Como jugador, quiero comprar la ronda de bonus directo, sin depender de que caigan 3+ Scatter.
  *Criterios de aceptación:* `POST /buy-bonus` cobra el costo, rechaza si no alcanza el saldo, crea la sesión de Free Spins igual que un trigger orgánico. ✅
- **NCR-S11.4** — Como jugador, quiero ver el costo actualizado en el botón según mi apuesta actual.
  *Criterios de aceptación:* el botón muestra `apuesta total × 29.5`, se recalcula al cambiar la apuesta. ✅
- **NCR-S11.5 (nota, no implementado)** — Restricción geográfica de la feature (prohibida/restringida en UK, Países Bajos, Suecia, España, entre otras). Documentado en el GDD como nota de compliance, no como pendiente técnico de esta versión.

---

## NCR-E10 — VFX y partículas
**Estado:** 🟡 En progreso (segunda pasada — falta la línea que conecta nodos de una combinación y la marca visual de Cores sticky)

- **NCR-S10.1** — Como jugador, quiero ver un rayo/efecto glitch que conecte visualmente al Core AI con cada Wild que genera, para que se note que es importante que caiga.
  *Criterios de aceptación:* rayo quebrado (glitch) desde el Core hasta cada Wild, con secuencia causa→efecto (rayo primero, asentamiento del Wild 120ms después). ✅ (D-24, D-25)
- **NCR-S10.2** — Como jugador, quiero ver partículas y un efecto de "pop" en los símbolos que forman parte de una línea ganadora, no solo el borde con glow que ya había.
  *Criterios de aceptación:* ráfaga de partículas + escala en cada celda ganadora única, agrupado por celda para no duplicar si pertenece a 2+ líneas. ✅
- **NCR-S10.3** — Como jugador, quiero ver un cartel de premio grande (tipo NICE/BIG/MEGA/EPIC WIN) entre giros, cuando el premio lo amerite.
  *Criterios de aceptación:* cartel con contador animado, aparece en base game, en cada giro de Free Spins, y en el total de la ronda; umbral proporcional a la apuesta total (3x/8x/20x/50x). ✅ (D-26)
- **NCR-S10.4 (pendiente)** — Línea que conecte los nodos ganadores de una combinación (izquierda a derecha, estilo circuito de hackeo), reemplazando el glow por celda suelta. Ver `pending-features-plan.md`.
- **NCR-S10.5 (pendiente)** — Marca visual persistente para Cores sticky en Free Spins, distinta a un Core recién caído. Se posterga hasta reencuadrar el arte final.
- **NCR-S10.6** — Como jugador, quiero que el Wild se sienta transformado por el Core, no que aparezca directo al parar el rodillo.
  *Criterios de aceptación:* durante el blur de giro y al asentarse, las celdas que van a ser Wild muestran un símbolo normal; recién el efecto del Core las transforma. ✅ (D-29)

---

## NCR-E12 — Ver `pending-features-plan.md`
**Estado:** 🔲 To Do (diseño ya pensado, sin implementar)

Core Boost necesita su propia sesión de simulación antes de darse por terminada — no se calibra a ojo, mismo criterio que D-19/D-21.

---

## NCR-E14 — Corrección: Core en la columna 1 anulaba todas las líneas (D-27)
**Estado:** ✅ Done
**Objetivo:** un Core en el rodillo 1 mataba las 12 líneas de una sola vez — mucho peor que en cualquier otra columna, y frustrante para el jugador.

- **NCR-S14.1** — Como desarrollador, quiero confirmar que los Cores nunca pisan Wilds ya generados en el mismo giro (duda planteada, no un bug).
  *Criterios de aceptación:* test dedicado sobre 200k giros con 2+ Cores. ✅ 0 pisadas — ya estaba bien.
- **NCR-S14.2** — Como desarrollador, quiero medir el impacto real de un Core en la columna 1, no asumirlo.
  *Criterios de aceptación:* test controlado (mismo grid real vs. grid hipotético con Wild en vez de Core en esa celda). ✅ 47% menos de ganancia esperada en esos giros — confirmado, no solo intuición.
- **NCR-S14.3** — Como jugador, quiero que el rodillo 1 nunca tenga Core, para que ninguna columna pueda anular las 12 líneas de una sola vez.
  *Criterios de aceptación:* `REEL_0_STRIP_COUNTS` sin Core; confirmado 0 apariciones en 100k giros. ✅ (D-27)
- **NCR-S14.4** — Como desarrollador, quiero recalibrar el RTP general y el precio de Buy Bonus tras el cambio.
  *Criterios de aceptación:* RTP agrupado dentro de un rango razonable del objetivo; `BUY_BONUS_MULTIPLIER` actualizado. ✅ RTP 97.06% (30M de giros), Buy Bonus 32.0x (D-28).
