---
type: Task Brief
title: "TASK-0120: brief del intento 1"
description: Restaurar el consumo del reloj de feedback y detener el render en reposo.
task: TASK-0120
attempt: 1
status: stable
brief_bytes: 2555
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T22:35:00Z }
---

# Objetivo

Que banners, textos de daño y marcas caduquen con el reloj de presentación y que,
agotado el feedback, no quede ningún `requestAnimationFrame` repintando a ~60 fps.
Un E2E real debe fallar antes y pasar después, con la reproducción previa
guardada.

# No objetivos

- `src/game/**`, reglas, duraciones, beats, orden ni aspecto.
- `setTimeout` para feedback (REQ-017 T-005).
- Panel/TASK-0119; su robustez no sirve de muleta.

# Invariantes

- `advance(ms)` sigue siendo determinista y equivalente al reloj real.
- Fases, alarma, daño y recogida conservan su presentación; sin regresiones.
- Sin borrar, saltar ni adaptar tests existentes.

# Criterios de aceptación

En `docs/tasks/TASK-0120-reloj-feedback-bucle-render.md#criterios-de-aceptación`;
el informe mapea cada uno a su evidencia.

# Contexto mínimo (causa reproducida)

- `src/host/main.ts` (~542-590): `scheduleTextFrame()` anula
  `textLastFrameTime` en cada reenganche; `textTick` calcula `raw = 0`,
  `advanceTransientFeedback(0)` no descuenta y `hasTransientFeedback()` sigue
  `true`; el bucle no termina.
- La animación ya usa un reloj correcto (`tick`/`cancelFrame`); seguir ese
  patrón.
- Evidencia: `artifacts/TASK-0119/lead-repro/README.md` y sus `diagnose-*.txt`.
- `settle()` consume el banner y oculta el fallo; el E2E nuevo usa tiempo real.

# Secuencia obligatoria

1. E2E nuevo sobre el código actual; guardar salida, banner vivo a los 2 s y
   conteo de renders en `artifacts/TASK-0120/attempt-1/before/`.
2. Arreglo mínimo del reloj de feedback.
3. Repetir el E2E en `after/`; ejecutar `pnpm run verify` y `pnpm run test:e2e`
   completos.

# Tests sugeridos

- E2E real: recoger o cambiar de arma, esperar 2 s sin `settle`; banner oculto.
  Instrumentar `requestAnimationFrame` o mutaciones de HUD/panel: en 1 s de
  reposo el conteo deja de crecer. Repetir con daño (1000 ms, máximo tres, sin
  reiniciar su animación).
- Unitario solo si extraes un reloj o predicado puro; si no, justificarlo.

# Artefactos

`artifacts/TASK-0120/attempt-1/`: `report.md`, `before/`, `after/`,
`verify-output.txt`, `e2e-output.txt`, capturas y SHA.

# Riesgos

- Resetear el delta al reanudar sin reintroducir el bucle.
- Falso arreglo si el E2E usa `settle()`.
