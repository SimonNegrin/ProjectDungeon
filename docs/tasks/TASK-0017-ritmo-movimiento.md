---
type: Task
id: TASK-0017
title: "EXP-002: ritmo del movimiento animado"
description: Construir el experimento interactivo que compara duración de paso, pausa por tile y tratamiento de la diagonal para decidir el ritmo de REQ-006.
status: stable
task_status: in_progress
task_type: experiment
requirement: REQ-006
requirement_ids: [R-002, R-003, R-004, R-005, R-007, R-008, T-004, T-007]
depends_on: [TASK-0016]
unlocks: []
created_at: 2026-11-08T09:51:14Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0017/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:51:14Z }
verified:
---

# Objetivo

Construir `EXP-002` en `experiments/EXP-002-ritmo-movimiento/` con el shell
compartido. La página reproduce un recorrido animado sobre la rejilla real de
13×13 con los tiles y sprites de 32rogues y permite comparar presets y ajustar
duración de paso, pausa y diagonal para que `human:simon` decida el ritmo de
`REQ-006`.

El resultado no se promociona a `src/` en esta tarea. Solo se construye y se deja
listo para probar y decidir. La decisión creativa no la toma el runner.

# Contexto

- Requisito: [REQ-006](../requirements/REQ-006-movimiento-animado.md).
- Experimento: [EXP-002](../../experiments/EXP-002-ritmo-movimiento/experiment.md).
- Shell: [experimentos](../harness/experiments.md) y
  `experiments/EXP-001-generador-mazmorra/` como referencia.
- Viewport y cámara: `src/host/camera.ts`, `src/host/layout.ts` y
  `src/host/renderer.ts`.
- Sprites y tiles: `public/assets/32rogues/` y `src/host/assets.ts`.
- Página y código previstos:
  - `experiments/EXP-002-ritmo-movimiento/index.html`
  - `experiments/EXP-002-ritmo-movimiento/src/main.ts`
  - `experiments/manifest.ts`
  - `tests/e2e/experiment-motion.spec.ts`

# Criterios de aceptación

- [ ] La página `/experiments/EXP-002-ritmo-movimiento/` carga, aparece en
      `experiments/manifest.ts` y en el índice de experimentos, y no rompe el
      índice si se abre con `?test=1`.
- [ ] Hay un único objetivo: comparar el ritmo. La cámara continua a píxel
      entero, el cursor oculto y el MP progresivo son constantes de la maqueta,
      no variables que se puedan cambiar.
- [ ] El escenario **corto** tiene 2–3 pasos rectos y el **largo** 6 pasos con al
      menos una diagonal y un tramo junto al borde del mapa para ver el clamp de
      la cámara. Ambos usan la rejilla de 13×13 tiles de 32 px y los tiles
      reales.
- [ ] El personaje recorre el camino paso a paso: transición animada entre
      centros de tiles, pausa por tile y pausa en el destino. No hay
      teletransportes ni saltos de más de un tile.
- [ ] Presets A · Ágil (90/30 ms), B · Medio (125/50 ms) y C · Pausado
      (160/75 ms). Los sliders permiten `stepMs` 40–250 y `pauseMs` 0–200. El
      preset se marca como `personalizado` al mover un slider.
- [ ] El selector de diagonal compara **velocidad constante** (paso × √2) y
      **duración constante** (mismo tiempo que un paso recto), y el efecto se
      nota en el escenario largo.
- [ ] La cámara sigue al personaje con offsets enteros y clamp al mapa; el
      personaje queda centrado salvo en los bordes. No hay subpíxel ni saltos por
      tile.
- [ ] Durante la reproducción se ignoran las teclas de juego; al terminar
      aparece **Listo**, se restaura el control y se puede repetir con el botón o
      con `Espacio`. El cursor no se dibuja mientras se camina y los puntos del
      camino se apagan al ser recorridos.
- [ ] El HUD de MP baja paso a paso conforme a los pasos, no de golpe al final.
- [ ] El panel de decisión permite elegir A/B/C o **personalizado**, añadir notas
      y exportar un JSON con `stepMs`, `pauseMs`, `diagonal`, preset, escenario,
      semilla, notas y fecha. No decide por el usuario.
- [ ] El modo `?test=1&seed=...` es determinista y `window.__experiment` expone
      parámetros, escenario, estado de reproducción (`idle`/`playing`/`ready`),
      paso actual, posición visual, cámara y decisión. Incluye un avance
      determinista del reloj de presentación para el E2E.
- [ ] Hay un E2E nuevo que carga la página, comprueba ambos escenarios y
      presets, reproduce el camino largo, verifica paso intermedio, cámara
      entera, MP progresivo y exporta una decisión. No depende de esperas por
      reloj real.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan. No se borran, saltan ni
      debilitan tests existentes.
- [ ] No se modifica código de producción: `src/`, `index.html`, `public/`,
      `package.json` y `pnpm-lock.yaml` quedan intactos. Solo cambian
      `experiments/`, `tests/e2e/` y los artefactos.

# Plan de test

- **Unitario:** normalización de parámetros y presets, duración de paso recto y
  diagonal, pausa por tile, avance del reloj con deltas grandes y pequeños,
  geometría de cámara con clamp y determinismo del escenario.
- **Integración:** montar el experimento en modo test, reproducir el camino
  corto y el largo, comprobar `playing` → `ready`, MP por paso y posición final.
- **E2E:** `tests/e2e/experiment-motion.spec.ts` con carga, escenarios, presets,
  sliders, reproducción con reloj determinista, cámara entera, MP progresivo,
  decisión y captura.
- **Visual:** capturas de A/B/C y del escenario largo con la misma semilla en
  `artifacts/TASK-0017/attempt-1/screenshots/`.
- **Manual:** el usuario abre la página, compara, ajusta y decide. Esa decisión
  no la toma el runner.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Lógica del experimento y shell |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Página del experimento y regresiones |
| `pnpm run build` | 120 s | Build con el experimento nuevo |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0017/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0017/attempt-1/test-output.txt`
- [ ] Capturas de A/B/C con la misma semilla y del escenario largo
- [ ] JSON de ejemplo exportado por el panel de decisión
- [ ] Commit SHA en la rama `task/TASK-0017`

# Restricciones

- Una pregunta por experimento: el ritmo. No mezclar cámara, cursor, bloqueo de
  input ni reglas de juego.
- El experimento es desechable: no se importa desde producción ni se promociona
  automáticamente. Solo los valores numéricos pasan a `REQ-006`.
- No tocar `docs/requirements/REQ-006`, `docs/` en general, `src/`, `index.html`,
  `public/`, `package.json` ni `pnpm-lock.yaml`.
- No añadir dependencias nuevas.
- Mantener el estilo y la estructura del shell de `EXP-000` y `EXP-001`.
- No decidir la variante ni los valores; solo dejar la maqueta y la exportación
  listas.

# No objetivos

- Implementar la animación en el juego real.
- Cambiar la cámara de producción, el cursor, el HUD o el input.
- Arte final, ciclos de caminar, sonido o efectos.
- Probar otras reglas de movimiento, pathfinding o economía de turno.
- Elegir el ritmo definitivo.

# Notas

- El escenario largo debe incluir una diagonal para que el selector de diagonal
  tenga efecto visible.
- La pausa de 0 ms está permitida en los sliders para comparar, aunque `REQ-006`
  exige una pausa pequeña; el preset ganador debe tener pausa > 0.
- Si el navegador no soporta `prefers-reduced-motion`, la maqueta puede ignorarlo;
  el modo instantáneo de producción se prueba en su tarea.
