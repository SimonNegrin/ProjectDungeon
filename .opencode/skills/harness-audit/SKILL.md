---
name: Harness Audit
description: Auditar el arnés y la documentación bajo demanda, con evidencia y sin reescribir historia.
---

# Cuándo usarla

Cuando el usuario pide revisar el arnés, el flujo o la documentación, o invoca
`/harness`. No se audita por iniciativa propia ni al cerrar un hito.

# Checklist

Solo lo que la petición necesite:

1. **Enlaces y grafo**: enlaces locales rotos, IDs duplicados, dependencias
   asimétricas y documentos huérfanos. `pnpm run docs:check`.
2. **Duplicación**: una regla debe vivir en un solo sitio; el resto enlaza. Señala
   las copias que ya divergen.
3. **Contexto**: tamaño de `AGENTS.md`, índices y documentos que se cargan por
   tarea. Mueve detalle a anclas o a un documento de consulta.
4. **Reglas que no escalan**: topes, gates, permisos y rituales pensados para un
   proyecto más pequeño. Distingue regla caducada de regla incumplida.
5. **Fricción acumulada**: propuestas de `task-runner` y del cierre sin dueño ni
   disposición.
6. **Agentes y skills**: prompts duplicados, skills que no se cargan, permisos
   más amplios de lo necesario.

Mide con datos: documentos, bytes, enlaces y entradas del log. No atribuyas
cifras de tokens que no puedas medir; usa tamaño y documentos cargados como proxy
y dilo.

# Cambios

- Aplica sin consultar correcciones factuales y de bajo riesgo (erratas, enlaces,
  contradicciones, aclaraciones que no cambian reglas) y registra una línea en
  `docs/log.md`.
- Pide confirmación explícita antes de cambiar reglas, permisos, gates, coste o
  comportamiento de los agentes. Incluye el diff propuesto y el motivo.
- Agrupa las propuestas no urgentes; no interrumpas por mejoras cosméticas.
- Si no hay hallazgos, dilo y no generes informe ni entrada de log.

# Principios

- Un flujo óptimo cierra tareas con menos vueltas, no con más reglas.
- Una regla sin dueño ni verificación es deuda: o se aplica, o se elimina.
- Toda propuesta lleva coste, riesgo y efecto esperado en una línea.
- No reescribas historia: `docs/log.md`, tareas cerradas y artefactos son
  evidencia inmutable.
