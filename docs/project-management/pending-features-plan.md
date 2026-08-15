# Plan — Features pendientes

Documento de trabajo, no implementado todavía. Cada sección tiene el diseño pensado y los casos borde identificados, para que implementarlo después sea rápido y no haya que volver a pensar desde cero.

---

## 1. "Core Boost" — apuesta con mayor probabilidad de Core

**Qué es:** pagar un multiplicador de apuesta (ej. 1.25x-1.5x) a cambio de asegurar al menos 1 Core AI por giro (o subir su probabilidad base).

**Enfoque técnico más simple:** después de generar el grid normal, si no cayó ningún Core de forma natural, forzar uno en una posición aleatoria (mismo patrón que ya usamos para forzar Cores sticky en Free Spins — `FreeSpinsLogic.applyStickyCores`). Importante: nunca forzarlo en el rodillo 1 (D-27) — ahí no hay Core ni orgánico ni forzado.

**Casos borde:**
- Al forzar un Core donde había otro símbolo, ese símbolo "desaparece" — hay que decidir si eso puede romper una línea que ya estaba formada antes de forzar el Core (probablemente sí, y hay que aceptarlo como parte del feature, documentado).
- El costo extra de este modo tiene que calibrarse con su propia simulación (correr `spin` con el flag activado miles de veces y medir cuánto sube el RTP efectivo) — no alcanza con "se siente razonable". Mismo método que se usó para calibrar Buy Bonus (NCR-E11, D-21) y para D-27: medir, no asumir.
- Interacción con Buy Bonus: ¿se pueden combinar los dos boosts en el mismo giro? Si sí, hay que simular esa combinación también, no asumir que los costos se suman linealmente.

---

## 2. Marca visual persistente para Cores sticky en Free Spins

**Qué es:** hoy un Core recién caído y un Core sticky (pegado de una ronda anterior) se ven exactamente igual. Falta una marca (borde distinto, ícono superpuesto, etc.) que los diferencie.

**Por qué está pausada:** tiene más sentido diseñarla ya mirando el arte final de Figma en vez de sobre los sprites actuales — evita rehacerla dos veces.

---

## Cómo se prioriza esto

Core Boost necesita su propia sesión de simulación (mismo método que Buy Bonus y D-27) antes de darse por terminada — no se calibra a ojo. La marca de Cores sticky espera al arte.

*(El selector de apuesta, Buy Bonus, y la línea que conecta nodos ganadores que estaban acá se implementaron — ver NCR-E13, NCR-E11 y NCR-E10 en `epics.md`.)*
