---
type: Verification
title: "TASK-0176: verificación del intento 2"
description: Resultado de verify:task y criterios revisados de la QA de densidad.
task: TASK-0176
attempt: 2
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T20:43:00Z }
---

# Resultado

`ok` tras regenerar las capturas del intento. La suite E2E completa queda
292/292, `pnpm run verify` pasa y el diff está dentro de `tests/`.

# Criterios

- E2E con 1 y 6 jugadores: 5 frente a 11 enemigos con semilla 279837264, `P`
  1/6 y total aplicado 5/11; el spec recorre el menú real.
- Guardado y carga: total, posiciones, tipos, `home`, salas, rejilla, cofres y
  party idénticos; la casilla movida antes de guardar se conserva.
- Capturas de ambos repartos y del estado cargado a 1280×720 y 900×700,
  generadas de nuevo para este intento con el spec sin cambios.
- Suite E2E 292/292: la semilla de victoria pasa de 79 a 45 y `host-result-qa`
  deja de tener su propio literal. El criterio se sostiene; el cambio de semilla
  es mantenimiento de fixture por la densidad de REQ-012 v5, no una relajación:
  la victoria se sigue jugando con comandos reales.
- `pnpm run verify` OK (1904 tests, build y bundle).

# Diff revisado

24 archivos: spec nuevo de densidad y guardado, `support.ts` (semilla 45
documentada), `host-result-qa` (un solo fixture) y el comentario de
`pause-save-load`; más evidencia. Sin `src/` y sin tocar aserciones de resultado.
Riesgo asumido: la semilla 45 se documenta para un jugador; si el balance cambia
otra vez, el fixture deberá renovarse con el mismo procedimiento.

# Qué debe probar el usuario

Abrir una partida con 1 jugador y `F1`: deben salir 5 enemigos, no 11. Repetir
con 6 jugadores: 11. Guardar y cargar desde el menú y comprobar que el reparto
no cambia.
