---
type: ADR
title: "ADR-031: arnés de dos agentes y verificación determinista"
description: Un primario que absorbe producto, tareas y arnés, un ejecutor en contexto limpio y un script de verificación con criterios firmados; piloto de cinco tareas y revert por commit.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-16T00:33:37Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:33:37Z }
---

# Contexto

El arnés cerró 154 de 160 tareas en ocho días con cuatro agentes:
`requirements-writer` y `harness-keeper` primarios, `task-lead` y `task-runner`
subagentes. ADR-009 recortó la capa documental y ADR-016 y ADR-018 añadieron
propiedad por ruta para repartir `docs/`.

Los datos de la línea base:

| Métrica | Valor |
|---|---:|
| Tareas cerradas | 154 / 160 |
| Tareas con relanzamiento (`attempts` > 1) | 26 / 160 (16 %) |
| Relanzamientos en las últimas 20 cerradas | 5 / 20 (25 %) |
| Briefs / informes | 174 / 180 |
| Prompts de agentes | 3.144 palabras en 4 ficheros |
| `artifacts/` | 251 MB; mediana ≈ 150 KB por tarea |

El coste no estaba en ejecutar tareas: estaba en coordinar roles que son el mismo
modelo. La propiedad por ruta produjo la contradicción de ADR-016 y el workaround
de TASK-0097, donde el runner escribió documentación con `python3` porque su
allowlist no la cubría. La verificación del lead era en parte mecánica —re-ejecutar
y leer el diff— y en parte juicio con los mismos puntos ciegos que el runner. El
flujo es secuencial, así que los subagentes no compraban paralelismo.

# Decisión

**Dos agentes y una verificación que se pueda ejecutar.**

1. `game-lead` (primario) absorbe `requirements-writer`, `harness-keeper` y el
   cierre de `task-lead`: producto, requisitos, tareas, experimentos, arnés,
   verificación, merge y cierre.
2. `task-runner` (subagente) se mantiene: implementa, testea y deja evidencia en
   contexto limpio. Es el único que escribe código.
3. `subagent_depth: 1`. `game-lead` lanza `task-runner`; no hay brief de
   orquestación intermedio. La ficha es el contrato.
4. Un dueño por dominio: `docs/**` es de `game-lead`; `src/`, `tests/`,
   `index.html`, `public/` y el código de experimentos, de `task-runner`.
5. Verificación determinista: `pnpm run verify:task TASK-NNNN` comprueba estado,
   informe, `pnpm run verify`, alcance del diff, capturas y criterios firmados.
   El juicio restante queda escrito en `attempt-N/lead-verify/verification.md`.
6. El brief pasa a ser opcional: solo se escribe en reintentos o cuando la ficha
   necesita acotar el intento.
7. Estados: `ready → in_progress → done | blocked`. `review` se pliega en
   `in_progress` porque verifica quien cierra.
8. El arnés se audita con la skill `harness-audit` (`/harness`). Los cambios en
   reglas, permisos, gates o coste siguen exigiendo confirmación explícita del
   usuario; el rol no desaparece, la identidad de agente sí.

# Piloto

Cinco tareas reales del backlog, secuenciales: motor, host/UI, tests/QA, `docs` y
una que ya falló (TASK-0101 o TASK-0057). Umbrales fijados antes de empezar:

| Métrica | Umbral |
|---|---|
| Defectos nuevos detectados en playtest | 0 |
| Relanzamientos | ≤ 1 de 5 (20 %) |
| Criterios sin poder marcar como cumplidos | < 30 % |
| Commits por tarea (proxy de ceremonia) | ≤ mediana de las últimas 20 (≈ 10) |
| Fricción de arnés a mitad de tarea | ≤ 1 |

Si se cumplen, la estructura pasa a `main`. Si no, se revierte el commit de
cambio y se recupera `task-lead` desde la etiqueta. El código de las cinco tareas
no se revierte: es trabajo válido con cualquiera de las dos estructuras.

# Enmienda del piloto (2026-11-16)

El piloto se ejecuta con estas cinco tareas, en este orden:

1. `TASK-0161` — motor de traits, stacking y especiales (riesgo alto).
2. `TASK-0162` — host/UI de traits visibles y feedback; depende de la anterior.
3. `TASK-0154` — QA/E2E del hotseat.
4. `TASK-0155` — ADR-029 y documentación del hotseat.
5. `TASK-0159` — notas de hotseat en las hojas de requisitos.

Desviaciones respecto al piloto original, aprobadas por el usuario:

- La tarea «que ya falló» no se repite: `TASK-0101` y `TASK-0057` están `done`
  con tres intentos y criterios firmados. Su hueco lo ocupa `TASK-0161`, de
  riesgo alto.
- `T-011` de `REQ-019` (ADR-024 y documentación de traits) queda fuera del
  piloto; se creará como tarea `docs` posterior. `REQ-019` no se cierra entera.
- `REQ-020` sigue en borrador: las cuatro piezas existen en el catálogo y solo
  se inspeccionan con debug, sin botín ni cofres.
- El piloto corre sobre `harness/2agentes`, que no se fusiona hasta pasar los
  umbrales. `verify:task --base harness/2agentes` mide solo el diff de la tarea;
  la base queda escrita en `lead-verify/verify-task.txt`.

# Consecuencias

- Menos recargas de contexto: desaparecen el prompt del lead, el brief y su
  lectura.
- Un solo dueño de `docs/`, sin allowlists cruzadas ni contradicciones de ruta.
- La verificación deja de ser una opinión: el script falla, y lo que no puede
  comprobar aparece como criterio pendiente de firma.
- Se pierde la segunda lectura del mismo modelo. Se compensa con checks
  mecánicos, playtest del usuario y, en tareas de riesgo alto, relanzamiento con
  otro modelo.
- `game-lead` concentra más permisos. El riesgo se acota con la regla de
  confirmación para reglas y con `git` acotado a ramas de tarea.
- El contexto del primario crece si encadena muchas tareas; se mantiene una
  sesión por tarea y la ficha como estado externo.

# Revert

Línea base: etiqueta `harness-pre-2agentes` sobre `main` en el commit anterior al
cambio. El cambio de agentes es atómico porque `.opencode/agents/`,
`opencode.jsonc` y `scripts/validate-opencode.mjs` deben ser coherentes a la vez.

```bash
# Descartar la rama completa antes de fusionar
git checkout main
git branch -D harness/2agentes

# Tras fusionar: revertir el cambio y conservar el ADR
git revert <sha-cambio>
git checkout harness-pre-2agentes -- .opencode/agents/ opencode.jsonc scripts/

# Recuperar solo un agente
git checkout harness-pre-2agentes -- .opencode/agents/task-lead.md
```

Después de cualquier revert: `pnpm run verify` y comprobar que `config:check`
vuelve a verde. Las tareas y artefactos de las cinco pruebas no se reescriben.

# Alternativas descartadas

- **Tres agentes (conservar `task-lead`)**: mantiene la segunda lectura, pero
  duplica el contexto y la verificación sigue siendo del mismo modelo.
- **Un solo agente**: el ejecutor perdería el contexto limpio y el primario
  arrastraría la implementación a la conversación de producto.
- **Conservar `harness-keeper`**: su trabajo es episódico y cabe en una skill; el
  coste es un prompt, permisos y una sesión más.
- **Script sin firma de criterios**: automatiza lo mecánico y deja lo semántico
  invisible; la firma por criterio mantiene el juicio auditable en el diff.

# Enlaces

- [Flujo de trabajo](../harness/workflow.md)
- [Plantilla de tarea](../templates/task.md)
- [ADR-009](ADR-009-recorte-arnes.md)
- [ADR-016](ADR-016-permisos-docs-diseno-glosario.md)
- [ADR-018](ADR-018-harness-keeper.md)
