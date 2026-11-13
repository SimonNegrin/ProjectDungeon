---
type: Task Verification
title: "TASK-0083: verificación independiente del lead"
description: Revisión del diff, re-ejecución de verify/E2E/docs y comprobación de criterios del intento 1.
task: TASK-0083
attempt: 1
status: stable
verified_at: 2026-11-13T14:09:43Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T14:09:43Z }
---

# Alcance revisado

- Rama `task/TASK-0083`, commits `ced7838` (brief/planificación), `e5c9ec2`
  (host), `8166dce` y `d2e0f15` (tests), `9a08524` y `d32e443` (artefactos).
- Diff completo: `src/host/{input,spell-menu,spell-menu-view,hud,notices,feedback-config,motion,main}.ts`,
  `index.html`, siete archivos de test y artefactos. `src/game/**`,
  `docs/requirements/**`, `docs/harness/**`, `docs/templates/**`, `package.json`
  y `pnpm-lock.yaml` no cambian.
- No hay tests borrados, saltados ni debilitados. El cambio de `translate('q')` a
  `translate('z')` en `input.test.ts` solo libera `Q` para la lista; los mensajes
  previos de `notices.test.ts` se conservan.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 85 archivos, 1170/1170; docs, config, tsc, build y bundle | `lead-verify.txt` |
| `pnpm run test:e2e` | 116/116 | `lead-e2e.txt` |
| `pnpm run docs:check` | OK: 437 documentos, 92 tareas, 6 experimentos | `lead-docs-check.txt` |
| `E2E_ARTIFACTS_DIR=…/lead-e2e pnpm run test:e2e spell-hud-qa` | 4/4 | `lead-e2e.txt` y `lead-e2e/` |

Las capturas del lead son byte-idénticas a las del runner (SHA-256 comprobado),
incluidas las de 1280×720 y 900×700.

# Criterios

| # | Resultado | Evidencia |
|---|---|---|
| 1 | Cumple | Lista con seis filas, nivel/coste/disponibilidad; `Q`, `↑/↓`/`W/S`, `1-6`, `Enter`, `X`, `Esc`; cancelar no consume (E2E y unitarios). |
| 2 | Cumple | `Magia`/`Maná` del jugador y del enemigo bajo cursor; debug con todas las unidades (unitarios y E2E). |
| 3 | Cumple | Lanzamiento con una pulsación y rechazos de maná, nivel, alcance y tope con texto, sin consumir recursos ni RNG; acción y LOS validados en motor con tests de `TASK-0082` y unitarios del host. |
| 4 | Cumple | Beats `spellHit`, `spellMiss`, `spellHeal` y `spellResurrect`; `-N`/`Fallo` reutilizan el nodo de daño, curación `+4` y resurrección `Vuelve N PV`; sin texto de réplica. |
| 5 | Cumple | E2E lanza Eléctrico I, Fuego II y Curación III; rechazos de maná, nivel, alcance y tope; HUD, coste de acción/maná y ausencia de réplica. |
| 6 | Cumple | Capturas a 1280×720 y 900×700; `verify` y `docs:check` pasan. |
| 7 | Cumple | Sin cambios en `src/game/**`; total y desglose se leen de `SpellCast`. |

# Revisión visual

- Lista: seis filas legibles, `Nv`/coste y disponibilidad, selección resaltada.
- HUD: `Magia 4`, `Maná 16/16`, `Acciones 3/3`; en curación `Maná 10/16` y
  `+4` verde sobre el aliado.
- Observación no bloqueante: la lista flota sobre la parte derecha del HUD
  mientras está abierta (más visible a 900×700). El usuario puede decidir si
  quiere reposicionarla en una tarea de pulido; no afecta a los criterios.

# Fricción triada

| Propuesta | Clasificación | Disposición |
|---|---|---|
| Reservar `E2E_ARTIFACTS_DIR` al spec de la tarea | Documental/arnés | `rejected`: `docs/harness/visual-qa.md` ya documenta el comando con `<spec>` y la suite normal escribe en `test-results/`; no se cambia el arnés. |

# Conclusión

Verificación independiente favorable. El intento 1 cumple los criterios y puede
fusionarse; el QA de playtest queda para el usuario.
