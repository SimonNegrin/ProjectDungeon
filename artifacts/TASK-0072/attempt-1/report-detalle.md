---
type: Task Report Detail
title: "TASK-0072: detalle del informe del intento 1"
description: Triaje de la fricción sobre el frontmatter de brief-detalle.md.
task: TASK-0072
attempt: 1
status: stable
generated: { by: task-lead, at: 2026-11-11T23:58:00Z }
---

# Fricción: `brief-detalle.md` sin frontmatter OKF

- **Síntoma:** el primer `pnpm run verify` falló en `docs:check` porque
  `artifacts/TASK-0072/attempt-1/brief-detalle.md` no tenía frontmatter OKF.
- **Evidencia:** `logs/brief-detalle-original-head.txt` muestra las primeras
  líneas originales; el runner añadió la cabecera y el segundo `verify` pasó.
- **Clasificación del lead:** brecha documental/arnés. La plantilla de tarea
  describe el anexo `brief-detalle.md` como enlace, pero no recuerda que
  `docs:check` valida todo documento de `artifacts/` y exige frontmatter.
- **Disposición:** `deferred`. El workaround local ya está aplicado en este
  intento (cabecera OKF sin cambiar el contenido).
- **Dueño propuesto:** `requirements-writer` eleva la propuesta con esta
  evidencia; el usuario decide si `harness-keeper` actualiza la plantilla o el
  validador. No bloquea ni desbloquea TASK-0072.
