---
type: Task Brief
title: "TASK-0038: brief del intento 2"
description: Corregir el rastro de "!" entre episodios y restaurar la aserción exacta de avisos.
task: TASK-0038
attempt: 2
status: stable
brief_bytes: 2604
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T23:20:00Z }
---

# Objetivo

Cerrar dos hallazgos de la verificación del lead sobre el intento 1, sin cambiar
el alcance ni `src/game/`.

# Hallazgos y evidencia

1. **"!" obsoleto entre episodios.** `src/host/spot.ts` solo añade ids a
   `spotUnits` (`trackSpottedUnits`) y `activeSpotMarkers` los muestra mientras
   `awareness === 'alert'`; `src/host/main.ts` nunca los poda. Si un detector de
   un episodio anterior vuelve a `dormant` y después lo alerta una onda sin
   `EnemySpotted`, el id viejo sigue en el set y el "!" reaparece, incumpliendo
   «no se muestra en enemigos alertados solo por la onda». Añade una poda
   determinista al salir de `alert`/morir (por ejemplo `reconcileSpottedUnits`)
   y úsala en el render; conserva el id solo mientras el detector siga vivo y en
   `alert`. Añade un test unitario: detector marcado → `returning`/`dormant` →
   alertado por onda (sin `EnemySpotted`) → sin marcador; una nueva detección
   posterior sí lo muestra.
2. **Aserción debilitada.** `tests/unit/host/notices.test.ts` cambió `toEqual`
   por `toMatchObject` para admitir `alarm-raised`. Restaura una aserción exacta
   (`toEqual` con los cinco textos, o `toHaveLength`/claves exactas) para no
   debilitar el contrato de REQ-004 R-016.

# Invariantes

- No tocar `src/game/`, percepción, alarma, IA, reglas, valores, docs,
  dependencias ni arte. No borrar/saltar/debilitar tests.
- Mantener el "!" del detector en el paso de `EnemySpotted`, el aviso de
  `AlarmRaised`, los radios solo con `F1` y el snapshot profundo ya logrados.
- Re-ejecutar `pnpm run verify` (180 s) y `pnpm run test:e2e` (180 s) con
  `E2E_ARTIFACTS_DIR=artifacts/TASK-0038/attempt-2` y viewport 1280×720; guardar
  `verify-output.txt`, `e2e-output.txt` y capturas de juego normal y F1 en
  `attempt-2`.

# Criterios de aceptación

Siguen en [TASK-0038](../../../docs/tasks/TASK-0038-host-feedback-percepcion-alarma.md#criterios-de-aceptación).
No copiar.

# Artefactos

`artifacts/TASK-0038/attempt-2/`: brief, report, salidas y capturas. Informe con
commit SHA y la corrección de ambos hallazgos.

# Riesgos

- La poda no debe ocultar el "!" durante la animación del paso de detección:
  poda solo cuando el estado final ya no esté en `alert`.
- No introducir timers ni mutar el estado del motor.
