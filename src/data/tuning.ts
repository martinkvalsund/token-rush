/** All gameplay numbers live here. Never inline them elsewhere. */
export const GAME_TITLE = 'Token Rush';
export const COMPANY_NAME = 'Digital Construction Co.';

export const TUNING = {
  world: { laneX: [-2.4, 0, 2.4] as const, rowSpacing: 4, spawnDistance: 90 },
  speed: { start: 14, max: 32, timeConstant: 55 },
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
  },
  loop: { fixedStep: 1 / 60, maxStepsPerFrame: 5 },
  camera: {
    fovStart: 62,
    fovMax: 74,
    position: [0, 4.2, 7.5] as const,
    lookAt: [0, 1.2, -8] as const,
  },
} as const;
