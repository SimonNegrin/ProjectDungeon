---
type: Task Report
title: "TASK-0045: informe de ejecución"
description: Spawn protegido, reparto de enemigos y salida en el core; BSP adaptado sin salida.
task: TASK-0045
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:27:00Z }
artifacts: artifacts/TASK-0045/attempt-1/
verified:
---

# Estado

`success`. Core puro con spawn protegido, reparto de enemigos y salida única;
BSP adopta el contrato de spawn y conserva 4 enemigos en 4 salas sin salida.

# Cambios

- Core nuevo: `src/game/chambers/core/{spawn,enemies,exit,contents}.ts`,
  exportado desde `core/index.ts`.
- Integración: `src/game/bsp.ts`, `src/game/enemy-placement.ts` y reserva de
  `party` en `src/game/map.ts`. Sin `variants/growth.ts`, sin `src/host/` y sin
  cambiar el generador por defecto.
- Tests: 5 archivos nuevos y adaptación de los casos BSP de spawn en
  `map.test.ts`, `debug.test.ts`, `hud.test.ts`, `renderer.test.ts` y
  `session.test.ts`.
- Commit SHA: `00046a1` (código y tests); evidencia en el commit posterior.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | pasa: 52 archivos, 688 tests, build 519 ms | `verify-output.txt` |
| `pnpm run test` | pasa: 52 archivos, 688 tests | `test-output.txt` |
| Barrido 200 semillas | 200/200 sin incidencias | `seed-sweep.txt` |
| Regresión BSP/REQ-009 | 5 archivos, 77 tests | `bsp-regression.txt` |

Cubre protección y empate de spawn, acceso, 6 huecos, componentes 8-dir ≤2,
fallbacks, fórmula `T`, reparto 60/20/20, interiores, emboscadas 0/1/0,25,
reserva de salida, modos `door`/`stairs-*`/`random`, pureza, serialización y
contrato BSP en 25 semillas.

# Evidencia visual

- Rutas: `seed-sweep.txt` y `bsp-regression.txt`.
- Qué mirar: los 200 registros y las aserciones BSP de 4 enemigos, 4 salas,
  pareja ≤8 y aislado >8.

# Desviaciones

- No se ejecutó `pnpm run test:e2e`: QA/E2E es TASK-0049 y
  `generated-map-qa.spec.ts` aún fija cámara y movimiento con el spawn antiguo.
- `validateGeneratedMap` no se aplica a los planes densos: pasillos <3 y 1-3
  huecos chocan con el core. No se relajó BSP; queda para TASK-0046.
- `spawns.enemy` se conserva serializado como ancla opcional de `enemy-1`; la
  colocación deriva de `party`/`spawns.roomId`.
- En 3 de 200 semillas la salida queda a distancia 1 con aviso (R-007).

# Problemas conocidos y preguntas abiertas

- Ninguna decisión creativa nueva; el estilo final de salida sigue abierto.
- La incompatibilidad de `validateGeneratedMap` se difiere a TASK-0046.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Spawn pide bocas abiertas y BSP no las expone | `bsp.ts` las deriva de corredores `width: 2` | Derivarlas antes del core | Todo consumidor sobre BSP repite el cálculo | Exponerlas o aceptar corredores | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3600 |
| `report_bytes` | 3104 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
