---
type: Task Report
title: "TASK-0098: informe del intento 1"
description: E2E y QA visual del panel de inventario y equipo; bloqueo en el caso de arma a dos manos.
task: TASK-0098
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T21:40:00Z }
artifacts: artifacts/TASK-0098/attempt-1/
verified:
---

# Estado

`blocked`: todos los criterios salvo el E2E de arma a dos manos con escudo (y su
captura) quedan cubiertos y en verde. El catálogo no tiene ninguna arma con
`hands: 2` y la tarea prohíbe cambiarlo; no hay hook de test para inyectar otro
catálogo. Evidencia: `src/game/equipment.ts` solo declara armas a una mano;
`docs/tasks/TASK-0093...md` difiere el soporte a una entrada de test hasta
`REQ-020`/`REQ-019`; `tests/unit/game/inventory.test.ts` usa catálogo sintético.
El resto no se rodeó.

# Cambios

- Nuevo `tests/e2e/inventory-equipment-qa.spec.ts`: panel con `I`/`Escape`,
  mapa bloqueado, suelo vacío omitido, equipar/desequipar, comparación y stats,
  recoger/soltar (incluido equipado), mochila llena, sin MP, `G`/`1`-`3` no-op,
  sprites, `F1`, capturas 1280×720 y 900×700.
- `tests/e2e/support.ts`: helpers de test id y foco/acción del panel con `Tab` y
  `Enter` reales.
- `equipment-hud-qa`, `combat-equipment-qa`, `damage-types-qa`: pista del panel,
  recogida/equipado desde el panel y `1`-`3` como no-op; se conserva la cobertura
  de HUD, combate y bandas.
- `default-character-qa`, `feedback-inventory-perception-qa`: realineado mínimo
  de aserciones legacy (`equipment` por huecos y recogida sin auto-equipar).
- Commit: `fdf862f`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK, 1249/1249 | `verify-output.txt` |
| `pnpm run test:e2e` | OK, 131/131 (300 s) | `e2e-output.txt` |
| `pnpm run test:e2e <6 specs> --repeat-each=3` | OK, 90/90 | `test-output.txt` |

El baseline del brief era incompleto: además de los tres specs citados,
`default-character-qa` y `feedback-inventory-perception-qa` fallaban por
aserciones legacy; se realinearon sin borrar casos.

# Evidencia visual

- `inventory-equipment-qa/screenshots/`: `panel-abierto-*`,
  `mochila-llena-*`, `suelo-vacio-*` (1280×720 y 900×700), más comparación,
  equipado al suelo, mochila llena, sin G/1-3 y debug. Para mochila llena se
  añadió la variante `*-inferior` porque el cuerpo del panel hace scroll.
- `inventory-equipment-qa/logs/panel-metrics.json`: a 900×700 el cuerpo mide
  1090 px de scroll para 454 px visibles (sin desbordamiento horizontal). No se
  tocó el layout.
- Mirrorar las capturas de panel abierto y mochila llena, y revisar que el HUD,
  la mochila y el suelo coinciden.

# Desviaciones

- Se tocaron dos specs fuera de los tres citados por el brief-detalle; era
  necesario para que la suite completa pasara y para conservar la intención de
  feedback y smoke. Sin tests eliminados ni aserciones más laxas.
- El caso de dos manos queda sin E2E ni captura: bloqueado por el catálogo.

# Problemas conocidos y preguntas abiertas

- Decisión necesaria: añadir un arma a dos manos al catálogo en otra tarea
  (REQ-019/REQ-020) o enmendar TASK-0098 para cubrir la regla solo en unitarios.
- `e2e-output.txt` usa 300 s, no 180 s, para no cortar la suite completa.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El criterio E2E de dos manos exige un objeto que el catálogo difiere a REQ-019/020. | `src/game/equipment.ts`; `docs/tasks/TASK-0093...md`; `tests/unit/game/inventory.test.ts` | Unitarios con catálogo sintético | Afecta a cualquier QA visual de dos manos antes de REQ-019 | Añadir la pieza en su tarea o enmendar el criterio | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2516 |
| `report_bytes` | 3986 |
| `overflow` | `none` |
| `criteria_failed` | 1 (dos manos E2E + captura) |
