---
type: Task
id: TASK-0011
title: "E2E y QA visual del mapa generado"
description: Cubre con Playwright y capturas la semilla, las salas, los muros, las puertas, los pasillos anchos, la cámara, el HUD y el rendimiento del mapa generado.
status: draft
task_status: ready
task_type: test
requirement: REQ-003
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, T-004, T-006, T-007, T-008]
depends_on: [TASK-0010]
unlocks: []
created_at: 2026-11-07T22:17:27Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0011/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:17:27Z }
verified:
---

# Objetivo

Demostrar con tests deterministas y capturas que el mapa generado cumple
`REQ-003`: 32×32, semilla reproducible, salas grandes y pequeñas, pasillos
estrechos y anchos, huecos de puerta, apariciones, muros correctos, cámara, HUD y
rendimiento. El usuario hace el playtest final.

# Contexto

- Requisito: [REQ-003](../requirements/REQ-003-generacion-mapa.md).
- Implementación: TASK-0008 (BSP), TASK-0009 (puertas y pasillos anchos) y
  TASK-0010 (host, muros y debug).
- QA: [estrategia de tests](../quality/test-strategy.md) y
  [QA visual](../harness/visual-qa.md).
- E2E existentes: `tests/e2e/game-render.spec.ts`,
  `tests/e2e/game-input-hud.spec.ts` y `tests/e2e/frame-qa.spec.ts`.
- Semilla de referencia: `279837264`; configuración `9/4/11/20`.

# Criterios de aceptación

- [ ] Una carga con `?seed=279837264` produce un snapshot con grid 32×32, 8-12
      salas, 1-2 pasillos anchos, huecos de puerta y spawns distintos.
- [ ] Dos cargas con la misma URL producen el mismo snapshot; `R` conserva la
      semilla; `F2` cambia la semilla y el mapa.
- [ ] El jugador aparece en una sala con salida; el enemigo no está en el
      viewport inicial; la cámara sigue y se limita en los cuatro bordes.
- [ ] La capa `F1` muestra semilla, salas, huecos, apariciones y anchura de
      pasillos; se puede ocultar.
- [ ] Los muros cumplen la regla por borde en una muestra de tiles y en las
      capturas: sin `wallSide2`, sin caras sobre muros y sin huecos.
- [ ] Los pasillos anchos se ven con 2 tiles de ancho, sin puertas, y cada sala
      conserva al menos un acceso estrecho con hueco.
- [ ] El HUD, el marco 16:9, el ataque y el feedback siguen funcionando.
- [ ] La generación de 32×32 se mide por debajo de 100 ms en el entorno de CI y
      el E2E no detecta tirones.
- [ ] Las capturas se guardan en `artifacts/TASK-0011/attempt-1/screenshots/`.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan; no se borran, saltan ni
      debilitan tests existentes.
- [ ] El usuario hace un playtest y aprueba la sensación del mapa y los muros.

# Plan de test

- **Unitario:** completar los huecos que dejen TASK-0008/0009/0010; no duplicar
  tests ya cubiertos.
- **Integración:** snapshot determinista con la semilla de referencia; cámara y
  bounds; debug; cambio de semilla.
- **E2E:** nueva spec `tests/e2e/generated-map-qa.spec.ts` con carga, semilla,
  salas, pasillos anchos, puertas, spawns, cámara, debug, HUD y capturas.
  Reutilizar `frame-qa.spec.ts` para el encuadre.
- **Visual:** capturas de mapa completo con debug on/off, detalle de muros en
  esquina y pasillo ancho, y una semilla alternativa.
- **Manual:** playtest del usuario para legibilidad, sensación de recorrido,
  utilidad táctica del pasillo ancho y aspecto de los muros.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 300 s | Mapa, encuadre, HUD y debug |
| `pnpm run build` | 120 s | Build final |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0011/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0011/attempt-1/test-output.txt`
- [ ] Capturas de mapa con debug on/off y semilla alternativa
- [ ] Detalle de muros y pasillo ancho
- [ ] Medición de rendimiento
- [ ] Commit SHA en la rama `task/TASK-0011`

# Restricciones

- No cambiar requisitos ni criterios.
- No debilitar tests existentes.
- No añadir features nuevas; si falta algo, se escala a requirements-writer.
- No tocar la economía de turno, el HUD ni el encuadre salvo lo necesario para
  corregir un fallo detectado.

# No objetivos

- Puertas abiertas/cerradas, barricadas, escaleras o varios niveles.
- Nuevos enemigos, IA, niebla de guerra, minimapa o arte final.
- Cambiar el algoritmo BSP por otro.

# Notas

- Si una semilla no cumple los mínimos de salas o pasillos anchos, guardar el
  caso y escalarlo; no relajar el requisito para que pase el test.
- La aprobación del usuario cierra el hito; el task-lead no decide la sensación.
