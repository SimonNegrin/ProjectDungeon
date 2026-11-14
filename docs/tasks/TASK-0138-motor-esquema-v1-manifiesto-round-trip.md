---
type: Task
id: TASK-0138
title: "Motor: esquema v1, manifiesto y round-trip"
description: "Definir el estado serializable v1, el manifiesto y la validación estricta, con ida y vuelta determinista que incluya RNG, party, activo, ronda, fantasmas, cadáveres y `lootable`."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-024
requirement_ids: [R-008, R-009, T-001, T-002, T-004, T-005]
depends_on: [TASK-0133, TASK-0134]
unlocks: [TASK-0140, TASK-0141, TASK-0142, TASK-0143, TASK-0145, TASK-0157, TASK-0158]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0138/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que el motor produzca y acepte un estado de partida v1 completo y determinista,
con manifiesto validable y sin que cargar vuelva a tirar botín o altere el RNG.

# Contexto

REQ-024 define el
[formato v1](../requirements/REQ-024-menu-pausa-guardado.md#formato-de-guardado-v1)
y la serialización en
[T-001](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-técnicos).
REQ-034
[T-010](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md#requisitos-técnicos)
añade `lootable` y contenedores de cadáver. La nota de sesión: la v1 usa el
`Container` actual; si REQ-020 cambia el modelo antes de publicar, sube
`format_version`.

# Criterios de aceptación

- [ ] `partida.json` incluye `format_version: 1`, semilla, estado del RNG, mapa,
      fase/turno/ronda/activo, party, unidades con stats, PV, MP, acciones, maná,
      cupo de hechizos, inventario y equipo, fantasmas, cadáveres, contenedores,
      objetos del suelo, estado de IA y contadores de ids.
- [ ] `lootable` y los contenedores de cadáver se serializan; al cargar no se
      recalcula la tirada.
- [ ] `manifiesto.json` valida `format_version`, `game_version` informativo,
      `created_at` ISO UTC, `seed` y `summary` con party, turno, ronda y fase.
- [ ] Un manifiesto ausente, malformado o con versión desconocida se rechaza sin
      tocar el estado; `partida.json` se valida con un esquema estricto, sin
      campos extra, tipos erróneos ni `eval`.
- [ ] El test de ida y vuelta demuestra que serializar, cargar y volver a
      serializar produce el mismo estado, incluido el siguiente resultado del
      RNG.
- [ ] El guardado se construye desde el motor y no contiene timeline, cámara,
      cursor ni panel.
- [ ] Si el modelo de `Container` cambia antes de publicar la v1, se sube
      `format_version` y se documenta; no se publica una v1 incompatible.
- [ ] `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/game/save-schema.test.ts` nuevo.
- Integración: partida con fantasmas, cadáveres, contenedores y `lootable`.
- E2E / visual: no aplica; la UI es TASK-0140 y TASK-0141.
- Manual: abrir `partida.json` y comprobar que no hay datos de presentación.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0138/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/save-schema.test.ts tests/unit/game/engine.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar el zip ni la descarga; eso es TASK-0137 y TASK-0140.
- No implementar selectores, menús ni confirmaciones.
- No incluir presentación ni estado del host.
- No migrar formatos ya publicados.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Guardar desde la pausa o cargar desde el menú.
- Guardado automático, nube o cuentas.
- Cambiar las reglas de botín, muerte o resurrección.
- Cerrar el modelo de REQ-020.
