---
type: Workflow
title: Flujo de trabajo
description: Requisitos, experimentos, tareas, agentes, handoffs, gates y timeouts.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T11:20:14Z }
---

# Objetivo

Que el usuario invierta su tiempo en creatividad y jugabilidad, mientras los
agentes se ocupan de la documentación, la implementación, los tests y la
verificación. El usuario ve builds y experimentos, no deberes técnicos.

# Agentes

Los roles y permisos viven en `.opencode/agents/`; este documento no los
duplica.

| Agente | Modo | Entrada | Salida |
|---|---|---|---|
| `requirements-writer` | Primario | Conversación con el usuario | Requisitos, experimentos, tareas |
| `harness-keeper` | Primario | Consulta o auditoría del usuario | Correcciones de arnés, documentación y flujo |
| `task-lead` | Subagente | Tarea lista | Brief, verificación, tarea cerrada |
| `task-runner` | Subagente | Brief del lead | Implementación, tests, artefactos, informe |

`requirements-writer` lanza `task-lead`; `task-lead` lanza `task-runner`
(`subagent_depth: 2`). `harness-keeper` se invoca manualmente cuando el usuario
quiere una consulta o una auditoría; no hay auditoría periódica ni al cerrar
hito. El usuario es la autoridad creativa: ningún agente decide cómo se ve, se
escucha, se juega o se siente.

Reglas de sesión:

- `default_agent` solo se aplica a sesiones nuevas; OpenCode guarda el agente por
  sesión. Para cambiar una sesión abierta, ejecuta `/requirement`.
- Si la sesión no es `requirements-writer` y la petición cambia comportamiento de
  juego, producto o alcance, el agente para antes de editar `src/`, `tests/`,
  `index.html` o `public/`, comprueba si hay requisito y tarea aceptados, y pide
  el cambio de agente o `/requirement` cuando falten.
- Si ya hay una tarea `ready`, el siguiente paso es `task-lead`; no se implementa
  directamente.
- Para consultas o cambios de arnés, documentación o flujo, usa
  `harness-keeper`; no los aplica `requirements-writer`.
- Una sesión por requisito o milestone; una por tarea o intento.
- Fuera de la creación de tareas o de su ejecución, ningún agente edita archivos
  por iniciativa propia: propone el cambio y pide confirmación. Si el árbol tiene
  cambios ajenos, pregunta antes de tocar nada.

# Skills

Solo hay tres procedimientos y se cargan cuando la tarea los necesita:

| Skill | Cuándo |
|---|---|
| `requirements-interview` | Definir o cambiar una feature o experiencia. |
| `task-verification` | Verificar el trabajo del runner antes de cerrar. |
| `visual-qa` | Verificar UI, Canvas, cámara, HUD o experimentos. |

La arquitectura, el render y las convenciones de diseño viven en
[design](../design/index.md), no en skills. No se cargan todas a la vez.

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

# Fase de requisitos

`requirements-writer` mantiene una conversación, no un formulario; separa lo
creativo de lo técnico, propone opciones, señala contradicciones y no decide
creatividad. Escribe la hoja solo cuando el usuario la aprueba y genera tareas
solo de requisitos aceptados.

# Fase de experimentos

Un experimento se usa cuando una decisión no se puede tomar bien en abstracto.
Una pregunta por experimento, shell compartido y decisión registrada. Ver
[experimentos](experiments.md).

# Fase de tareas

1. `requirements-writer` crea la tarea desde la plantilla.
2. `task-lead` comprueba Definition of Ready.
3. `task-lead` reúne contexto, escribe el brief y lanza `task-runner`.
4. `task-runner` implementa, testea y deja artefactos.
5. `task-lead` verifica de forma independiente.
6. Si falla, relanza con una hipótesis nueva.
7. Si no se resuelve, escala.
8. Al cerrar, actualiza la tarea, el tablero y el log.

# Traspaso a una sesión de ejecución

La conversación de requisitos y la ejecución pueden vivir en sesiones distintas.
Es útil cuando la sesión de requisitos ha acumulado contexto o cuando se van a
encadenar varias tareas: la conversación queda cerrada y la ejecución no
arrastra el ida y vuelta de producto.

`task-lead` y `task-runner` ya arrancan con contexto limpio en sesiones hijas.
Cambiar de sesión limpia el contexto del orquestador, no el del ejecutor.

Antes de cambiar:

- El requisito está aceptado y las tareas están creadas con criterios, plan de
  test, dependencias, artefactos y estado.
- La tarea que se va a ejecutar está `ready` y sus dependencias están `done`.
- El estado está en la ficha, el tablero y el log; no queda una decisión
  pendiente solo en el historial del chat.

El traspaso es la ficha de tarea, no un prompt: no se copian criterios ni
requisitos, se enlazan.

1. Abre una sesión nueva; el agente por defecto sigue siendo
   `requirements-writer`.
2. Escribe solo la tarea: `Ejecuta TASK-0049` o `lanza task-lead para
   TASK-0049`.
3. La sesión nueva lee la ficha y el requisito enlazado y lanza `task-lead`.
4. Una tarea por lanzamiento; al cerrar y fusionar, se lanza la siguiente. No se
   ejecutan tareas en paralelo.
5. Si la tarea tiene resultado creativo, el playtest va antes de cerrarla.

Si una decisión necesaria no está en la ficha, el traspaso está incompleto: se
corrige antes de ejecutar, no se reconstruye desde una conversación anterior.

# Handoffs y sesiones

El brief y el informe son **deltas del intento**, no copias de la tarea. El
esquema completo está en el anexo de la
[plantilla de tarea](../templates/task.md).

| Handoff | Objetivo | Tope duro |
|---|---:|---:|
| `brief.md` | 1,5 KB | 4 KB |
| `report.md` | 2 KB | 4 KB |

- `docs:check` falla si un brief o informe de `TASK-0021` en adelante supera
  4 KB. Avisa a partir de 2,5 KB.
- Lo que no cabe va a `brief-detalle.md` o `report-detalle.md`, enlazado. Nada se
  borra y el detalle no se lee por defecto.
- No se copian criterios, requisitos ni la tarea: se enlazan con ancla.
- El estado vive en la tarea y los artefactos, no en el historial del chat.
- Antes de compactar o cambiar de sesión, escribe el handoff con el estado actual.
- Una sesión por intento.

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

# Reintentos y escalado

Un intento inicial y hasta dos relanzamientos. Cada relanzamiento exige una
hipótesis nueva y evidencia; no se repite el mismo fallo. Tras el segundo fallo
se escala.

| Situación | Quién decide | Acción |
|---|---|---|
| Duda técnica rutinaria | `task-lead` | Decidir y registrar. |
| Duda técnica irreversible o cara | `requirements-writer` + usuario | Consultar antes. |
| Duda creativa | Usuario | Preguntar o experimentar. |
| Requisito ambiguo o tarea grande | `requirements-writer` | Aclarar, versionar o dividir. |
| Test roto sin causa clara | `task-lead` | Investigar; si no, escalar. |
| Fricción de arnés | `harness-keeper` | Triar; corregir lo de bajo riesgo y proponer el resto. El usuario decide si cambia reglas. |

Un bloqueo se devuelve con: tarea, intento, qué se intentó, qué falló, evidencia,
hipótesis descartadas, opciones, decisión necesaria y riesgo de cada opción.

# Timeouts y procesos

El shell de OpenCode corta a los 120 s por defecto, pero un hijo en background
puede sobrevivir. Por eso:

- **todo comando en primer plano lleva `timeout` explícito**;
- un background solo se usa para servidores o watchers, con puerto fijo,
  comprobación de salud y cierre posterior;
- no se espera indefinidamente a ningún proceso.

El timeout explícito es el parámetro de la herramienta de shell: macOS no
incluye el binario `timeout`. Si se envuelve el comando, `gtimeout` de coreutils
es la alternativa; nunca se confía en el corte por defecto.

| Comando | Timeout |
|---|---:|
| `git status`, `git diff`, `git log`, inspección | 15 s |
| `pnpm run docs:check`, `pnpm run config:check` | 60 s |
| `pnpm test`, `pnpm run build` | 120 s |
| `pnpm run test:e2e` | 180 s |
| `pnpm install` | 300 s |
| Playwright install | 600 s |

Si un comando agota el timeout: parar el proceso, guardar evidencia, reportar
comando y timeout, y no repetirlo sin una hipótesis nueva.

Playwright arranca y cierra Vite con su `webServer`; es la forma preferida de
levantar el servidor para E2E. Para flags, `pnpm run test:e2e --repeat-each=3`;
el `--` literal no funciona.

# Git

- Un repositorio desde el primer día; `origin` apunta a GitHub.
- Una rama por tarea: `task/TASK-XXXX`. `task-runner` trabaja en ella y
  `task-lead` fusiona solo tras verificar.
- Commits pequeños con el ID de tarea; el informe incluye el commit SHA.
- Se trabaja secuencialmente: sin worktrees ni tareas en paralelo hasta que haya
  necesidad real y las tareas sean disjuntas.
- `origin/main` se publica al cerrar cada tarea verificada: un push al final del
  cierre, cuando el merge, la tarea, el tablero y el log ya están en `main`.
- Las ramas `task/*` no se publican por defecto; son locales y se borran tras el
  merge. Se publican solo si la tarea debe sobrevivir a un cambio de máquina o
  de sesión de más de un día, y entonces siguen siendo desechables.
- Cerrar un requisito o milestone no añade push: basta comprobar
  `git status -sb` sin `ahead`. Un tag anotado (`req-0XX`, `milestone-N`) es
  opcional y se publica con `git push --tags` solo si se quiere marcar el punto.
- Si el push falla, no bloquea el cierre: se anota en la tarea y se reintenta en
  el cierre siguiente; `main` no acumula más de una tarea sin publicar.
- Sin force-push a `main`. Las ramas fusionadas se borran con
  `git branch --merged main`.

# Fricción y propuestas

El runner observa, el lead tria, `requirements-writer` escribe el producto,
`harness-keeper` escribe el arnés y el usuario decide las reglas.

- `task-runner` reporta fricción reutilizable con evidencia y disposición
  `pending`; no edita `docs/` ni la usa para desbloquear.
- `task-lead` clasifica (local, documental, arnés o creativa), aplica lo que está
  en su alcance —incluidos `docs/design/**` y `docs/glossary.md` para reflejar
  requisitos aprobados ([ADR-016](../decisions/ADR-016-permisos-docs-diseno-glosario.md))—
  y eleva el resto con evidencia.
- `requirements-writer` aplica correcciones factuales y cambios de bajo riesgo de
  producto con log; consulta al usuario si cambia reglas o alcance.
- `harness-keeper` aplica correcciones factuales y cambios de bajo riesgo de
  arnés y documentación con log; consulta al usuario si cambia reglas, permisos,
  gates, coste o comportamiento de agentes
  ([ADR-018](../decisions/ADR-018-harness-keeper.md)).
- Las propuestas no urgentes se revisan en lote cuando el usuario invoca a
  `harness-keeper`. Ninguna queda abierta sin disposición ni dueño.

# Comandos de apoyo

```bash
pnpm run tasks:next     # Siguiente tarea lista
pnpm run tasks:board    # Regenerar el tablero
pnpm run docs:check     # Validar OKF, enlaces y topes
pnpm run config:check   # Validar agentes y skills
pnpm exec vitest run <archivo>  # Un test unitario concreto
pnpm run verify         # Tests + build
```

`pnpm test -- <archivo>` no filtra: pnpm reenvía el separador y Vitest ejecuta
todos los archivos. Para un subconjunto, usa `pnpm exec vitest run <archivo>`.
