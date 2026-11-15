---
type: ADR
title: "ADR-028: formato de guardado v1"
description: Contenedor .zip propio con manifiesto y partida, esquema estricto, versionado, límites de carga y persistencia local sin presentación.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-14T22:19:59Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:45:00Z }
---

# Contexto

La visión dejaba abierta la persistencia. [REQ-024](../requirements/REQ-024-menu-pausa-guardado.md)
v3 la cierra: guardar produce un archivo local y cargar lo reconstruye, sin
cuentas, servidor, base de datos ni guardado entre runs. El formato técnico se
repartió en TASK-0137 (contenedor `.zip`), TASK-0138 (esquema v1 y manifiesto),
TASK-0140 (guardar) y TASK-0141 (cargar).

Este ADR registra el esquema implementado y sus garantías. No añade reglas ni
alcance: concreta R-003 a R-009 y T-001 a T-009 de la hoja.

# Decisión

- **Contenedor `.zip` propio, sin dependencias ni red.** `src/host/save-zip.ts`
  escribe un ZIP clásico (sin ZIP64) con `manifiesto.json` y `partida.json` en la
  raíz usando `CompressionStream('deflate-raw')`. La lectura acepta entradas
  `store` y `deflate`, rechaza métodos y características no soportadas y no
  entrega entradas parciales. No hay peticiones de red ni cambios en
  `package.json` o `pnpm-lock.yaml` (T-003, T-012).
- **Manifiesto identificable y validable.** `manifiesto.json` lleva
  `format_version` (debe ser `1`), `game_version` (informativa, no bloquea),
  `created_at` como fecha ISO UTC terminada en `Z`, `seed` y `summary` con
  `players` (nombre y arquetipo de cada jugador), `turn`, `round` y `phase`. El
  campo `phase` usa el enum del motor, `player` o `enemy`. Permite reconocer y
  validar un guardado antes de aplicar la partida (R-004, T-004).
- **Partida con esquema estricto y versión propia.** `partida.json` guarda el
  estado completo del motor con su propio `format_version`, lo que permite
  cargar un `.json` suelto. `src/game/save.ts` valida antes de tocar el estado:
  claves desconocidas, tipos erróneos, `null` inesperado, números no finitos,
  índices fuera de rango, referencias rotas y versiones desconocidas se
  rechazan. No se usa `eval`, `Function` ni un reviver ejecutable (T-001, T-005).
- **Límites de carga.** Máximo 5 MB comprimido, 20 MB descomprimido, 4 entradas
  y 5 MB por archivo; para un `.json` suelto, 5 MB. Solo se aceptan
  `manifiesto.json` y `partida.json` en la raíz; carpetas, rutas, entradas
  duplicadas y entradas extra se rechazan antes de descomprimir. Los tamaños
  declarados no se confían: el límite se comprueba también al descomprimir
  (T-006).
- **Sin presentación.** El archivo no contiene timeline de feedback, cámara,
  cursor, panel abierto, HTML ni estado de HUD. Al cargar, la presentación se
  reconstruye en el estado final, centrada una vez en el activo, y los HUD se
  redibujan desde el estado (R-009, T-002, T-015).
- **Cargar no vuelve a tirar.** El estado del RNG viaja en la partida y la misma
  secuencia continúa tras cargar. Cada instancia lleva `lootable` y los
  contenedores viajan tal cual, así que la carga no repite la tirada de botín de
  [REQ-034](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md) ni
  cambia qué objetos son saqueables (R-008, T-001).
- **Un único cargador y cruce manifiesto↔estado.** `src/host/load-game.ts`
  atiende al menú principal y a la pausa. En `.zip`, además de validar cada
  archivo, cruza semilla, turno, ronda, fase y party del manifiesto con el
  estado; un desajuste rechaza la carga antes de reemplazar la partida en curso
  (T-016).
- **Nombre y v1 con el modelo actual.** El archivo se llama
  `proyectdungeon-<semilla>-<AAAAMMDD-HHmmss>.zip` con fecha UTC y se construye y
  comprime antes de iniciar la descarga, así que un fallo no deja un `.zip`
  parcial (R-015, T-009). La v1 se fija con el `Container` actual de
  [REQ-018](../requirements/REQ-018-inventario-equipo.md), con `kind` y
  `corpseOf` opcionales. Si
  [REQ-020](../requirements/REQ-020-cofres-saqueo.md) cambia el modelo antes de
  publicar, se sube `format_version`; no hay migración entre versiones y la v1
  rechaza las desconocidas.

# Consecuencias

- Guardar y cargar funcionan con la pestaña offline y un archivo autocontenido;
  no hay estado en la nube ni progresión entre runs.
- Un archivo inválido se rechaza con mensaje y deja intacta la partida en curso;
  los límites y el esquema protegen de entradas maliciosas o desmedidas.
- El esquema versionado obliga a una tarea explícita para v2 y a decidir su
  migración; no se aceptan formatos antiguos de forma implícita.
- Las hojas de [REQ-024](../requirements/REQ-024-menu-pausa-guardado.md) y
  [REQ-034](../requirements/REQ-034-objetos-saqueables-botin-enemigos.md) son la
  autoridad de reglas; este ADR solo refleja lo implementado.

# Alternativas descartadas

- **Guardar solo `.json`:** pierde el manifiesto que identifica la partida antes
  de abrirla y el contenedor único de R-004.
- **Dos descargas o dos archivos sueltos:** el usuario tendría que emparejarlos
  y un archivo perdido rompería la partida.
- **Dependencia de zip o ZIP64:** cambia el lockfile y añade superficie para
  archivos pequeños (T-003).
- **Confiar en los tamaños declarados:** permite bombas de descompresión; los
  límites se revalidan al descomprimir.
- **Aceptar claves extra o ignorar tipos:** abre campos no previstos y estados
  parciales; el esquema es estricto y rechaza el archivo entero.
- **Guardar presentación:** la cámara, el cursor y los beats no son estado y
  dejarían la partida cargada en un estado intermedio falso.
- **Volver a tirar el botín al cargar:** rompería el determinismo y permitiría
  repetir la tirada recargando.
