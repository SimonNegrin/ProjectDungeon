---
type: Lead Verification
title: "TASK-0112: verificación independiente del intento 1"
description: Comprobación de criterios, diff, tests y evidencia de los biseles de 2×.
task: TASK-0112
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T16:25:00Z }
---

# Resultado

Aceptado. Intento 1 (`success`) verificado sobre la rama `task/TASK-0112`.

# Diff revisado

- Código `36d315d7bb18703583d6dab5f7bfd7e81b0efa9e`; evidencia
  `4828014b630ac53e62d8f1e5637399d0d4d0a85d`.
- Solo `src/host/ui.css`, tests y artefactos. Sin cambios en `src/game/**`,
  `index.html`, requisitos, arnés, plantillas ni dependencias.
- `--ui-bevel = 2 × --ui-line`; `.ui-outset`/`.ui-inset` pintan el bisel con
  contornos exteriores y conservan la caja; `.inventory-panel-body` usa borde
  real 2× compensado; marco con pseudo exterior. Cursor del mapa y del panel sin
  cambios de diseño.

# Comandos reejecutados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run verify` | 120 s | OK: docs, config, 1320/1320 unitarios, tsc, build y bundle |
| `pnpm run test:e2e` | 180 s | OK: 189/189 |

Sin procesos escuchando en 4173 tras el E2E.

# Criterios

- Token `2 × --ui-line` y consumo por biseles y marco: unitarios y auditoría de
  estilos. No queda bisel visible a 1×; los 1× restantes son cursor del panel
  (0116), `outline` de foco, separadores y guías de figura.
- Interior preservado (±1 px): medido por A/B forzando `--ui-bevel` a 1× y
  restaurando 2× a 900×700 y 1280×720. Deltas máximos 0,82 px en panel-body;
  HUD, zona, ficha, columna, slot, botón y submenú estables.
- Bisel: 2×1,1737 = 2,347 px a 900×700 y 2×1,6010 = 3,202 px a 1280×720. El
  token es continuo; Chromium cuantiza el grosor pintado (2 y 3 px), como
  registra el informe. «≈3 px» se lee como orden visual, no redondeo del token.
- Sin solapes, recortes ni CLS: tests de CLS y capturas revisadas; marco crece
  fuera sin clip y el canvas no cambia.
- Cursor del mapa: CSS intacto; test comprueba 2× línea.
- Tests de relieve adaptados con más cobertura (token, pseudo, geometría A/B);
  no se borró, saltó ni debilitó cobertura.

# Fricción

- «Redondeo de borde/outline en `getComputedStyle`»: `deferred`; es
  documentación de arnés y se eleva a `requirements-writer` para que decida si
  la aplica `harness-keeper`. No bloquea la tarea.
- Observación no bloqueante para la secuencia: los dos pseudo-elementos de
  `.ui-inset` quedan ocupados por el bisel; TASK-0115 puede necesitar una capa
  hija o un pseudo distinto para la silueta. No se adelanta trabajo.
