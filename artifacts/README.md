---
type: Artifact Guide
title: Artefactos de tarea
description: Convención de evidencias, informes y capturas por intento.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:50:11Z }
---

# Estructura

```text
artifacts/
  TASK-0001/
    attempt-1/
      brief.md
      brief-detalle.md
      report.md
      report-detalle.md
      test-output.txt
      verify-output.txt
      screenshots/
      logs/
    attempt-2/
      ...
```

# Contenido mínimo

- `brief.md`: contexto y criterios que recibió el runner.
- `brief-detalle.md`: desbordamiento del brief, solo si existe. Enlazado desde el
  brief y no se lee por defecto.
- `report.md`: informe OKF del intento.
- `report-detalle.md`: desbordamiento del informe, solo si existe. Enlazado desde
  el informe y no se lee por defecto.
- `test-output.txt`: salida de los comandos ejecutados.
- `verify-output.txt`: salida de `pnpm run verify`.
- `screenshots/`: capturas de estados clave si hay UI o Canvas.
- `logs/`: logs relevantes, sin secretos.

# Presupuesto de los handoffs

- `brief.md` ~2 KB (3–4 KB en tareas grandes) y `report.md` ~2 KB.
- Límite blando: no se trunca. Al 100 % se avisa; al 150 % se justifica.
- Lo que no cabe va a `brief-detalle.md` o `report-detalle.md`, enlazado; nada se
  borra.
- El informe incluye el bloque de métricas `brief_bytes`, `report_bytes`,
  `overflow`, `criteria_failed` y `cause`.

# Reglas

- No guardar secretos, tokens ni datos personales.
- No guardar vídeos grandes en el repositorio; enlazar o ignorar.
- Las salidas completas van a archivos, no se pegan en el informe.
- Las capturas son evidencia, no la única prueba.
- El informe debe incluir el commit SHA y el comando exacto de verificación.
- Un intento nuevo no sobrescribe el anterior.
- El `task-lead` revisa los artefactos antes de cerrar la tarea.
- Los artefactos grandes o efímeros pueden ir en `test-results/` y no commitearse.
