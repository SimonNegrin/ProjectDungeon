---
type: Task Brief Detail
title: "TASK-0124: contrato de la pantalla de jugador"
description: Modelo puro, DOM, integración con el paso 1 y matriz de pruebas.
task: TASK-0124
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:10:00Z }
---

# Frontera

`src/host/player-screen.ts`: modelo puro, sin DOM ni relojes. `src/host/player-screen-view.ts`:
vista DOM. `main.ts` orquesta; ni el modelo ni la vista crean `GameSession`.

```ts
interface PlayerDraft {
  readonly archetypeId: ArchetypeId; // de ROSTER, sin redefinir
  readonly variant: PlayerVariant;   // 1 | 2
  readonly name: string;             // normalizado; '' si queda vacío
}
interface PlayerScreenConfig {
  readonly playerCount: number; // 1..6, fijo desde el paso 1
  readonly seed: number;        // uint32, fijo desde el paso 1
}
```

`createPlayerScreen({playerCount, seed})` construye N borradores, todos
Guerrero/variante 1/nombre vacío, índice 0. El estado expone `step:
'player' | 'confirm-cancel'`, `index`, N, semilla y los borradores (solo
lectura). Métodos previstos: `setArchetype`, `setVariant`, `setName`, `next`,
`back`, `requestCancel`, `confirmCancel`, `dismissCancel`, `escape` y
`effectiveName(i)` (nombre recortado o nombre del arquetipo, para anuncios y
para TASK-0126).

Reglas del modelo:

- `setArchetype`: solo IDs de `ROSTER`; si cambia el arquetipo, variante a 1;
  el nombre no se toca. Repetir el mismo arquetipo no resetea nada.
- `setVariant`: solo 1 o 2 para el jugador actual.
- `setName`: normaliza NFC, descarta todo lo que no sea `\p{L}`, `\p{Nd}` o
  espacio U+0020 (sin tabs, saltos ni símbolos) y trunca a 12 code points con
  `Array.from` (nunca `slice` UTF-16). Es idempotente. No produce error.
- `next`: recorta el nombre del jugador actual (trim); si no es el último
  incrementa el índice y devuelve `null`; si es el último devuelve
  `PlayerScreenConfig` con `players` en orden 1..N listos como `GameConfig`
  (nombres vacíos se emiten como `''`). No construye estado de partida.
- `back`: recorta el nombre actual; si `index > 0` decrementa; en el jugador 1
  no hace nada. Nunca vuelve al paso 1.
- `requestCancel`: abre la confirmación conservando índice y valores.
  `dismissCancel` vuelve al jugador actual sin cambios. `confirmCancel` descarta
  todo y lo señala para que el host vuelva al menú principal.
- `escape`: en jugador abre confirmación; en el aviso lo cierra sin cancelar.

# Integración

- `main.ts` conecta `onContinue({playerCount, seed})` del paso 1: oculta la
  pantalla de inicio, crea la pantalla de jugador con esos datos y muestra el
  jugador 1. Esto completa el pendiente de TASK-0123.
- Mientras cualquiera de las dos pantallas esté visible, `main.ts` no interpreta
  teclas de mapa ni `F1`. La pantalla de inicio necesita una operación para
  ocultarse y otra para volver al menú con N=1 y semilla vacía sin recargar.
- Handlers de la pantalla de jugador: `onComplete(config)` (TASK-0126) y
  `onCancelConfirmed()`. En esta tarea `onComplete` solo anuncia con
  `aria-live` («Party lista: N jugadores, semilla S») y deja la pantalla como
  está: no hay resumen, «Empezar», sesión ni mapa.
- Al confirmar la cancelación: se destruye/oculta la pantalla de jugador, se
  restaura el menú principal y el foco vuelve a «Nueva».
- `?test=1` no monta ninguna de las dos pantallas. `DEFAULT_PLAYER_CONFIGS` y la
  creación de `GameSession` no se tocan.

# DOM y accesibilidad

- Sección `[data-testid="player-screen"]` hermana de `start-screen` dentro del
  marco, opaca, oculta cuando no está activa.
- Cabecera «Jugador i de N» (`data-testid="player-position"`) y región
  `role="status" aria-live="polite"` (`player-status`) para progreso y aviso del
  handler final. No hay errores bloqueantes: el nombre se sanea en vivo.
- Arquetipos: los nueve de `ROSTER`, con su nombre visible y sin datos de ficha
  (stats, arma, magia o miniaturas son TASK-0125). Botones/radios accesibles con
  `data-testid="player-archetype-<id>"` y estado seleccionado (`aria-checked` o
  `aria-pressed`). Máximo un arquetipo seleccionado.
- Variantes: dos controles `player-variant-1` y `player-variant-2`, etiquetas
  «Variante 1»/«Variante 2», sin género. Máximo una seleccionada; siempre hay
  una.
- Nombre: `input` con etiqueta «Nombre» (`player-name`), ayuda con el máximo y
  qué pasa si se deja vacío, `aria-describedby` a la ayuda. No uses `maxlength`
  como única defensa (cuenta UTF-16); el modelo trunca.
- Botones `player-back` («Atrás»), `player-next` («Siguiente») y `player-cancel`
  («Cancelar»). «Atrás» deshabilitado en el jugador 1; no existe ruta al paso 1.
- Confirmación `player-cancel-dialog` con `role="dialog"`, `aria-modal="true"`,
  título/texto de descarte, `player-cancel-confirm` y `player-cancel-dismiss`;
  foco atrapado, `Esc` cierra y el foco vuelve al origen.
- Foco al entrar y al cambiar de jugador: el arquetipo seleccionado. `Tab`
  recorre en orden; `Enter`/`Espacio` activan controles nativos; foco visible
  con `--ui-focus`, perceptible sin color (outline y relieve).
- Reutiliza tokens y clases de `ui.css`; si añades clases, sigue el patrón
  `player-*` y `calc(var(--ui-unit) * n)`.

# Matriz de pruebas

Unitario (`tests/unit/host/player-screen.test.ts`, Vitest node):

- defaults N=1 y N=6: Guerrero/variante 1/nombre vacío en todos los borradores;
  N y semilla se conservan.
- los nueve arquetipos aceptados; variante 2 se guarda por jugador; variante
  inválida se rechaza sin cambiar la anterior.
- cambiar de arquetipo con variante 2 la devuelve a 1 y conserva el nombre;
  reseleccionar el mismo arquetipo no resetea.
- nombre: acentos y eñes («Ñandú», «Ana María»); NFC con combinantes; recorte de
  espacios al aceptar; 13 code points se truncan a 12; emoji y símbolos se
  descartan sin error; vacío queda `''` y `effectiveName` devuelve el del
  arquetipo; duplicados entre jugadores permitidos.
- avance N=3: siguiente, atrás conserva arquetipo/variante/nombre por jugador;
  atrás en el jugador 1 no cambia ni vuelve al paso 1; siguiente en el último
  devuelve la party en orden con la semilla.
- cancelación: pedir, desistir (mismo índice y valores) y confirmar (señal de
  descarte); `Esc` en jugador y en aviso.

E2E (`tests/e2e/player-screen.spec.ts`, 1280×720 y 900×700, `/` sin `?test=1`):

- Nueva → N=2 y semilla → Continuar → jugador 1; nueve arquetipos y dos
  variantes visibles.
- Jugador 1: Mago, variante 2, nombre con espacios/acentos; Siguiente → jugador
  2 con defaults; Atrás → jugador 1 conserva todo; Siguiente dos veces →
  `player-status` anuncia la party; sigue en la pantalla y no arranca partida.
- `Esc` → confirmación; desistir conserva; confirmar vuelve al menú principal y
  «Nueva» recupera N=1 y semilla nueva.
- Recorrido solo con teclado y capturas en
  `tests/e2e/player-screen/screenshots/` con `E2E_ARTIFACTS_DIR`.

Manual: revisar truncado y foco sin depender del color.

# Evidencia

`artifacts/TASK-0124/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `e2e-output.txt` y `commit.txt`. El informe enlaza este
detalle, los specs adaptados (si los hay) y el resultado de E2E.
