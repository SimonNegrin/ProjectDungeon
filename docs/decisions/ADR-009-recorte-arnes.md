---
type: ADR
title: "ADR-009: recorte del arnés y sus topes"
description: Menos documentos de proceso, tres skills, handoffs como deltas y topes validados; con estrategia de revert por capas.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-08T11:46:23Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:23Z }
---

# Contexto

En dos días el proyecto pasó de bootstrap a 20 tareas cerradas, 360 tests
unitarios y 40 E2E. El arnés funcionó, pero su documentación creció más rápido
que el juego:

- ~35.300 de las ~55.600 palabras de `docs/` eran proceso (tareas, arnés,
  plantillas y log), no producto ni diseño;
- los briefs promediaban 9,5 KB y los informes 8,1 KB, frente a un presupuesto
  blando de ~2 KB que se incumplía en 19 de 19 casos;
- había 9 skills y solo `visual-qa` aparecía en la evidencia de las tareas;
- tarea, brief, informe y log repetían el mismo hecho cuatro veces.

La causa no era el flujo ni los roles, sino la capa que los describe. El usuario
aprobó recortar esa capa sin tocar los agentes ni los gates.

# Decisión

**Se recorta la documentación del arnés y la ceremonia de handoff; no se tocan
los roles ni las garantías.**

## Documentos del arnés: 9 → 5 (4 documentos + índice)

Se conservan `index`, `workflow`, `experiments`, `visual-qa` y `documentacion`.
`workflow` absorbe timeouts y escalado; `documentacion` absorbe el perfil OKF.
Se eliminan `agents.md` y `skills.md`: los roles viven en `.opencode/agents/` y
las skills en sus propios archivos.

## Skills: 9 → 3

Se quedan `requirements-interview`, `task-verification` y `visual-qa`.
`experiment-design` se pliega en [experimentos](../harness/experiments.md),
`okf-authoring` en [documentación](../harness/documentacion.md),
`task-decomposition` en la [plantilla de tarea](../templates/task.md),
`playtest-facilitation` en el flujo y `canvas-rendering`/`game-architecture` en
[design](../design/index.md). Si el piloto demuestra que falta una, se recupera
desde git.

## Plantillas: 7 → 5

El brief y el informe dejan de ser plantillas independientes: su esquema pasa a
los anexos de la tarea. Criterios y requisitos siguen viviendo solo en la tarea y
se enlazan.

## Handoffs y topes

| Documento | Objetivo | Aviso | Error |
|---|---:|---:|---:|
| Tarea | 600 palabras | 600 | 800 |
| Brief | 1,5 KB | 2,5 KB | 4 KB |
| Informe | 2 KB | 3 KB | 4 KB |
| Entrada de log | 1 línea | — | 400 caracteres |

- `docs:check` aplica los topes a `TASK-0021` en adelante. Las 20 tareas y sus
  artefactos anteriores son históricos y no se reescriben.
- El desbordamiento va a `brief-detalle.md` o `report-detalle.md`; nada se borra.
- El log pasa a `* YYYY-MM-DD — Tipo — ID — resultado — enlace`.

## Lo que no cambia

Los tres agentes y sus permisos, `subagent_depth: 2`, los gates G1–G4, la
verificación independiente, los experimentos, la autoridad creativa, el
frontmatter OKF, los tests y los artefactos históricos.

# Resultado medido

| Métrica | Antes | Después |
|---|---:|---:|
| Documentos de arnés | 9 archivos / 5.179 palabras | 5 archivos / 2.823 palabras |
| Skills | 9 / 2.573 palabras | 3 / 957 palabras |
| Plantillas | 7 / 1.702 palabras | 5 / 1.377 palabras |
| Tareas históricas | 20, sin tocar | 20, sin tocar |

La reducción inmediata es de ~3.500 palabras en el material operativo. La bajada
del tamaño de tareas y handoffs se mide en el piloto de las dos próximas tareas,
porque las 20 anteriores no se reescriben.

# Consecuencias

- Menos texto que mantener y menos fuentes de verdad para el mismo hecho.
- El coste de contexto por tarea baja; el riesgo de deriva documental también.
- Los topes convierten una regla blanda en una comprobación, pero pueden producir
  fricción si el brief legítimamente necesita más detalle: para eso está el
  archivo de detalle.
- El piloto son las dos próximas tareas. Si pierden criterios, aumentan los
  fallos de verificación o generan más correcciones documentales, se revierte.

# Revert

Línea base: etiqueta `harness-pre-recorte` sobre `main` en `574f6a6`, antes de la
rama `harness/recorte`.

La rama se organiza en commits por capa para poder revertir una sin las otras:

1. `docs(harness): consolidar documentos y enlaces` — Fase A.
2. `docs(harness): plegar skills y plantillas` — Fase A.
3. `rules(handoff): topes y formato de log` — Fase B.
4. `chore(validate): topes en docs:check` — Fase B.
5. `docs(agents): ajustar charters` — Fase B.

Procedimientos, del más amplio al más quirúrgico:

```bash
# Antes de fusionar: descartar la rama completa
git checkout main
git branch -D harness/recorte

# Tras fusionar: revertir todo el recorte
git revert -m 1 <merge-sha>

# Revertir solo las reglas nuevas, conservando la consolidación
git revert <sha-rules> <sha-validate> <sha-agents>

# Revertir solo un tope concreto
git revert <sha-validate>

# Recuperar un archivo suelto
git checkout harness-pre-recorte -- docs/harness/experiments.md
```

Después de cualquier revert, ejecutar `pnpm run verify` y comprobar que
`docs:check` vuelve a verde. No se reescribe el log ni los artefactos históricos:
un revert de documentación no debe destruir evidencia.

# Alternativas descartadas

- **Eliminar un agente**: ahorra menos que el papeleo y rompe la verificación
  independiente.
- **Mantener el presupuesto blando**: ya se incumplía en el 100 % de los briefs.
- **Reescribir las tareas históricas**: destruye evidencia y no reduce el coste
  futuro.
- **Validar el tamaño del log por fecha**: frágil; se valida por el formato de
  línea nueva.

# Enlaces

- [Flujo de trabajo](../harness/workflow.md)
- [Documentación y validación](../harness/documentacion.md)
- [Plantilla de tarea](../templates/task.md)
