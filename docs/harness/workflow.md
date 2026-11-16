---
type: Workflow
title: Flujo de trabajo
description: Requisitos, experimentos, tareas, dos agentes, verificación determinista, handoffs, gates y timeouts.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:33:37Z }
---

# Objetivo

Que el usuario invierta su tiempo en creatividad y jugabilidad, mientras los
agentes se ocupan de la documentación, la implementación, los tests y la
verificación. El usuario ve builds y experimentos, no deberes técnicos.

# Agentes

Los roles y permisos viven en `.opencode/agents/`; este documento no los
duplica. El `ask` ancho y la allowlist compartida de lectura están en
`opencode.jsonc`; cada agente añade solo sus deltas de escritura.

| Agente | Modo | Entrada | Salida |
|---|---|---|---|
| `game-lead` | Primario | Conversación, `/requirement` o `/harness` | Requisitos, experimentos, tareas, verificación y cierre |
| `task-runner` | Subagente | Tarea lanzada por el lead | Implementación, tests, artefactos, informe |

`game-lead` lanza `task-runner` (`subagent_depth: 1`) y verifica su resultado.
No hay un verificador separado: la verificación es un script más la firma de los
criterios ([ADR-031](../decisions/ADR-031-arnes-dos-agentes.md)). El usuario es
la autoridad creativa: ningún agente decide cómo se ve, se escucha, se juega o se
siente.

Reglas de sesión:

- `default_agent` solo se aplica a sesiones nuevas; OpenCode guarda el agente por
  sesión. Para orientar una sesión abierta, `/requirement` o `/harness`.
- Si la sesión no es `game-lead` y la petición cambia comportamiento de juego,
  producto o alcance, el agente para antes de editar `src/`, `tests/`,
  `index.html` o `public/`, comprueba si hay requisito y tarea aceptados, y pide
  el cambio de agente cuando falten.
- Si ya hay una tarea `ready`, el siguiente paso es `game-lead`; no se implementa
  directamente.
- Una sesión por requisito o milestone; una por tarea o intento.
- Fuera de la creación de tareas o de su ejecución, ningún agente edita archivos
  por iniciativa propia: propone el cambio y pide confirmación. Si el árbol tiene
  cambios ajenos, pregunta antes de tocar nada.

# Skills

Se cargan cuando la tarea las necesita:

| Skill | Cuándo |
|---|---|
| `requirements-interview` | Definir o cambiar una feature o experiencia. |
| `visual-qa` | Verificar UI, Canvas, cámara, HUD o experimentos. |
| `harness-audit` | Revisar enlaces, duplicación, contexto, reglas o permisos. |

La arquitectura, el render y las convenciones de diseño viven en
[design](../design/index.md), no en skills. No se cargan todas a la vez.

# Loop del usuario

1. Conversa con `game-lead` sobre lo que quiere.
2. Prueba un experimento si hay una duda de diseño.
3. Decide con información visual e interactiva.
4. Recibe una build jugable o una demo.
5. Da feedback en lenguaje creativo.
6. Repite.

# Loop de agentes

```text
game-lead
  -> requisito aprobado
  -> experimento (si hay incertidumbre)
  -> decisión registrada
  -> tareas atómicas
  -> task-runner
  -> verify:task + criterios firmados
  -> merge
  -> demo / playtest
```

# Fase de requisitos

`game-lead` mantiene una conversación, no un formulario; separa lo creativo de lo
técnico, propone opciones, señala contradicciones y no decide creatividad. Escribe
la hoja solo cuando el usuario la aprueba y genera tareas solo de requisitos
aceptados.

# Fase de experimentos

Un experimento se usa cuando una decisión no se puede tomar bien en abstracto.
Una pregunta por experimento, shell compartido y decisión registrada. Ver
[experimentos](experiments.md).

# Fase de tareas

1. `game-lead` crea la tarea desde la plantilla y comprueba Definition of Ready.
2. Marca `in_progress`, crea `task/TASK-NNNN` y lanza `task-runner` con la ficha.
3. `task-runner` implementa, testea y deja artefactos e informe.
4. `game-lead` revisa el diff, firma los criterios que puede sostener y ejecuta
   `pnpm run verify:task TASK-NNNN`.
5. Si falla, relanza con una hipótesis nueva o corrige el alcance.
6. Si pasa, fusiona y cierra: ficha, tablero, log y push.

## Quién ejecuta una tarea `docs`

`task-runner` no edita `docs/`, así que una tarea `docs` no pasa por él. Todas las
tareas documentales las ejecuta `game-lead`:

| Destino | Ejecutor |
|---|---|
| `docs/**`, `AGENTS.md`, `docs/harness/**`, `docs/templates/**` | `game-lead` |
| `src/**`, `tests/**`, `index.html`, `public/**`, código de `experiments/**` | `task-runner` |

El arnés se pide con `/harness`, fuera del flujo de tareas: no se crea una ficha
`docs` para auditarlo.

# Traspaso a una sesión de ejecución

La ficha es el traspaso. Si la sesión de producto ha acumulado contexto, abre una
nueva y escribe solo `Ejecuta TASK-NNNN`; `game-lead` lee la ficha y lanza el
runner en contexto limpio. No se copian criterios ni requisitos: se enlazan.

Antes de cambiar de sesión, el estado debe estar en la ficha, el tablero y el log.

# Handoffs y sesiones

| Handoff | Cuándo | Tope |
|---|---|---|
| Ficha | Siempre; es el contrato del intento | 600 palabras objetivo, 800 error |
| `brief.md` | Solo en reintento o para acotar un intento | 4 KB |
| `report.md` | Siempre, escrito por el runner | 2 KB objetivo, 4 KB error |

- El brief es un delta: qué falló, hipótesis nueva y alcance. Lo que no cabe va a
  `brief-detalle.md` o `report-detalle.md`, enlazado.
- No se copian criterios, requisitos ni la ficha: se enlazan con ancla.
- El estado vive en la tarea y los artefactos, no en el historial del chat.
- Una sesión por intento.

# Estados de tarea

| Estado | Significado |
|---|---|
| `backlog` | Creada, todavía no lista. |
| `ready` | Cumple Definition of Ready. |
| `in_progress` | En ejecución o en verificación. |
| `blocked` | Necesita una decisión o depende de algo. |
| `done` | Verificada y cerrada. |

# Verificación determinista

`pnpm run verify:task TASK-NNNN` comprueba:

- estado `in_progress` e informe del intento con `report_status: success`;
- que todos los criterios de la ficha están marcados `[x]`;
- que el diff `main...HEAD` cae dentro del alcance del `task_type`; `--base REF`
  mueve la base para medir solo la tarea cuando el arnés vive en una rama sin
  fusionar (piloto de [ADR-031](../decisions/ADR-031-arnes-dos-agentes.md));
- capturas cuando la tarea es `qa` o visual;
- `pnpm run verify` completo.

Lo que el script no puede juzgar —si un criterio se cumple de verdad, si la
evidencia es clara, si hay una regresión de sensación— lo firma `game-lead` al
marcar el criterio y lo resume en `attempt-N/lead-verify/verification.md`. El
usuario valida lo creativo en el playtest.

# Gates

- **G1. Requisito aprobado**: el usuario acepta lo creativo.
- **G2. Tarea lista**: cumple Definition of Ready.
- **G3. Verificación**: `verify:task` pasa y los criterios están firmados.
- **G4. Playtest**: el usuario prueba el hito.

# Reintentos y escalado

Un intento inicial y hasta dos relanzamientos. Cada relanzamiento exige una
hipótesis nueva y evidencia; no se repite el mismo fallo. Un fallo mecánico del
script no necesita ceremonia: se devuelve el fallo concreto. Tras el segundo
fallo se escala.

| Situación | Quién decide | Acción |
|---|---|---|
| Duda técnica rutinaria | `game-lead` | Decidir y registrar. |
| Duda técnica irreversible o cara | `game-lead` + usuario | Consultar antes. |
| Duda creativa | Usuario | Preguntar o experimentar. |
| Requisito ambiguo o tarea grande | `game-lead` | Aclarar, versionar o dividir. |
| Test roto sin causa clara | `game-lead` | Investigar; si no, escalar. |
| Fricción de arnés | `game-lead` | Triar; aplicar lo de bajo riesgo y proponer el resto. El usuario decide si cambia reglas. |

Un bloqueo se devuelve con: tarea, intento, qué se intentó, qué falló, evidencia,
hipótesis descartadas, opciones, decisión necesaria y riesgo de cada opción.

# Timeouts y procesos

El shell de OpenCode corta a los 120 s por defecto, pero un hijo en background
puede sobrevivir. Por eso:

- **todo comando en primer plano lleva el parámetro `timeout`**;
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
| `pnpm run verify`, `pnpm run verify:task` | 300 s |
| `pnpm run test:e2e` | 180 s |
| `pnpm install` | 300 s |
| Playwright install | 600 s |

Si un comando agota el timeout: parar el proceso, guardar evidencia, reportar
comando y timeout, y no repetirlo sin una hipótesis nueva.

Playwright arranca y cierra Vite con su `webServer`; es la forma preferida de
levantar el servidor para E2E. Para flags, `pnpm run test:e2e --repeat-each=3`;
el `--` literal no funciona.

# Shell y autorización

La allowlist vive en `opencode.jsonc`; aquí solo se explica cómo componer
comandos para no pedir permiso a cada paso.

- Cada subcomando de un compuesto (`&&`, `;`, `|`) se autoriza por separado:
  `echo '---' && pnpm run verify` pasa si cada parte está permitida.
- Los separadores de salida los pone el texto de la respuesta, no `echo` dentro
  del comando. Solo hay literales `echo ---` y `echo ===E2E===`; `echo *` no se
  permite porque con redirección es una escritura.
- Para inspeccionar JSON, `cat` o `jq .scripts package.json`; `node -e` no se
  permite porque equivale a ejecución arbitraria.
- `find` queda fuera a propósito: `-exec` y `-delete` caben en cualquier forma
  del comando. Sustitutos: `rg --files -g '*patrón*' [ruta]` y `git ls-files`.
- E2E: `pnpm run test:e2e` y `pnpm exec playwright test` están permitidos con
  argumentos; `pnpm exec *` sigue pidiendo permiso.
- Un `ask` no caduca: la sesión espera hasta que alguien responde. No dejes una
  sesión sola con un permiso pendiente y, al retomarla, deniega y reformula.
- Las redirecciones (`2>/dev/null`) y los scripts multilínea no se descomponen
  por subcomando: sepáralos en llamadas distintas.

# Git

- Un repositorio desde el primer día; `origin` apunta a GitHub.
- Una rama por tarea: `task/TASK-XXXX`. `task-runner` trabaja en ella y
  `game-lead` fusiona solo tras verificar.
- Commits pequeños con el ID de tarea; el informe incluye el commit SHA.
- Se trabaja secuencialmente: sin worktrees ni tareas en paralelo hasta que haya
  necesidad real y las tareas sean disjuntas.
- `origin/main` se publica al cerrar cada tarea verificada.
- Las ramas `task/*` no se publican por defecto; se borran tras el merge.
- Sin force-push a `main`.
- El arnés se cambia en una rama `harness/*` y no se fusiona hasta que el piloto
  de [ADR-031](../decisions/ADR-031-arnes-dos-agentes.md) pase sus umbrales.

# Fricción y propuestas

El runner observa, `game-lead` tria y escribe el producto y el arnés, y el usuario
decide las reglas.

- `task-runner` reporta fricción reutilizable con evidencia y disposición
  `pending`; no edita `docs/` ni la usa para desbloquear.
- `game-lead` clasifica (local, documental, arnés o creativa), aplica lo que está
  en su alcance y eleva lo que cambie reglas, permisos, gates, coste o
  comportamiento de agentes.
- Las propuestas no urgentes se revisan en lote con `/harness`. Ninguna queda
  abierta sin disposición ni dueño.

# Comandos de apoyo

```bash
pnpm run tasks:next     # Siguiente tarea lista
pnpm run tasks:board    # Regenerar el tablero
pnpm run docs:check     # Validar OKF, enlaces y topes
pnpm run config:check   # Validar agentes y skills
pnpm run verify:task TASK-NNNN  # Verificación determinista de una tarea
pnpm exec vitest run <archivo>  # Un test unitario concreto
pnpm run verify         # Tests + build
```

`pnpm test -- <archivo>` no filtra: pnpm reenvía el separador y Vitest ejecuta
todos los archivos. Para un subconjunto, usa `pnpm exec vitest run <archivo>`.

`pnpm run test:e2e -- <spec>` tampoco filtra: pnpm reenvía el `--` literal y
Playwright ejecuta la suite completa. Para un subconjunto, usa
`pnpm run test:e2e <spec>` o `pnpm exec playwright test <spec>`.
