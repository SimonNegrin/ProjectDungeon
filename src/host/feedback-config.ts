/**
 * Configuración única del feedback de presentación de REQ-017. Reúne los beats
 * (tiempo mínimo con el input bloqueado), las duraciones de los efectos y los
 * límites de persistencia. El movimiento conserva su propia configuración en
 * `MOTION_CONFIG` (125/70).
 *
 * Este módulo es puro y no importa nada del host ni del motor: es la única
 * fuente de números de presentación para que cambiar un beat no obligue a
 * buscar valores dispersos.
 */
export const FEEDBACK_CONFIG = {
  beats: {
    /** Impacto: embestida, destello, retroceso, texto y tick de PV. */
    attackHit: 320,
    /** Fallo: misma embestida, esquiva/escudo y texto gris. */
    attackMiss: 300,
    /** Hechizo de daño que impacta: proyectil, destello, `-N` y desglose. */
    spellHit: 340,
    /** Hechizo de daño que falla: proyectil sin daño y `Fallo`. */
    spellMiss: 300,
    /** Curación: destello verde y `+N` sobre el aliado. */
    spellHeal: 360,
    /** Resurrección: beat más largo y `Vuelve N PV` sobre el cadáver. */
    spellResurrect: 500,
    /**
     * Réplica (REQ-027): la animación de ataque del defensor hacia el atacante
     * original, sin texto propio. Excepción declarada al techo de 1,3 s de
     * REQ-017: fallo (300) + réplica (300) queda por debajo del techo.
     */
    replica: 300,
    death: 900,
    pickup: 350,
    selectWeapon: 250,
    spotted: 200,
    alarm: 500,
    fled: 300,
    returned: 250,
    waited: 200,
    enemyPhase: 400,
    playerTurn: 350,
    /** `TurnEnded` que aparece solo; si le sigue `EnemyPhaseStarted` no bloquea. */
    turnEnded: 250,
    gameEnded: 800,
    gameRestarted: 250,
    /** No bloqueante: el aviso del HUD sigue su propio temporizador. */
    rejected: 0,
    /** Atajo de un enemigo que empieza y termina fuera de pantalla (TASK-0060). */
    enemyOffscreen: 150,
  },
  durations: {
    attackFlashMs: 120,
    damageTextMs: 1000,
    deathFlashMs: 900,
    /** Disolución de paleta al final de la muerte (R-008). */
    deathDissolveMs: 300,
    pickupMs: 350,
    selectWeaponMs: 250,
    spottedMs: 200,
    alarmMs: 500,
    fledMs: 300,
    returnedMs: 250,
    waitedMs: 200,
    enemyPhaseMs: 400,
    playerTurnMs: 350,
    turnEndedMs: 250,
    gameEndedMs: 800,
    /** Destello de borde al abrirse el cue de fin de partida. */
    gameEndedFlashMs: 120,
    gameRestartedMs: 250,
    rejectedShakeMs: 120,
  },
  texts: {
    /** Persistencia del texto `-N`/`Fallo`; puede superar el beat. */
    damageMs: 1000,
    /** Banner `+ <Arma>` de recogida y nombre en el cambio de arma. */
    bannerMs: 800,
    /** Aviso genérico del HUD; cubre rechazo y estado (1600 ms, R-019). */
    noticeMs: 1600,
    /** Banner `¡Alarma!`; persiste después de su beat de 500 ms (R-014). */
    alarmNoticeMs: 1600,
    /** Aviso de `CommandRejected`; no bloquea el input (R-019). */
    rejectedNoticeMs: 1600,
    /** Marca `!!` de huida; persiste después de su beat de 300 ms (R-015). */
    fledPersistMs: 600,
    /** Marca `zzz` de regreso; persiste después de su beat de 250 ms (R-015). */
    returnedPersistMs: 500,
    /** Marca `...` de espera; persiste después de su beat de 200 ms (R-015). */
    waitedPersistMs: 400,
    /** Banner `FASE ENEMIGA`; persiste después de su beat de 400 ms (R-016). */
    enemyPhaseBannerMs: 800,
    /** Banner `TU TURNO`; persiste después de su beat de 350 ms (R-016). */
    playerTurnBannerMs: 700,
  },
  /**
   * Medidas de los efectos de mundo de combate y muerte. Se expresan en píxeles
   * de tile porque se dibujan en Canvas; el texto vive en DOM y usa las anclas
   * de `feedback.ts`.
   */
  effects: {
    /** Embestida del atacante: 2-4 px hacia el objetivo y vuelta. */
    attackLungePx: 3,
    attackLungeMs: 90,
    attackLungeReturnMs: 150,
    /** Retroceso del objetivo en sentido opuesto al atacante. */
    attackKnockbackPx: 2,
    attackKnockbackMs: 120,
    /** Sacudida de sprite de 1 px en el impacto. */
    spriteShakePx: 1,
    spriteShakeMs: 140,
    /** Gesto de esquiva/escudo del defensor cuando el ataque falla. */
    missDodgePx: 2,
    missDodgeMs: 120,
    defenseGestureMs: 220,
    /** Muerte: destello, tres parpadeos, disolución y sacudida. */
    deathFlashMs: 120,
    deathBlinkCount: 3,
    deathBlinkMs: 80,
    deathShakePx: 1,
    deathShakeMs: 300,
    /** Onda de alarma: radio máximo en tiles y destellos de borde. */
    alarmRadiusTiles: 2,
    alarmBorderFlashCount: 2,
    /** Parpadeo del arma del suelo en la recogida (frames encendidos). */
    pickupBlinkFrames: 3,
    /** Parpadeo del enemigo al iniciar la alerta (frames encendidos). */
    spottedBlinkFrames: 2,
  },
  limits: {
    maxDamageTexts: 3,
  },
} as const;

/** Persistencia del texto de daño, derivada de la configuración única. */
export const DAMAGE_FEEDBACK_MS = FEEDBACK_CONFIG.texts.damageMs;

/** Duración del destello de impacto, derivada de la configuración única. */
export const ATTACK_FLASH_MS = FEEDBACK_CONFIG.durations.attackFlashMs;

/** Duración del aviso breve del HUD, derivada de la configuración única. */
export const NOTICE_DURATION_MS = FEEDBACK_CONFIG.texts.noticeMs;
