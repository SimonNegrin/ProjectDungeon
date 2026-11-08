---
type: Harness
title: Escalado
description: Cuándo parar, reintentar o pedir una decisión.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Objetivo

Evitar bucles infinitos, cambios de alcance silenciosos y decisiones creativas
tomadas por un agente.

# Cuándo parar

- La tarea no cumple Definition of Ready.
- Hay una decisión creativa abierta.
- El requisito es ambiguo o contradictorio.
- El cambio requiere tocar una arquitectura no prevista.
- Un test falla por una causa que no se entiende.
- La solución excede el alcance de la tarea.
- Se han agotado los reintentos.

# Reintentos

- Intento inicial + hasta 2 relanzamientos.
- Cada relanzamiento debe incluir una hipótesis nueva.
- No se repite el mismo comando esperando otro resultado.
- El lead debe adjuntar evidencia: test, log, captura, diff.

# Matriz

| Situación | Quién decide | Acción |
|---|---|---|
| Duda técnica rutinaria | `task-lead` | Decidir y registrar en el brief o ADR. |
| Duda técnica irreversible o cara | `requirements-writer` + usuario | Consultar antes de implementar. |
| Duda creativa | Usuario | Preguntar o crear experimento. |
| Requisito ambiguo | `requirements-writer` | Aclarar y versionar. |
| Tarea demasiado grande | `requirements-writer` | Dividir. |
| Test roto por causa desconocida | `task-lead` | Investigar; si no, escalar. |
| Dos fallos consecutivos | `task-lead` | Escalar con evidencia. |
| Conflicto de archivos | `task-lead` | Secuenciar o replanificar. |
| Fricción reutilizable de arnés | `requirements-writer` | Triar la propuesta; usuario decide si cambia reglas. |
| Corrección factual de documentación | `requirements-writer` | Aplicar y registrar en `docs/log.md`. |
| Propuesta que cambia el proceso | `requirements-writer` + usuario | Aprobar antes de aplicar. |

# Informe de bloqueo

```markdown
# Bloqueo

- Tarea:
- Intento:
- Qué se intentó:
- Qué falló:
- Evidencia:
- Hipótesis descartadas:
- Opciones:
- Decisión necesaria:
- Riesgo de cada opción:
```

# Qué no hacer

- Inventar una decisión creativa para desbloquearse.
- Cambiar los criterios de aceptación.
- Borrar o saltar tests.
- Fusionar código sin verificar.
- Abrir una tarea nueva para esquivar una dependencia.
- Pedir al usuario que revise código si la decisión se puede expresar como
  experiencia, opción o experimento.
- Usar una propuesta para desbloquear una tarea.
- Cambiar criterios o tests a través de una propuesta.
- Convertir cada fricción en una sección o documento nuevo.
- Escalar erratas al usuario.

# Comunicación al usuario

El mensaje debe ser corto y en lenguaje de producto:

- qué se quería conseguir;
- qué ha pasado;
- qué opciones hay;
- qué recomendación tiene el agente;
- qué decisión se necesita.

Nada de volcar stack traces sin contexto.
