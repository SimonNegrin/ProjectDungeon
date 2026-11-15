---
type: Task Report
title: "TASK-0157: informe del intento 1"
description: Enmiendas de REQ-034 v1 anotadas en seis hojas sin cambiar reglas ni cerrar REQ-020.
task: TASK-0157
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:51:10Z }
artifacts: artifacts/TASK-0157/attempt-1/
verified:
  - by: task-lead
    at: 2026-11-15T18:51:10Z
---

# Estado

`success`. Las seis hojas remiten a REQ-034 v1; REQ-020 sigue `draft`, sin
cerrar y con sus preguntas abiertas intactas.

# Cambios

- REQ-017: nota de vigencia; cadáver de enemigo solo con saqueables y
  R-008/R-009/R-010 leídos con la excepción.
- REQ-020: R-002 limitada a cadáveres con saqueables; R-008 concretada (cofre
  adyacente/1 acción, cadáver mismo tile/0).
- REQ-021: R-007 concretada (mismo tile, 0/0 para el vivo, una acción por objeto
  para el fantasma); resurrección adyacente.
- REQ-024: `lootable` y contenedores en la v1; cargar no vuelve a tirar. La v1
  de TASK-0138 ya nació con esos campos (`8c0ddbf`), sin subir `format_version`.
- REQ-018 y REQ-026: coste 0 del cadáver, 1 acción del cofre, transferencias
  gratuitas.
- `index.md` y `log.md`: resumen y registro.
- Sin cambios en `src/`, tests, ADR, glosario, alcance ni versiones.
- Commit: `b06ebd8`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK; 698 documentos, 160 tareas | `lead-verify/docs-check-output.txt` |
| `pnpm run verify` | 107 archivos/1678 tests, tsc, build y bundle OK | `lead-verify/verify-output.txt` |

# Criterios

1. REQ-017: cadáver no universal, solo con saqueables. Pasa.
2. REQ-020: R-002 y R-008 anotadas; borrador sin cerrar. Pasa.
3. REQ-021: R-007 en mismo tile, 0/0 y una acción por objeto; adyacencia de
   resurrección. Pasa.
4. REQ-024: `lootable`, contenedores, sin nueva tirada y criterio de versión.
   Pasa.
5. REQ-018 y REQ-026: separación de costes sin tocar transferencias. Pasa.
6. Notas con REQ-034 y log; sin reescribir reglas. Pasa.
7. `docs:check` y enlaces. Pasa.

# Riesgos y seguimiento

- REQ-026 R-011, T-005 y T-012 aún dicen «cofre o cadáver: 1 acción y
  adyacencia»; la nota los enmienda desde su sección, pero no nombra R-011. El
  bloque «Estado de implementación» sigue dando R-011 por pendiente. Pase de
  `requirements-writer`.
- REQ-020 Q5 mantiene abierto «si se queda vacío» para cadáveres de enemigo,
  aunque REQ-034 R-007 decide su retirada. No se tocó: la restricción prohíbe
  cambiar preguntas abiertas.
- REQ-017 cita REQ-034 sin «v1» (nit).
