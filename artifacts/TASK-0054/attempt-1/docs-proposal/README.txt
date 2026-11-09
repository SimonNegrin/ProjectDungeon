Propuesta documental para TASK-0054 (intento 1).

El agente `task-runner` no puede editar `docs/` (permiso `edit` denegado por
`.opencode/agents/task-runner.md`); `docs/design/` y `docs/glossary.md` tampoco
están permitidos a `task-lead`. Por eso estos archivos son la propuesta exacta
para que `requirements-writer` los aplique:

- `turn-economy-combate.txt`: reemplaza la sección «# Combate» y la tabla de
  «## Equipo y bestiario» en `docs/design/turn-economy.md`.
- `glossary.md.txt`: contenido completo actualizado de `docs/glossary.md`.
- `architecture-combate.txt`: reemplaza la sección «# Combate y azar» en
  `docs/design/architecture.md`.
- `ADR-015-atributos-inherentes-absorcion.md.txt`: contenido completo del ADR
  nuevo; copiar a `docs/decisions/ADR-015-atributos-inherentes-absorcion.md`.
- `decisions-index.txt`: línea que falta en `docs/decisions/index.md`.

Los enlaces de los fragmentos son relativos a su ubicación final en `docs/`.
