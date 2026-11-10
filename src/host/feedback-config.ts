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
    gameRestartedMs: 250,
    rejectedShakeMs: 120,
  },
  texts: {
    /** Persistencia del texto `-N`/`Fallo`; puede superar el beat. */
    damageMs: 1000,
    bannerMs: 800,
    noticeMs: 1600,
    alarmNoticeMs: 1600,
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
