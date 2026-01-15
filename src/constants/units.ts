// src/constants/units.ts
import type { Resources, Unit } from '../types/game';

export const UNIT_COSTS: Record<Unit['type'], Partial<Resources>> = {
  SOLDIER: { food: 10, wood: 5 },
  RANGER: { food: 15, wood: 10 },
  CHAMPION: { food: 50, metal: 20, petricite: 10 },
};

export const UNIT_TRAINING_TIME: Record<Unit['type'], number> = {
  SOLDIER: 2,
  RANGER: 3,
  CHAMPION: 5,
};

export const UNIT_BASE_POWER: Record<Unit['type'], number> = {
  SOLDIER: 20,
  RANGER: 25,
  CHAMPION: 60,
};

export const UNIT_UPKEEP: Record<Unit['type'], number> = {
  SOLDIER: 1,
  RANGER: 2,
  CHAMPION: 5,
};
