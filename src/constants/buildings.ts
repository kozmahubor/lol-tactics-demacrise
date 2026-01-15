// src/constants/buildings.ts
import type { Resources, Building } from '../types/game';

export const BUILDING_COSTS: Record<Building['type'], Partial<Resources>> = {
  FARM: { wood: 50, food: 0, silverShields: 0, stone: 0, metal: 0, petricite: 0, valor: 0 },
  LUMBERMILL: { wood: 75, food: 0, silverShields: 0, stone: 0, metal: 0, petricite: 0, valor: 0 },
  QUARRY: { wood: 100, food: 0, silverShields: 0, stone: 0, metal: 0, petricite: 0, valor: 0 },
  BARRACKS: { wood: 150, stone: 50, food: 0, silverShields: 0, metal: 0, petricite: 0, valor: 0 },
  TOWN_CENTER: { wood: 200, stone: 100, food: 0, silverShields: 0, metal: 0, petricite: 0, valor: 0 },
};

// Also define building production here, to centralize building data
export const BUILDING_PRODUCTION: Record<Building['type'], Partial<Resources>> = {
  FARM: { food: 10 },
  LUMBERMILL: { wood: 10 },
  QUARRY: { stone: 10 },
  BARRACKS: { valor: 5 }, // Example production
  TOWN_CENTER: { food: 5, wood: 2 },
};
