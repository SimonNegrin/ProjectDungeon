---
type: Task Verification
title: "TASK-0082: verificación independiente del lead"
description: Re-ejecución de verify, docs y E2E; revisión del diff, criterios y triaje de fricción.
task: TASK-0082
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T23:35:00Z }
artifacts: artifacts/TASK-0082/attempt-1/
---

# Resultado

Verificado en `task/TASK-0082`: código final `e926383`, informe `16a5887`.
Los ocho criterios se cumplen; sin regresiones, tests debilitados ni
dependencias nuevas. Se corrigió un hueco de comando.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (240 s) | 1091/1091; docs, config, tsc, build y bundle OK | `logs/lead-verify.txt` |
| `pnpm run docs:check` (60 s) | OK: 413 documentos, 84 tareas, 5 experimentos | `logs/lead-docs-check.txt` |
| `pnpm run test:e2e` (180 s, extra) | 112/112 | `logs/lead-e2e.txt` |

`docs:check` solo emite avisos preexistentes y los de tamaño objetivo de este
brief/informe; ambos quedan bajo el tope duro de 4096 B.

# Criterios

| # | Criterio | Evidencia | Estado |
|---|---|---|---|
| 1 | `spells.ts` serializable y fuente única; seis hechizos; resolver por `kind`, no por id | catálogo comparado con REQ-025; test que muta poder/coste | OK |
| 2 | Validación atómica de fase, vivo, acción, maná, nivel, alcance, LOS y objetivo; rechazo sin consumo ni RNG | `magic.ts:100-202`, `engine.ts:404`; `expectRejected` compara estado y RNG | OK |
| 3 | 1 acción y coste final; tope 2 por unidad/turno independiente de acciones | `spendCast`, `Unit.spellsCast`, reinicio en `turn.ts`; test con 3 acciones y recarga | OK |
| 4 | Ataque con capas del físico, empate falla, daño mínimo 1, sin resistencia mágica ni réplica | `resolveMagicAttack` reutiliza `resolveHit`/`resolveDamage`/equipo; tests de empate, fuego/eléctrico, absorción y no réplica | OK |
| 5 | Curación sin tirada, aliado 2–3 con LOS, no a sí mismo/enemigos, cap de PV máximo | tests de rango 1/2/4, LOS, self, enemigo, muerto y tope de PV | OK |
| 6 | Resurrección nivel 4, coste 8, adyacencia a jugador muerto, casilla sin vivos, 60 % ceil mínimo 1 | `resurrection-4`; tests de PV, dos resurrecciones, nivel/maná/alcance y ocupación | OK |
| 7 | Proyectiles con alcance y LOS; muros bloquean, unidades no; determinismo sin `Math.random` | tests de muro vs aliado interpuesto, misma semilla y espía de `Math.random` | OK |
| 8 | Tests de rechazos, tope, fuego/eléctrico, curación, resurrección, proyectil y determinismo; sin HUD/input/IA/arte | `magic.test.ts` (37); solo etiqueta de debug y beat 0, sin UI de juego nueva | OK |

# Diff y tests

- Diff `main..HEAD`: `src/game/{spells,magic,types,engine,turn,roster,combat,index}.ts`,
  tests y artefactos; `hud.ts`/`motion.ts` solo cubren switches exhaustivos
  (etiqueta de debug/beat 0). `package.json` y lock intactos.
- Sin tests borrados, saltados ni aserciones relajadas; 1054 → 1091. Catálogo
  coincide con REQ-025.
- Corrección: `reduceCastSpell` busca al lanzador en `state.players`; test
  `enemy-1` → `unknown-unit` sin consumir estado ni RNG (`e926383`).

# Requisitos

REQ-025 y REQ-021 R-009/R-010/R-013 cubiertos por catálogo, resolvedor y tests.
Fantasma/wipe fuera como pide la ficha.

# Triaje de fricción

| Propuesta | Clase | Disposición |
|---|---|---|
| Un `GameEvent` nuevo obliga a tocar `hud.ts`/`motion.ts` por switches exhaustivos | Arnés/diseño de presentación | `deferred` a `requirements-writer`/`harness-keeper`: `hud.ts:190`, `motion.ts:262,477`; no bloquea. |
| El resucitado conserva MP, acciones, maná y `spellsCast` de su muerte | Requisito ambiguo | `deferred` a `requirements-writer`: REQ-021/025 solo fijan PV de retorno. |
| Brief (4032 B) e informe (4084 B) superan el objetivo de 2560 B | Local de la tarea | `accepted`: bajo el tope duro y `docs:check` pasa. |
| `CastSpell` aceptaba un `unitId` enemigo en fase de jugador | Local de la tarea | `accepted` y corregido en `e926383` con test. |

# Cierre

Listo para fusionar; `main` sin cambios ajenos.
