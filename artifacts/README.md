---
type: Artifact Guide
title: Artefactos de tarea
description: Convención de evidencias, informes y capturas por intento.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Estructura

```text
artifacts/
  TASK-0001/
    attempt-1/
      brief.md
      report.md
      test-output.txt
      screenshots/
      logs/
    attempt-2/
      ...
```

# Contenido mínimo

- `brief.md`: contexto y criterios que recibió el runner.
- `report.md`: informe OKF del intento.
- `test-output.txt`: salida de los comandos ejecutados.
- `screenshots/`: capturas de estados clave si hay UI o Canvas.
- `logs/`: logs relevantes, sin secretos.

# Reglas

- No guardar secretos, tokens ni datos personales.
- No guardar vídeos grandes en el repositorio; enlazar o ignorar.
- Las capturas son evidencia, no la única prueba.
- El informe debe incluir el commit SHA y el comando exacto de verificación.
- Un intento nuevo no sobrescribe el anterior.
- El `task-lead` revisa los artefactos antes de cerrar la tarea.
- Los artefactos grandes o efímeros pueden ir en `test-results/` y no commitearse.
