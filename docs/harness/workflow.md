---
type: Workflow
title: Flujo de trabajo
description: Loop de requisitos, experimentos, tareas y verificación.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Objetivo

Que el usuario invierta su tiempo en creatividad y jugabilidad, mientras los
agentes se ocupan de la documentación, la implementación, los tests y la
verificación. El usuario ve builds y experimentos, no deberes técnicos.

# Loop del usuario

1. Conversa con `requirements-writer` sobre lo que quiere.
2. Prueba un experimento si hay una duda de diseño.
3. Decide con información visual e interactiva.
4. Recibe una build jugable o una demo.
5. Da feedback en lenguaje creativo.
6. Repite.

# Loop de agentes

```text
requirements-writer
  -> requisito aprobado
  -> experimento (si hay incertidumbre)
  -> decisión registrada
  -> tareas atómicas
  -> task-lead
  -> task-runner
  -> verificación del lead
  -> merge
  -> demo / playtest
```

# Fase 0: bootstrap

- Documentación OKF.
- Agentes y skills.
- Shell de experimentos.
- Validador y tablero de tareas.
- Sin código de juego.

# Fase de requisitos

`requirements-writer`:

- Mantiene una conversación, no un formulario.
- Separa requisitos creativos y técnicos.
- Propone opciones y señala contradicciones.
- No decide creatividad por el usuario.
- Puede proponer un experimento.
- Escribe la hoja solo cuando el usuario la aprueba.
- Genera tareas solo de requisitos aceptados.

# Fase de experimentos

Un experimento se usa cuando una decisión no se puede tomar bien en abstracto.
Ver [experimentos](experiments.md).

- Una pregunta por experimento.
- Shell compartido.
- Controles, variantes A/B, métricas y exportación.
- El usuario prueba y decide.
- La decisión se registra y actualiza el requisito.
- El experimento es desechable; solo se promociona lo validado.

# Fase de tareas

1. `requirements-writer` crea la tarea desde la plantilla.
2. `task-lead` comprueba que está lista.
3. `task-lead` reúne contexto y lanza `task-runner`.
4. `task-runner` implementa, testea y deja artefactos.
5. `task-lead` verifica de forma independiente.
6. Si falla, relanza al runner con una hipótesis nueva.
7. Si no se resuelve, escala.
8. Al cerrar, actualiza la tarea, el tablero y el log.

# Estados de tarea

| Estado | Significado |
|---|---|
| `backlog` | Creada, todavía no lista. |
| `ready` | Cumple Definition of Ready. |
| `in_progress` | En ejecución. |
| `blocked` | Necesita una decisión o depende de algo. |
| `review` | Runner terminó; el lead verifica. |
| `done` | Verificada y cerrada. |

# Gates

- **G1. Requisito aprobado**: el usuario acepta lo creativo.
- **G2. Tarea lista**: cumple Definition of Ready.
- **G3. Verificación independiente**: el lead re-ejecuta y revisa.
- **G4. Playtest**: el usuario prueba el hito.

# Timeouts

- Todo comando en primer plano lleva timeout explícito.
- Los servidores en background solo con puerto fijo, comprobación de salud y
  cierre posterior.
- No se espera indefinidamente a ningún proceso.
- La política completa está en [timeouts](timeouts.md).

# Git

- Un repositorio desde el primer día.
- Una rama por tarea: `task/TASK-XXXX`.
- `task-runner` trabaja en esa rama.
- `task-lead` fusiona solo tras verificar.
- Commits pequeños con el ID de tarea.
- El informe incluye el commit SHA.

Al principio se trabaja **secuencialmente**. No se usan worktrees ni tareas en
paralelo hasta que haya una necesidad real y las tareas sean disjuntas.

# Reintentos

- Un intento inicial y hasta dos relanzamientos.
- Cada relanzamiento debe incluir una hipótesis nueva.
- No se repite el mismo fallo sin información nueva.
- Tras el segundo fallo, se escala con evidencia.

# Comandos de apoyo

```bash
pnpm run tasks:next     # Siguiente tarea lista
pnpm run tasks:board    # Regenerar el tablero
pnpm run docs:check     # Validar OKF y grafo
pnpm run config:check   # Validar agentes y skills
pnpm run verify         # Tests + build
```

# Inicio de la próxima sesión

Abrir OpenCode en este repositorio. El agente por defecto es
`requirements-writer`. La primera conversación debe convertir la visión y el
alcance en el primer requisito aprobado, usando experimentos si hace falta.
