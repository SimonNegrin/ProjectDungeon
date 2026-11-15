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
      <spec>/screenshots/
      screenshots/
      logs/
    attempt-2/
      ...
```

`<spec>/screenshots/` es la ruta de E2E con `E2E_ARTIFACTS_DIR`; el helper
`artifactPath` añade el nombre del spec y no se duplica la captura en la raíz.
`screenshots/` en la raíz del intento solo se usa para capturas manuales, con la
ruta y el motivo en el informe.

# Contenido mínimo

- `brief.md`: contexto y criterios que recibió el runner.
- `brief-detalle.md`: desbordamiento del brief, solo si existe. Enlazado desde el
  brief y no se lee por defecto.
- `report.md`: informe OKF del intento.
- `report-detalle.md`: desbordamiento del informe, solo si existe. Enlazado desde
  el informe y no se lee por defecto.
- `test-output.txt`: salida de los comandos ejecutados.
- `verify-output.txt`: salida de `pnpm run verify`.
- `screenshots/`: capturas manuales de estados clave si hay UI o Canvas. Las de
  E2E van en `<spec>/screenshots/`.
- `logs/`: logs relevantes, sin secretos.

# Frontmatter

Los informes, anexos y propuestas son documentos OKF. El mínimo recomendado es
`type`, `title`, `description`, `status` y `generated`; si pertenecen a un
intento, añaden `task` y `attempt`. Tipos de anexo: `Task Brief Detail`,
`Task Report Detail` y `Docs Proposal`. `docs:check` los valida como cualquier
otro `.md` y no los mide por tamaño.

# Presupuesto de los handoffs

Los objetivos, avisos y el tope duro por tipo están en
[documentación](../docs/harness/documentacion.md#topes): brief 1,5 KB / 2,5 KB /
4 KB e informe 2 KB / 3 KB / 4 KB. No se trunca: lo que no cabe va a
`brief-detalle.md` o `report-detalle.md`, enlazado; nada se borra.

El informe incluye el bloque de métricas `brief_bytes`, `report_bytes`,
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
