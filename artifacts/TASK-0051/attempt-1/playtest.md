---
type: Playtest Note
title: "TASK-0051: paquete de playtest del balance provisional v1"
description: Arranque, semilla y checklist para la revisión de sensación del usuario.
task: TASK-0051
attempt: 1
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T22:20:00Z }
---

# Arranque

1. `pnpm run dev` y abrir `http://localhost:5173/?seed=279837264`.
2. Jugar sin `test=1`; esa marca es solo para la QA automatizada.
3. Teclas: flechas/WASD cursor, Espacio/Enter moverse, `F` atacar, `E` fin de
   turno, `G` recoger, `1`-`3` cambiar arma, `F1` debug, `R` reiniciar.

# Semilla

- Referencia: `279837264`.
- El mapa debe colocar 4 enemigos en salas distintas: 2 centinelas, 1 bruto y
  1 cobarde; ninguna pareja debe ver al jugador al inicio.

# Checklist de sensación

- [ ] Centinela: 6 PV, 5 MP, espada +3/+3, escudo +1 y **sin armadura** en
      `F1`; cae en 1–2 impactos de espada.
- [ ] Bruto: 8 PV, 4 MP, hacha +2/+5, coraza 2; es el tanque.
- [ ] Cobarde: 5 PV, 6 MP, daga +4/+2; un golpe de ≥2 daño (40 %) que no lo
      mate lo hace huir; a menudo muere antes de huir.
- [ ] HUD: arma +3/+3, +2/+5 o +4/+2; escudo/armadura y modificadores del
      jugador.
- [ ] Alarma: al ser visto, aviso «¡Alarma!» y onda de radio 5; un enemigo a 5
      tras un muro acude y uno a 6 no. Sin cadena.
- [ ] Feedback: se distingue impacto con «-N» de «Fallo»; sin dados en juego
      normal.
- [ ] `F1`: visión 6/4/5, alarma 5, MP 5/4/6 y estado de percepción por enemigo.
- [ ] Sensación general: ¿el centinela es frágil, el bruto aguanta y el cobarde
      se siente huidizo sin ser imposible de rematar?

# Registro

- Fecha: 2026-11-12.
- Decisión: `human:simon` da el playtest por cumplido el 2026-11-12 y cierra
  G4, sin notas de sensación por ítem.
- Alcance: la tarea se cierra como QA verificada de una versión histórica; el
  balance provisional v1 queda obsoleto y superado por
  [REQ-026](../../../docs/requirements/REQ-026-economia-acciones-rebalanceo.md).
  Este documento no aprueba el balance.
