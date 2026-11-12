---
type: Task Report
title: "TASK-0077: informe del intento 2"
description: Actualiza los E2E que asumían un ataque enemigo por fase.
task: TASK-0077
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T19:10:00Z }
artifacts: artifacts/TASK-0077/attempt-2/
verified:
---

# Estado

`success`. Los cuatro E2E afectados por el encadenado pasan; queda solo el fallo
preexistente de `cursor-qa`, que no se ha tocado.

# Cambios

- `combat-equipment-qa.spec.ts`: la fase enemiga suma todos los `AttackPerformed`
  de `enemy-1`, exige un ataque por acción del tipo y el contador enemigo a 0.
- `cursor-qa.spec.ts`: misma actualización en el spec de enemigo adyacente.
- `flee-behavior-qa.spec.ts`: el cobarde acorralado encadena dos ataques; se suma
  el daño y se comprueba el contador enemigo a 0.
- `game-input-hud.spec.ts`: el enemigo cargado para el combate usa 20 PV para que
  el RNG desplazado no lo mate de un golpe y se salte la fase enemiga; el HUD de
  acción se comprueba en el cue del ataque con `advanceToCue`; la fase enemiga
  suma ataques y comprueba el contador a 0.
- Sin cambios en `src/**`, host, HUD, motor, bestiario ni `experiments/`.
- Commit SHA: `3046d28dc026d971e566f35f25a801b567c5338a`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test:e2e` | 108 pasan, 1 falla preexistente | `e2e-output.txt` |
| `pnpm run verify` | 1012 tests, build y bundle OK | `verify-output.txt` |

# Evidencia visual

- No aplica: los cambios son aserciones de los specs existentes.

# Desviaciones

- Sigue fallando `cursor-qa.spec.ts` «enemigo alcanzable sin acción: Espacio se
  acerca al tile de ataque sin dañar»; ya fallaba en `main` (TASK-0076). Su línea
  pasó de 628 a 632 por las líneas añadidas; no se ha modificado.
- `EXP-004` pasó en esta ejecución de `verify`; no hizo falta el workaround de un
  worker.

# Problemas conocidos y preguntas abiertas

- El HUD muestra la acción consumida solo durante el beat del ataque y vuelve a
  «Sí» al asentar. El test usa el cue para no depender del tiempo de animación.
- El fallo preexistente de `cursor-qa` queda para TASK-0076 o una tarea propia.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Comprobar estados transitorios del HUD (acción consumida) tras el ataque es flaky si la animación asienta antes de la aserción | `e2e-output.txt` (fallo previo en `game-input-hud`) | `advanceToCue(page, 'attack')` antes de leer el HUD | Afecta a cualquier spec que mire HUD durante un beat | Documentar el patrón en la guía de E2E | Bajo; no relaja aserciones | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 1729 |
| `report_bytes` | 2924 |
| `overflow` | `none` |
| `criteria_failed` | 1 (fallo preexistente ajeno) |
