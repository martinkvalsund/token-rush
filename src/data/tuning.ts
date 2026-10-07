/** All gameplay numbers live here. Never inline them elsewhere. */
export const GAME_TITLE = 'Token Rush';
export const COMPANY_NAME = 'Digital Construction Co.';

export const TUNING = {
  world: {
    laneX: [-2.4, 0, 2.4] as const,
    rowSpacing: 4,
    spawnDistance: 90,
    despawnBehind: 12,
    zoneLength: 600,
    tierLength: 180,
    maxTier: 8,
  },
  speed: { start: 16, max: 36, timeConstant: 48 },
  player: {
    laneChangeTime: 0.12,
    gravity: 28,
    jumpVelocity: 9.8,
    superJumpVelocity: 13.8,
    fastFallMultiplier: 2.5,
    slideDuration: 0.75,
    slideCancelAfter: 0.1,
    height: 1.8,
    slideHeight: 0.7,
    width: 0.7,
    depth: 0.5,
    hitboxShrink: 0.05,
    inputBuffer: 0.12,
    coyoteTime: 0.08,
    /** Highest step the player walks up without it counting as a hit (ramps). */
    stepUp: 0.6,
    /** Feet within this distance of a top while falling count as landing on it. */
    landTolerance: 0.3,
  },
  /** Rules used by the fairness validator and the bot (seconds). */
  fairness: {
    laneChange1: 0.4,
    laneChange2: 0.6,
    actionRecovery: 0.15,
    /** Window inside a jump where the feet are above a low obstacle (s after take-off). */
    jumpClearFrom: 0.11,
    jumpClearTo: 0.59,
    /** Slide must start this long before an overhead obstacle reaches the player. */
    slideLead: 0.05,
  },
  lives: {
    gapFar: 14,
    gapNear: 4,
    stumbleGapLoss: 10,
    gapRecovery: 1.0,
    stumbleSlowdown: 0.2,
    stumbleSlowTime: 0.6,
    stumbleIFrames: 1.2,
    shieldIFrames: 1.5,
  },
  tokens: { pickupRadius: 0.9, score: 10, magnetRange: 10, magnetPull: 30, promptsPer: 100 },
  powerups: {
    firstAt: [150, 300] as const,
    every: [350, 600] as const,
    magnet: 12,
    jetpack: 7,
    jetpackHeight: 5.5,
    /** Headroom kept between the flying player's head and an enclosed zone's ceiling. */
    jetpackCeilingClearance: 1.6,
    jetpackBlink: 1.5,
    jetpackLandIFrames: 1,
    shieldMax: 20,
    double: 15,
    boots: 12,
    mysteryDelay: 1.2,
    mysteryTokens: 30,
    mysteryScore: 500,
    weights: { magnet: 3, jetpack: 2, shield: 2, double: 2, boots: 2, mystery: 2 },
  },
  moving: {
    telegraph: 1.2,
    warnAhead: 2.6,
    oncomingSpeed: 8,
    rollSpeed: 5,
    swingAmplitude: 2.9,
    swingPeriod: 3,
  },
  loop: { fixedStep: 1 / 60, maxStepsPerFrame: 5 },
  camera: {
    fovStart: 62,
    fovMax: 74,
    position: [0, 4.2, 7.5] as const,
    lookAt: [0, 1.2, -8] as const,
    shakeStumble: 0.25,
    shakeCrash: 0.6,
  },
  render: {
    shadowMapSize: 2048,
    adaptiveFrameMs: 20,
    adaptiveSeconds: 3,
  },
  input: {
    swipeThreshold: 40,
    swipeLockMs: 250,
    swipeDecay: 4,
    /** One-finger trackpad flick (pointer movement, no click): pixels within ~0.1 s. */
    flickThreshold: 70,
    /** Accumulated flick movement fades with this time constant (ms), so slow drift never fires. */
    flickWindowMs: 90,
    pointerSwipePx: 30,
  },
} as const;

export type Lane = 0 | 1 | 2;
export const LANES: readonly Lane[] = [0, 1, 2];
export const laneX = (lane: Lane): number => TUNING.world.laneX[lane];
