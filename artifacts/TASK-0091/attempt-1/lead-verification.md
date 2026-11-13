---
type: Verification Report
title: "TASK-0091: verificación independiente del intento 1"
description: Comprobación de criterios sobre el diff de diseño y glosario, auditoría del plan y estado de la nota de requisitos pendiente.
task: TASK-0091
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T16:35:00Z }
---

# Resultado

Verificación `partial`: los criterios 1, 2, 3, 5 y 6 se cumplen en la rama; el
criterio 4 (notas de vigencia de REQ-010/014/015/025) no puede aplicarlo el lead
porque `docs/requirements/**` pertenece a `requirements-writer`. El texto exacto
está en `requirements-notes-patch.txt`.

# Diff revisado

- `782ee4e` y el ajuste posterior del aviso de magia: `docs/design/turn-economy.md`,
  `docs/design/architecture.md` y `docs/glossary.md`; 199 líneas añadidas y 92
  borradas. Sin cambios en `src/**`, `tests/**`, `package.json` ni dependencias.
- El plan del runner (`docs-plan.md`) se leyó completo y se contrastó con
  `damage.ts`, `equipment.ts`, `roster.ts`, `bestiary.ts`, `spells.ts`,
  `combat.ts`, `magic.ts`, `map.ts` y `types.ts`. Los valores de la tabla de
  armas, los nueve arquetipos, los tres enemigos y las bandas coinciden con el
  código; el martillo es el único arma nueva colocada en el mapa.
- Se sustituyeron los enlaces de referencia del plan por enlaces inline, porque
  el corpus no usa referencias y el validador solo comprueba destinos inline.

# Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| 1. `turn-economy.md#combate` con paquetes, bandas, armas y perfiles; daño único solo como historia | Cumple | Sección reescrita; `## Historia` marcada «No vigente» |
| 2. `architecture.md` con resolvedor único, perfiles, desglose y hechizos tipados; armadura no absorbe mágico/eléctrico | Cumple | Viñetas de combate y magia; `rg` sin afirmaciones antiguas |
| 3. Glosario con tipo, paquete, banda, perfil y daño del arma; daño mágico ≠ nivel de magia | Cumple | Fila nueva «Perfil de resistencia»; cuatro filas corregidas |
| 4. Notas de REQ-010/014/015/025 al modelo implementado y tareas | Pendiente | `requirements-notes-patch.txt`; requiere `requirements-writer` |
| 5. Enlace a ADR-023 y ADR sin contradicción | Cumple | `docs:check` valida el enlace; auditoría fila por fila del plan |
| 6. `docs:check` y `verify`; sin código ni tests | Cumple con salvedad | Ver abajo |

# Comandos

- `pnpm run docs:check`: OK, 446 documentos, 92 tareas, 6 experimentos
  (`lead-docs-check.txt`, exit 0).
- `pnpm run verify`: OK, 86 archivos, 1189/1189 (`lead-verify.txt`, exit 0).
- Salvedad: el barrido de 200 semillas de
  `experiments/EXP-004-salas-irregulares/src/spawn.test.ts` agota su timeout de
  5 s bajo carga. En esta verificación falló en tres ejecuciones completas y pasó
  en dos, además de pasar 20/20 en solitario
  (`pnpm exec vitest run experiments/EXP-004-salas-irregulares/src/spawn.test.ts`).
  No se tocó el test ni `src/**`; es un fallo intermitente preexistente, ya
  registrado en TASK-0088, TASK-0090 y TASK-0092, no una regresión de esta tarea.
- Sin tests borrados, saltados o debilitados: `git diff` no incluye `tests/**`.

# Estado de la tarea

- `attempts: 1`; rama `task/TASK-0091` con `cbf0cbc`, `782ee4e` y el commit de
  artefactos.
- No se fusiona ni se marca `done` hasta que se apliquen las cuatro notas y se
  re-ejecuten los comandos sobre el árbol final.
