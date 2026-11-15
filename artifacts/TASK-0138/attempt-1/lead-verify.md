---
type: Task Verification
title: "TASK-0138: verificación independiente del intento 1"
description: Reejecución de tests, revisión del diff y comprobación de criterios.
task: TASK-0138
attempt: 1
status: stable
verified_by: task-lead
verified_at: 2026-11-15T16:55:35Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T16:55:35Z }
---

# Alcance revisado

Diff de `main...task/TASK-0138` (10 archivos):

- `src/game/save.ts`: esquema v1, manifiesto, validación estricta y API pura.
- `src/game/index.ts`: export del módulo nuevo.
- `tests/unit/game/save-schema.test.ts`: 62 tests nuevos.
- Artefactos del intento y estado de la ficha.

Sin cambios en requisitos, arnés, dependencias, RNG, botín, mapa, `Container`
ni tests existentes.

# Comandos reejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run tests/unit/game/save-schema.test.ts tests/unit/game/engine.test.ts` | 109/109 OK |
| `pnpm run verify` | 103 archivos, 1630/1630 tests; `docs:check`, `config:check`, `tsc`, build y bundle OK |

# Criterios

1. Payload completo: `format_version`, semilla, RNG, mapa, fase/turno/ronda/
   activo, party, unidades (stats, PV, MP, acciones, maná, hechizos, mochila y
   equipo), fantasmas, cadáveres, contenedores, suelo e IA. Los ids viajan en
   mapa, unidades e instancias; no hay allocator mutable.
2. `lootable` y contenedores de cadáver serializados; el parseo no tira botín ni
   consume RNG.
3. Manifiesto con versión, `game_version` informativo, `created_at` ISO UTC,
   semilla y resumen.
4. Manifiesto ausente/malformado/versión desconocida y partida con campos extra o
   tipos erróneos se rechazan sin mutar estado; sin `eval`.
5. Round-trip byte a byte y siguiente `rollDie` idéntico.
6. Construcción desde el motor; sin timeline, cámara, cursor ni panel.
7. V1 atada al `Container` actual (`kind`/`corpseOf` opcionales); sin migración.
8. `pnpm run verify` pasa.

E2E/visual no aplica: no hay UI ni zip en esta tarea.

# Triaje de fricción

| Propuesta | Clase | Disposición | Dueño |
|---|---|---|---|
| Ejemplo `phase: "players"` de REQ-024 frente a `player \| enemy` del modelo | Corrección documental | `deferred` | `requirements-writer` |
