---
type: Task Report
title: "TASK-0096: informe de ejecución"
description: Objetos del suelo con items.png, icono en panel, cues de soltar/desequipar y F1 ampliado.
task: TASK-0096
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:58:00Z }
artifacts: artifacts/TASK-0096/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/assets.ts`: `items` en `ASSET_URLS`/`GameAssets` y carga en paralelo.
- `src/host/renderer.ts`: sustituye `drawWeaponShape` por el recorte
  `ITEMS[...].sprite.rect` para todas las categorías; retira `WEAPON_SHAPE_COLORS`.
- `src/host/inventory-panel.ts`/`-view.ts` + `index.html`: icono DOM 32×32 con
  fondo CSS posicionado sobre `items.png`, mismo `rect` que el mundo.
- `src/host/presentation.ts`/`motion.ts`/`main.ts`: eventos sintéticos
  `DropItem`/`UnequipItem`; inventario, equipo, MP y suelo se aplican al acabar
  su beat. Cues/banners existentes de REQ-017 (`pickup`/`select-weapon`).
  `prefers-reduced-motion` colapsa el beat y aplica el estado final.
- `src/host/hud.ts` + `index.html`: `KEYS_HELP` con `I`/`Escape`; F1 añade
  mochila/capacidad, equipo por hueco y suelo con localización.
- Tests actualizados: renderer, growth-render, panel, presentación, HUD y debug.
- Commits: `dd14940`, `1e680f5`, `bbd79c8`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK (docs, config, 1248 unitarios, build, bundle) | `verify-output.txt` |
| `pnpm exec vitest run` focalizado | 145/145 | `focused-test-output.txt` |

Criterios: todos los de `docs/tasks/TASK-0096-host-objetos-suelo-sprite-debug.md`.

# Evidencia visual

- Sin captura manual. El recorte y el orden objeto→unidad se cubren con tests;
  la QA visual/E2E llega en TASK-0098, como fija el brief.

# Desviaciones

- Ninguna funcional. Los E2E que aún esperan `G`/`1`-`3` no se tocaron.

# Problemas conocidos y preguntas abiertas

- El icono se verifica por modelo y recorte compartido; no hay test DOM porque
  el proyecto no usa jsdom.
- `DropItem`/`UnequipItem` reutilizan el cue `select-weapon` y su banner con
  nombre para no añadir copy ni filas nuevas a la matriz de REQ-017.

# Fricción reutilizable

Ninguna entrada: no hubo comportamiento no documentado ni workaround repetido.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3207 |
| `report_bytes` | 2453 |
| `overflow` | `none` |
| `criteria_failed` | `none` |
