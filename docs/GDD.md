# Game Design Document — Neon City Runners

## 1. Resumen del juego
Slot HTML5 5x4, 12 líneas, tema cyberpunk-heist. Un símbolo generador (**Core AI**) crea wilds aleatorios en cada giro; acumular suficientes **Data Vault** (scatter) activa una ronda de Free Spins donde los Cores quedan pegados y siguen generando wilds ronda tras ronda.

Proyecto de portfolio orientado a estudios de iGaming (Pragmatic Play, Red Tiger, Nolimit City).

## 2. Ambientación
Ciudad cyberpunk controlada por corporaciones de datos. El jugador es parte de un equipo de "runners" que hackea **Cores** de IA corporativa para liberar wilds (glitches en el sistema) y asaltar **Data Vaults** — de ahí "Heist Free Spins": la ronda de bonus es literalmente el golpe al vault.

Esto da pie a nombrar assets/UI coherentemente más adelante (ej. mensajes de "ACCESS GRANTED" al activar Free Spins, "CORE COMPROMISED" cuando un Core se vuelve sticky, etc.) — anotado para la fase de UI/UX (NCR-E5).

## 3. Especificaciones
| | |
|---|---|
| Grid | 5 rodillos x 4 filas |
| Líneas de pago | 12 |
| Dirección de pago | Izquierda a derecha |
| Apuesta | Configurable por línea |
| RTP objetivo | 95.99% — medido agrupando 15M de giros simulados con la tabla ya corregida (D-19), ver sección 6 |
| Volatilidad | Media-alta |

## 4. Símbolos y pagos
Tabla completa y reel strips en [`docs/math.md`](./math.md) — no se duplica acá para evitar que las dos fuentes se desincronicen. Resumen de roles:

- **High/Low regulares** (Runner, Netrunner, CyberDog, Drone, A, K, Q, J): pago estándar por línea.
- **Glitch (WILD)**: sustituye a todo excepto Scatter y Core. No está en el reel strip — solo lo genera el Core AI.
- **Core AI**: sin pago directo, es el símbolo generador.
- **Data Vault (SCATTER)**: paga por cantidad en cualquier posición y activa Free Spins.

## 5. Mecánicas especiales

### 5.1 Core AI → Glitch Wilds
Cada Core AI en el grid genera 2-4 wilds en posiciones aleatorias (sin pisar Core/Scatter existentes). Implementado en `SlotEngine.ts` (`applyCoreWildGeneration`) — ver NCR-E1 (Done).

### 5.2 Data Vault → Heist Free Spins
3+ Scatter en cualquier posición otorgan 8 Free Spins. Durante la ronda:
- Los Core AI que caen quedan **sticky** (fijos en su posición) por el resto de la ronda.
- Cada giro de Free Spins fuerza Core en todas las posiciones sticky acumuladas, gira el resto del grid normalmente, y aplica generación de wilds usando **todos** los Cores (sticky + nuevos).
- Los Cores nuevos que caen se suman a la lista de sticky para el próximo giro.

Estado: implementado — ver NCR-E2 (Done). D-08 corregido por D-19.

## 6. Matemática
Ver [`docs/math.md`](./math.md) para reel strips, tabla de pagos completa y el detalle de la calibración, incluyendo la corrección D-19 (Wild con pago propio + generación decreciente de wilds). **RTP validado por simulación (NCR-E6): 95.99%**, agrupando 15M de giros con la tabla ya corregida.

Historial: v1 (Core/Scatter sin calibrar) midió ~140% de RTP → v2 calibrada (Wild sin pago) llegó a 96.77% pero con el problema de saturación que se ve en D-08/D-19 → v3 (D-19: Wild con pago + generación decreciente) resuelve la saturación y queda validada en 95.99%. La tabla de pagos y el reel strip de `math.md` reflejan siempre la versión más reciente.

## 7. Dirección de arte y audio

### 7.1 Concepto visual
Estética cyberpunk nocturna: ciudad lluviosa, neones saturados, interfaces holográficas, distorsión digital ("glitch") como motivo recurrente — coherente con la narrativa (sección 2). El HUD y los símbolos deberían sentirse como una interfaz robada de un sistema corporativo, no como un tablero de casino genérico.

### 7.2 Paleta de colores
Definida a partir de los placeholders ya usados en `SlotGame.ts`, para que el arte final la respete:

| Uso | Color | Hex |
|---|---|---|
| Acento primario / CTA (botón Spin, líneas ganadoras) | Magenta neón | `#ff2e88` |
| Acento secundario / Core AI, Wild | Cian / verde-agua neón | `#33f2c7` / `#2effe0` |
| Símbolos high-tier | Violeta neón | `#8a2eff` |
| Scatter / Data Vault | Amarillo neón | `#ffee00` |
| Fondo base | Azul-violeta muy oscuro | `#0a0a12` / `#14082a` |
| Símbolos low-tier (A/K/Q/J) | Gris azulado neutro | `#444455` |

### 7.3 Concepto por símbolo

| Símbolo | Concepto visual | Notas de animación |
|---|---|---|
| Runner / Netrunner | Personajes hacker estilizados, silueta con detalles neón | Ligero parpadeo de neón al formar parte de una línea ganadora |
| CyberDog / Drone | Unidades robóticas de apoyo del equipo de runners | — |
| A/K/Q/J | Cartas rediseñadas como paneles holográficos, no cartas clásicas | Sutil escaneo de luz al caer |
| Core AI | Núcleo/orbe de IA pulsante, con circuitos visibles | Pulso de energía al caer; "descarga" hacia las posiciones donde genera wilds |
| Glitch (Wild) | Distorsión visual tipo glitch/error de sistema, no un ícono fijo | Aparece con un efecto de interferencia (glitch-in), no con un simple fade |
| Data Vault (Scatter) | Bóveda de datos con ícono de candado/lock digital | Al caer 3+, "desbloqueo" visual progresivo símbolo por símbolo |

### 7.4 Animaciones clave
- **Giro de rodillos:** blur de movimiento, sin ser tan rápido que impida leer los símbolos al pasar.
- **Aterrizaje de símbolo:** rebote sutil (overshoot + settle), no un corte seco.
- **Activación de Core AI:** pulso/escaneo en el símbolo, seguido de una animación de "descarga" o línea de energía hacia cada posición donde aparece un wild nuevo.
- **Aparición de Wild:** efecto glitch/interferencia en vez de un simple cambio de sprite — refuerza la idea de "falla en el sistema".
- **Líneas ganadoras:** highlight con glow + trazo de la línea sobre el grid, símbolo por símbolo en la combinación.
- **Trigger de Free Spins:** transición fuerte (ej. "screen glitch" a pantalla completa) con mensaje tipo "ACCESS GRANTED" antes de entrar a Heist mode.
- **Cores sticky en Free Spins:** marca visual persistente (ej. borde/glow distinto) para diferenciarlos de un Core recién caído.

### 7.5 VFX por nivel de premio
Para que la intensidad visual comunique el tamaño del premio (patrón estándar en la industria):

| Nivel de premio | VFX |
|---|---|
| Menor (línea simple) | Glow leve sobre la línea, sin partículas |
| Medio | Partículas cortas + contador de premio con "count-up" |
| Grande | Partículas + shake de cámara leve + destaque de pantalla |
| Muy grande / Free Spins total | Secuencia dedicada de "big win", pantalla completa, contador prolongado |

### 7.6 Música
- **Loop de juego base:** synthwave/cyberpunk ambiental, tempo medio, no invasivo — tiene que poder sonar en loop largo sin cansar.
- **Loop de Free Spins (Heist mode):** variación más intensa/energética del mismo tema (mismo motivo musical, arreglo más denso) para reforzar que "estamos dentro del golpe".
- **Stinger de big win:** frase musical corta y distinta, no un loop.

### 7.7 Sonido (SFX)
| Evento | Sonido |
|---|---|
| Click en botón Spin | Click UI corto, tono digital |
| Parada de cada rodillo | Golpe seco/mecánico con textura digital |
| Activación de Core AI | Zap/glitch electrónico |
| Aparición de cada Wild | Sonido de interferencia corto, distinto al de Core |
| Data Vault cayendo | Chime metálico/digital, más intenso a medida que se acerca a 3+ |
| Trigger de Free Spins | Fanfarria corta tipo "acceso concedido" |
| Premio (por nivel) | Escalado: desde un tintineo simple hasta una secuencia de monedas/energía para premios grandes |

### 7.8 Estado de implementación
Toda esta sección es dirección de arte/audio a implementar — ninguno de estos elementos está construido todavía (los placeholders actuales en `SlotGame.ts` son solo rectángulos de color). Corresponde a NCR-E4 (Animaciones & FX) y NCR-E5 (UI/UX & Paytable); el audio no tiene épica propia todavía — se suma como nota para crear una si se decide encararlo.

## 8. Experiencia de usuario (estados del juego)
1. **Base game**: rodillos giran con blur de símbolos y se detienen en cascada (reel 0 primero, reel 4 último), líneas ganadoras se resaltan con glow, Core AI pulsa y cada Wild generado aparece con un efecto glitch. Implementado (NCR-E4, primera pasada).
2. **Trigger de Free Spins**: 3+ Scatter → overlay "ACCESS GRANTED" con glitch de pantalla completa → ronda se juega automáticamente (D-11). Implementado.
3. **Free Spins (Heist mode)**: contador de spins restantes y ganancia acumulada visibles (texto), mismos efectos de giro/líneas/Core AI que el base game. Cores sticky con marca visual distintiva pendiente — se diseña junto con el arte final (NCR-E5), no tiene sentido definirla sobre placeholders.
4. **Fin de ronda**: resumen de ganancia total de Free Spins ya se muestra (texto), vuelve a base game automáticamente.

## 9. Arquitectura técnica
Ver [`docs/architecture.md`](./architecture.md) para estructura de carpetas y decisiones de implementación (RNG aislado, endpoint stateless en base game, etc.). Piezas sumadas después de la primera versión: `PlayerBalance.ts` (saldo server-side, D-12), `spinId` por giro (D-13), `paytable.json` externalizado (D-14), y en el frontend `SymbolAssets.ts` (carga de sprites finales con fallback automático al placeholder — ver `client/public/assets/symbols/README.md` para el brief de producción de arte).

## 9.1 Brief de producción de arte (para Figma)
El pipeline de assets ya está armado: cualquier PNG que se agregue en `client/public/assets/symbols/` con el nombre exacto del símbolo (ej. `RUNNER.png`) reemplaza el placeholder de color automáticamente, sin tocar código. Especificación completa (formato, tamaño, nomenclatura) en `client/public/assets/symbols/README.md`. Referencia de estilo: sección 10 de este documento.

## 10. Registro de decisiones de diseño

| ID | Decisión | Alternativas consideradas | Motivo | Épica/Historia |
|---|---|---|---|---|
| D-01 | El Wild no está en el reel strip, solo lo genera el Core AI | Wild con probabilidad propia en el strip | Matemática más controlable: se ajusta volatilidad vía cantidad de wilds por Core sin tocar el strip | NCR-E1 |
| D-02 | El Wild no tiene tabla de pago propia en v1 | Wild paga como línea propia (más alto que Runner) | Simplifica el balanceo inicial; se puede sumar después si el RTP lo necesita | NCR-E1 |
| D-03 | RNG aislado en un único módulo (`RNG.ts`) | RNG disperso en cada función que lo necesite | Permite reemplazarlo por un RNG certificado sin tocar el resto del motor | NCR-E1 |
| D-04 | Sesión de Free Spins en memoria del servidor (`Map`), no en el cliente | Estado manejado por el cliente y enviado en cada request | Nunca confiar en el cliente para nada que afecte el payout — estándar de la industria | NCR-E2 |
| D-05 | Los Cores del giro que activa Free Spins NO quedan sticky; los sticky arrancan en el primer giro de la ronda | Que el Core del giro trigger ya cuente como sticky | Ese giro es técnicamente base game; evita ambigüedad sobre a qué "ronda" pertenece | NCR-E2 |
| D-06 | Sin retrigger de Free Spins en v1 (3+ Scatter durante FS no extiende la ronda) | Implementar retrigger como en slots reales | Reduce alcance y complejidad de sesión para la v1; queda anotado como mejora futura | NCR-E2 |
| D-07 | Sesión de Free Spins vive solo en memoria del proceso Node, sin persistencia en DB | Persistir sesiones en Redis/DB | No se justifica la complejidad para un portfolio demo; limitación conocida y documentada | NCR-E2 |
| D-08 | En rondas avanzadas de Free Spins (muchos Cores sticky + Wilds acumulados), el grid queda dominado por Core+Wild y el premio cae fuerte en la segunda mitad de la ronda (83.8% de giros en 0 en el giro 8/8), porque el Wild no tiene tabla propia (D-02) | Dejarlo así / darle tabla de pago propia al Wild / limitar cuántos Cores pueden quedar sticky | Confirmado por simulación, patrón estable entre corridas de distinto tamaño. **Corregido por D-19** tras un caso real de saturación al 100% | NCR-E6 (medido), corregido en D-19 |
| D-09 | Recalibración de reel strips (Scatter 2→1) y tabla de pagos (~1.36x sobre los valores originales) para llevar el RTP de ~140% a ~96% | Ajustar un solo parámetro a la vez / dejar el RTP original sin validar | La primera versión de la matemática sobre-pagaba; se ajustó de forma iterativa, midiendo con simulación real después de cada cambio, no a ojo | NCR-E6 |
| D-10 | El RTP final se reporta como el resultado de agrupar 46M de giros simulados en varias corridas (96.77%), no el de una sola corrida | Confiar en el resultado de la primera corrida de 1-3M giros | Corridas individuales de 1-30M dieron entre 90% y 105% de RTP — con RNG sin seed, una sola corrida chica no alcanza para un número confiable | NCR-E6 |
| D-11 | Los giros de Free Spins se juegan automáticamente en secuencia tras el trigger, con una pausa corta entre cada uno, sin requerir click adicional del jugador | Requerir que el jugador apriete SPIN manualmente en cada giro de la ronda de bonus | Coincide con el comportamiento estándar de slots online reales; el jugador solo interviene para iniciar la ronda | NCR-E3 |
| D-12 | El saldo del jugador se calcula y guarda únicamente en el servidor (`PlayerBalance.ts`), identificado por un `playerId` que genera el cliente. El frontend nunca hace la cuenta, solo muestra el `balance` que le devuelve cada respuesta | Calcular el saldo en el frontend (como estaba hasta ahora) | Hallazgo real al comparar con una matriz de referencia de otro modelo: calcular el saldo en el cliente contradecía el "Zero Trust" que ya aplicábamos al resto del motor — cualquiera podía editarlo por consola | NCR-E3 |
| D-13 | Cada giro (base y Free Spins) devuelve un `spinId` único (UUID) | No identificar los giros individualmente | Necesario para trazabilidad/auditoría en un sistema real — barato de agregar, buena práctica estándar de la industria | NCR-E1/E2 |
| D-14 | La tabla de pagos vive en `paytable.json` (config externa), no hardcodeada en el código TypeScript | Dejarla hardcodeada en `Symbol.ts` como estaba | Un motor de slots real necesita poder ajustar pagos sin recompilar; separa configuración de lógica | NCR-E1 |
| D-15 | No se adoptan mecánicas de cascadas (tumbling), Scatter Pays con conteo global, ni multiplicadores globales acumulativos, aunque aparecen en una matriz de referencia de otro estudio/modelo | Rediseñar el juego para incluirlas | Son mecánicas de un género de slot distinto (ways/cluster) — incompatibles con el diseño de 12 líneas fijas + Core AI ya definido; adoptarlas sería un juego nuevo, no una mejora incremental | — |
| D-16 | Se agrega un endpoint `POST /balance/topup` (+1000) para poder probar el flujo de saldo insuficiente sin esperar una racha perdedora larga | No tener forma de recargar, o simular pérdidas manualmente | Es una herramienta de desarrollo/demo — no existiría en un sistema real con dinero. Validado manualmente que editar el saldo por consola del navegador (F12) no tiene efecto: el próximo giro lo pisa con el valor real del servidor | NCR-E8 |
| D-17 | Las animaciones usan un helper de tweening propio (`Tween.ts`, ~40 líneas sobre el Ticker de PixiJS), no una librería externa (GSAP, etc.) | Sumar una dependencia de animación | El proyecto no necesita curvas de easing avanzadas ni timelines complejos — un helper propio mantiene el bundle liviano sin sacrificar lo que se necesita | NCR-E4 |
| D-18 | El servidor devuelve las posiciones exactas (`positions`) de cada línea ganadora, no solo símbolo/cantidad | Que el frontend duplique la definición de `PAYLINES` para calcular qué celdas resaltar | Evita que cliente y servidor puedan desincronizarse si `PAYLINES` cambia — el cliente nunca recalcula nada, solo dibuja lo que el servidor ya resolvió | NCR-E1/E4 |
| D-19 | El Wild pasa a tener tabla de pago propia (**reemplaza a D-02**), y la cantidad de wilds por Core baja según cuán ocupado esté el tablero, en vez de un rango fijo | Limitar con un tope duro de Cores sticky simultáneos / rediseñar el Core como multiplicador global en vez de generador físico | Un caso real de saturación al 100% del tablero (0 símbolos normales) motivó la corrección. Se evaluaron 5 opciones (tope duro, generación decreciente, multiplicador global, sticky con expiración, combinada) — se eligió la combinada (Wild paga + generación decreciente) por menor riesgo matemático y por preservar la identidad del Core AI ya construida en el resto del GDD | NCR-E6 |

*D-04 a D-07, D-09 a D-19 implementadas (D-15 es una decisión de "no hacer", documentada igual; D-19 reemplaza a D-02 y resuelve D-08).*

## 11. Fuera de alcance para v1
- Retrigger de Free Spins.
- Persistencia de sesión entre reinicios del servidor.
- RNG certificado (se usa `Math.random()`, aislado para reemplazo futuro).
- Core AI rediseñado como multiplicador global en vez de generador físico de wilds (evaluado en D-19 como alternativa a la corrección aplicada — más robusto matemáticamente, pero cambia la identidad de la mecánica central y tiene más riesgo de calibración; queda como posible dirección de v2).
