---
type: Verification
title: "TASK-0155: verificación del intento 1"
description: Resultado de verify:task y contraste de ADR-029, glosario, economía y arquitectura con REQ-031 v2.
task: TASK-0155
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:17:00Z }
---

# Resultado

`ok`. `verify:task TASK-0155 --base harness/2agentes` en verde: estado, 7
criterios firmados, informe `success`, 8 archivos dentro de `docs` y `pnpm run
verify` completo. Salida en `verify-task.txt`.

La primera pasada falló en `Capturas`: el heurístico de `verify:task` leía «HUD»
y «UI» en los criterios de una tarea documental. La ficha declara ahora «E2E /
visual: no» en su plan de test, que es la vía prevista por el gate.

# Criterios

Los siete firmados:

- ADR-029 recoge estado del turno, `N`, orden fijo, una fase enemiga por ronda,
  relevo por cámara, recursos por jugador, muerte en turno, resurrección por
  índice y resultado con Nueva y Cargar.
- Declara sin reinicio rápido ni temporizadores y remite la pausa a REQ-024.
- Glosario: «Hotseat», «Relevo», «Paneo de relevo», «Ronda», «Fase enemiga» y
  «Jugador N de M».
- `turn-economy.md` y `architecture.md` reflejan `N`/`Esc`, la ausencia de `E` y
  `R`, los recursos por jugador y la separación motor/host (sección «Hotseat»).
- `decisions/index.md` y `log.md` tienen la entrada de ADR-029; el cierre entra en
  el commit de cierre.
- Sin ediciones en `docs/requirements/**`.
- `docs:check` y `verify` en verde.

# Diff revisado

Siete archivos de `docs/`: ADR-029 nuevo, índice de decisiones, nota de vigencia
en ADR-020, cinco entradas de glosario, orden de turnos y controles de la economía
y sección «Hotseat» de arquitectura; más la ficha y la evidencia. Sin código, sin
requisitos y sin tocar ADR-024, que existe desde el 2026-11-13.

Riesgo: la ficha del objeto del glosario sigue diciendo que los traits no llevan
descripción; es la fricción de TASK-0162 y corresponde a T-011, fuera del piloto.

# Qué debe probar el usuario

- Leer ADR-029 y comprobar que describe lo que juega: `N`, relevo sin Enter,
  ronda, «El master mueve», resultado con Nueva y Cargar.
- En el glosario, que «Ronda» y «Jugador N de M» se entienden sin contexto.
- En el playtest, que ninguna ayuda de controles menciona `E` ni `R`.
