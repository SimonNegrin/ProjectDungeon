---
type: Verification
title: "TASK-0159: verificación del intento 1"
description: Resultado de verify:task y revisión de las notas de hotseat en ocho hojas.
task: TASK-0159
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:20:00Z }
---

# Resultado

`ok`. `verify:task TASK-0159 --base harness/2agentes` en verde: estado, 8
criterios firmados, informe `success`, 9 archivos dentro de `docs` y `pnpm run
verify` completo. Salida en `verify-task.txt`.

# Criterios

Los ocho firmados. Cada hoja añade una nota fechada en «Notas de vigencia» que
remite a REQ-031 v2 y ADR-029; no se toca ningún requisito, versión ni criterio:

- REQ-005: cámara al activo con paneo de 300 ms y al enemigo que actúa.
- REQ-017: paneo de relevo, banner de ronda no bloqueante y cue de «El master
  mueve».
- REQ-018: panel solo en turno activo, público y cerrado al terminar; sin entrega
  directa.
- REQ-021: `N` para el fantasma y resurrección por índice.
- REQ-022/REQ-023: «Jugador N de M», ficha compacta del objetivo y actor enemigo
  en la columna derecha.
- REQ-024/REQ-026: pausa global, guardado restringido, carga en activo, `N` en
  lugar de `E`, turno por jugador y una fase enemiga por ronda; sin `R`.
- `docs/log.md` registra el cierre en el commit de cierre; `docs:check` sin enlaces
  rotos.

# Diff revisado

Ocho hojas de `docs/requirements/**` con 63 líneas añadidas, todas dentro de
«Notas de vigencia», más la ficha y los artefactos. Sin cambios en ADR, glosario,
economía de turno ni arquitectura. REQ-026 conserva R-008 con `E` como texto
histórico y la nota aclara la tecla vigente; REQ-024 ya tenía la sección.

# Qué debe probar el usuario

- Leer las notas y comprobar que ninguna contradice el modo que juega.
- En playtest, que la ayuda de controles y el panel no mencionan `E` ni `R`.
