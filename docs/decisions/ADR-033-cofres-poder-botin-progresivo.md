---
type: ADR
title: "ADR-033: cofres, puntuación de poder y botín progresivo"
description: Cofres por sala con tirada determinista, contenido orientado a mejorar el equipo del grupo mediante una puntuación de poder por objeto, poder declarado por trait con signo y una pieza de traits garantizada por nivel.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-16T16:20:04Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T16:20:04Z }
---

# Contexto

[REQ-020](../requirements/REQ-020-cofres-saqueo.md) v5 cierra los cofres. El
motor ya tiene `Container` genérico, tomas atómicas desde contenedor y un cadáver
saqueable gobernado por [ADR-030](ADR-030-saqueabilidad-botin-enemigos.md). Lo
que falta es decidir **qué lleva un cofre** y **cómo se garantiza que la partida
mejore**.

El usuario descartó la tabla fija: el botín debe basarse en el equipamiento y la
bolsa del grupo y mejorar durante la partida, pensando en mazmorras encadenadas.
Con 13 objetos en catálogo y sin noción de rareza, la decisión necesita una
medida numérica y una regla de comparación.

# Decisión

- **Poder declarado por trait.** Cada trait del catálogo declara `poder`, un entero
  con signo. Los modificadores y los especiales lo fijan a mano; los negativos
  restan. La validación rechaza un trait sin poder. Un objeto maldito puede ser
  mejora si su suma neta supera el umbral; el trait se ve antes de equipar
  ([REQ-019](../requirements/REQ-019-traits-objetos.md)).
- **`powerScore(item)`.** Función pura y determinista:
  `acierto + daño total + absorción + evasión + Σ poder de traits`. No conoce
  huecos, partidas ni azar. Es una medida gruesa de potencia, no una predicción
  de daño.
- **Comparación por hueco.** Una candidata solo es mejora si su puntuación supera
  la del **mejor objeto equipado del grupo en ese mismo hueco**; un hueco vacío
  admite cualquier objeto. Comparar un anillo con un arma no significa nada y el
  anillo desaparecería del botín.
- **Generación determinista por sala.** Cada sala no-spawn tira 50 %; si acierta,
  un 20 % adicional de segundo cofre en la misma sala. Nunca en el acceso de spawn
  ni en la salida. Si el nivel no genera ninguno, se fuerza uno. RNG derivado
  propio: el combate con la misma semilla no cambia.
- **Contenido.** Dos objetos por cofre: uno busca mejora real (candidatas con
  puntuación superior en su hueco, se elige la más cercana al umbral para que la
  curva sea gradual); el otro es relleno de tabla común. Botín de grupo, sin
  garantía por jugador.
- **Botín especial.** Una pieza de traits por nivel, fuera de la curva y
  configurable. Sin ella, el ataque circular de REQ-019 no tiene fuente jugable.
- **Profundidad reservada.** La generación recibe `profundidad` pero hoy vale 1 y
  no altera el resultado. El encadenado de mazmorras la usará sin rehacer nada.
- **Capacidad y transferencia.** 4 huecos fijos; coger, depositar y «coger todo»
  gratis y atómicos; el depósito solo en cofres. El cadáver sigue en REQ-034.
- **Una fuente por panel.** `I` abre «Suelo» (suelo y cadáveres del tile); abrir un
  cofre abre «Cofre». El HUD derecho sigue al cursor y no revela contenido de un
  cofre cerrado ([REQ-023](../requirements/REQ-023-hud-derecho-detalle-cursor.md)).

# Valores provisionales

Poder declarado de los traits del catálogo, a ajustar con playtest y datos
([ADR-014](ADR-014-balance-provisional-fuente-unica.md)):

| Traits | Poder |
|---|---:|
| +1 habilidad, fuerza, defensa, resistencia, puntería o magia | 3 |
| +2 PV, +2 MP | 2 |
| +1 acción | 6 |
| Robo de vida 50 % / 25 % | 5 / 3 |
| Ataque circular / amplio | 5 / 8 |
| −1 defensa, −5 PV | −3 |
| −5 MP | −2 |
| −1 acción | −6 |

# Alternativas descartadas

- **Tabla fija por profundidad.** Barata y predecible, pero no corrige malas
  rachas ni garantiza que el grupo mejore; el usuario la descartó.
- **Comparación directa con cada jugador.** Más justa por personaje y mucho más
  cara; con botín de grupo no hay a quién asignar la mejora.
- **+2 constante por trait.** Trataría igual el anillo de robo y el +2 MP, y
  dejaría los malditos como mejora gratis.
- **Traits de estado en este corte.** Envenenado y congelado son efectos
  temporales, no traits de objeto; abren duración, acumulación y feedback.

# Consecuencias

- El catálogo de traits gana un campo y su validación; los 13 objetos cambian de
  comportamiento en el botín sin cambiar en combate.
- El botín deja de ser una tabla y pasa a depender del estado de la party: es más
  difícil de testear, así que la generación se prueba con semillas fijas y un
  grupo canónico.
- Riesgo declarado: con 13 objetos la curva se agota pronto; el arreglo será
  contenido en fase 4, no rehacer el sistema.
- Riesgo declarado: un `poder` mal calibrado puede filtrar objetos o colar
  malditos; el playtest y los datos de `ADR-014` lo corrigen sin tocar el motor.

# Revert

Revertir el commit de la tarea deja el catálogo sin `poder` y el botín como tabla
común; los cofres generados y guardados siguen siendo válidos porque el estado
vive en `Container`. No hay migración de formato pendiente: el guardado v1 no se
ha publicado.
