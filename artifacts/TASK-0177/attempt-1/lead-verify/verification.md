---
type: Verification
title: "TASK-0177: verificación del intento 1"
description: "Maná +4 por turno verificado: constante única, jugador y enemigo, tope, cambio de nivel y tests sin debilitar."
task: TASK-0177
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:10:34Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0177` pasa con 5 criterios firmados, informe
`success` y `pnpm run verify` verde (118 archivos, 1907 tests, build y bundle).
La salida mecánica está en `verify-task.txt`.

# Criterios

- **Constante única:** `MANA_RECOVERY_PER_TURN = 4` en `src/game/mana.ts`; tests
  de maná, turno, hechizos y experimento leen la constante.
- **Jugador y enemigo:** `recoverMana` aplica `min(actual + 4, máximo)` al inicio
  del turno; `turn.test.ts` comprueba que el jugador que aún no ha actuado
  conserva su maná y que el estado inicial sigue lleno.
- **Cambio de nivel:** `restoreMana` recalcula el máximo y recorta; tests de subida
  (0/16), bajada (12→8) y conservación de lo que cabe (3/16, 3/4).
- **Sin debilitar:** las expectativas antiguas de recarga completa se sustituyen
  por +4 o por la constante; no se eliminan casos de tope, muerte, determinismo ni
  gasto persistente. No se tocan costes, curación ni resolución de hechizos.
- **Verify:** `pnpm run verify` pasa.

# Diff revisado

`src/game/mana.ts`, `src/game/turn.ts`, tests de `mana`, `turn`, `magic` y
`spell-flow`, y `experiments/EXP-003-mesa-combate` v2 (`actions.ts`, `duel.ts`,
`actions.test.ts` y snapshot de medición). Todo dentro de `feature`; sin cambios
en `docs/` fuera de la ficha y `artifacts/`. El snapshot del experimento se
regeneró porque el modelo cambió; el informe lo declara.

Riesgo revisado: `restoreMana` solo se usa en tests y desde `recoverMana`; no hay
otro llamador que esperara recarga completa. El formato de guardado no cambia.

# Qué debe probar el usuario

- En partida, gastar maná y terminar el turno: el HUD debe subir **+4**, no
  rellenar la barra. Repetir dos turnos para ver que el gasto persiste.
- Guardar y cargar: el maná actual se conserva.
- **No probar aún curación ni resurrección**: sus costes y alcance llegan en
  TASK-0178; el aviso y el E2E, en TASK-0179.
- El servidor de desarrollo estaba caído; relanzar con `pnpm run dev` antes de la
  prueba manual.

# Desviaciones y fricción

- `experiments/EXP-003-mesa-combate/experiment.md` sigue describiendo la recarga
  completa. Es documentación de `game-lead`; se corrige en un commit de docs tras
  el merge, fuera del alcance de esta tarea.
- Fricción del informe (`measure.test.ts` solo escribe el JSON si falta):
  clasificada como **local de herramientas de test**. No bloquea; no se cambia el
  arnés sin aprobación.
