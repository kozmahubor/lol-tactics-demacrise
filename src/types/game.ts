
// src/types/game.ts

export type Resources = {
  // Meta Currency
  silverShields: number; // The "Energy" to play turns

  // Game Resources
  food: number;      // Represents the total unit capacity.
  wood: number;      // Basic building
  stone: number;     // Advanced building
  metal: number;     // Weapons/Armor
  petricite: number; // Magic tech
  valor: number;     // Research points
}

export type TerrainType = 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'PETRICITE_GROVE';

export interface MapTile {
  id: number;
  name: string;             // e.g., "Sector 01" or "Zeffira"
  terrain: TerrainType;
  isOwned: boolean;         // True if player conquered it
  building: Building | null;// What is built here?
  enemyThreat: number;      // 0 = safe, >0 = enemy power level
  garrison: string | null;        // ID of the army stationed here
}

export interface Building {
  type: 'FARM' | 'LUMBERMILL' | 'QUARRY' | 'BARRACKS' | 'TOWN_CENTER';
  level: number;
  production: Partial<Resources>; // e.g., { food: 10 }
}

export interface Unit {
  id: string;
  type: 'SOLDIER' | 'RANGER' | 'CHAMPION';
  name: string;
  combatPower: number;
  upkeepCost: number; // Food consumed per turn
  locationTileId: number;
  state: 'IDLE' | 'MOVING' | 'TRAINING';
  turnsToTrain?: number;
  destinationTileId?: number;
}

export interface ScheduledAttack {
  targetTileId: number;
  attackTurn: number;
  threatLevel: number;
}
