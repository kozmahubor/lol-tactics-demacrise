
// src/store/useGameStore.ts

import { create } from 'zustand';
import type { Resources, MapTile, Building, Unit, TerrainType } from '../types/game';
import { BUILDING_COSTS, BUILDING_PRODUCTION } from '../constants/buildings';
import { UNIT_COSTS, UNIT_TRAINING_TIME, UNIT_BASE_POWER, UNIT_UPKEEP } from '../constants/units';

interface GameState {
  resources: Resources;
  turn: number;
  map: MapTile[];
  units: Unit[]; // Added units array to the state
  notifications: string[]; // For UI feedback
}

interface GameActions {
  // Meta-Game Loop
  simulateLoLMatch: (result: 'WIN' | 'LOSS') => void;

  // Turn System
  endTurn: () => void;

  // Construction System
  constructBuilding: (tileId: number, buildingType: Building['type']) => void;

  // Combat System (placeholders for now)
  attackTile: (unitId: string, targetTileId: number) => void;
  trainUnit: (tileId: number, unitType: Unit['type']) => void;
}

const initialResources: Resources = {
  silverShields: 200, // Starting with some shields for immediate play
  food: 100,
  wood: 50,
  stone: 0,
  metal: 0,
  petricite: 0,
  valor: 0,
};

const initialMap: MapTile[] = [
  {
    id: 1,
    name: 'Capital City',
    terrain: 'PLAINS',
    isOwned: true,
    building: { type: 'TOWN_CENTER', level: 1, production: { food: 5, wood: 2 } },
    enemyThreat: 0,
    garrison: null,
  },
  {
    id: 2,
    name: 'North Forest',
    terrain: 'FOREST',
    isOwned: false,
    building: null,
    enemyThreat: 10,
    garrison: null,
  },
  {
    id: 3,
    name: 'Iron Peak',
    terrain: 'MOUNTAIN',
    isOwned: false,
    building: null,
    enemyThreat: 25,
    garrison: null,
  },
  {
    id: 4,
    name: 'Whispering Plains',
    terrain: 'PLAINS',
    isOwned: false,
    building: null,
    enemyThreat: 5,
    garrison: null,
  },
  {
    id: 5,
    name: 'Petricite Grove',
    terrain: 'PETRICITE_GROVE',
    isOwned: false,
    building: null,
    enemyThreat: 40,
    garrison: null,
  },
];

const initialUnits: Unit[] = [];
const initialNotifications: string[] = [];

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  resources: initialResources,
  turn: 0,
  map: initialMap,
  units: initialUnits,
  notifications: initialNotifications,

  simulateLoLMatch: (result) => set((state) => {
    let shieldsGained = 0;
    if (result === 'WIN') {
      shieldsGained = 300;
    } else {
      shieldsGained = 150;
    }
    const newShields = Math.min(state.resources.silverShields + shieldsGained, 2000); // Max Cap 2000
    const newNotifications = [`Simulated LoL match: ${result}. Gained ${newShields - state.resources.silverShields} Silver Shields.`];
    return {
      resources: { ...state.resources, silverShields: newShields },
      notifications: [...state.notifications, ...newNotifications].slice(-5), // Keep last 5 notifications
    };
  }),

  endTurn: () => set((state) => {
    // 1. Validation
    if (state.resources.silverShields < 10) {
      // In a real UI, this would be a user-facing message, not an alert.
      // For now, let's add it to notifications and prevent state change.
      return { ...state, notifications: [...state.notifications, 'Not enough Silver Shields to end turn!'].slice(-5) };
    }

    const newNotifications: string[] = [];
    let newResources = { ...state.resources };
    let newMap = [...state.map];
    let newUnits = [...state.units];

    // 2. Consumption: Deduct 10 Silver Shields
    newResources.silverShields -= 10;
    newNotifications.push(`Deducted 10 Silver Shields for ending turn.`);

    // 3. Production: Iterate through all MapTiles
    state.map.forEach(tile => {
      if (tile.isOwned && tile.building) {
        Object.entries(tile.building.production).forEach(([resourceType, amount]) => {
          newResources = {
            ...newResources,
            [resourceType]: (newResources[resourceType as keyof Resources] || 0) + amount,
          };
          newNotifications.push(`Gained ${amount} ${resourceType} from ${tile.name}'s ${tile.building?.type}.`);
        });
      }
    });

    // 4. Upkeep
    const totalFoodUpkeep = newUnits.reduce((sum, unit) => sum + unit.upkeepCost, 0);
    if (totalFoodUpkeep > 0) {
      newResources.food -= totalFoodUpkeep;
      newNotifications.push(`Paid ${totalFoodUpkeep} food for unit upkeep.`);
    }

    if (newResources.food < 0) {
      // Apply Starvation debuff
      newNotifications.push('WARNING: Food shortage! Units are starving (-50% Combat Power).');
      // In a real game, units' combat power would be reduced here.
    }

    // 5. Training
    newUnits = newUnits.map(unit => {
      if (unit.state === 'TRAINING' && unit.turnsToTrain !== undefined && unit.turnsToTrain > 0) {
        const newTurnsToTrain = unit.turnsToTrain - 1;
        if (newTurnsToTrain <= 0) {
          newNotifications.push(`${unit.name} has finished training and is now IDLE!`);
          return { ...unit, state: 'IDLE', turnsToTrain: 0 };
        } else {
          newNotifications.push(`${unit.name} is training (${newTurnsToTrain} turns left).`);
          return { ...unit, turnsToTrain: newTurnsToTrain };
        }
      }
      return unit;
    });

    // 6. Movement (Units not implemented yet)
    // Placeholder for unit movement logic.

    // 7. Threat Check: Random chance (5%) for a MapTile to spawn an enemyThreat
    newMap = newMap.map(tile => {
      if (!tile.isOwned && tile.enemyThreat === 0 && Math.random() < 0.05) {
        newNotifications.push(`A new threat emerged in ${tile.name}!`);
        return { ...tile, enemyThreat: Math.floor(Math.random() * 50) + 10 }; // Random threat between 10 and 60
      }
      return tile;
    });

    // 8. Increment Turn Counter
    const newTurn = state.turn + 1;
    newNotifications.push(`Turn ${newTurn} started.`);


    return {
      resources: newResources,
      map: newMap,
      turn: newTurn,
      units: newUnits, // Ensure units state is updated
      notifications: [...state.notifications, ...newNotifications].slice(-5), // Keep last 5 notifications
    };
  }),

  constructBuilding: (tileId, buildingType) => set((state) => {
    const tileToUpdate = state.map.find(tile => tile.id === tileId);
    if (!tileToUpdate) return state; // Tile not found

    let newNotifications: string[] = [];

    // Check if tile is owned
    if (!tileToUpdate.isOwned) {
      newNotifications.push(`Cannot build on unowned tile: ${tileToUpdate.name}.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    // Check if tile already has a building
    if (tileToUpdate.building) {
      newNotifications.push(`${tileToUpdate.name} already has a building.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const costs = BUILDING_COSTS[buildingType];
    let canAfford = true;
    if (costs) {
      Object.entries(costs).forEach(([resourceType, amount]) => {
        if ((state.resources[resourceType as keyof Resources] || 0) < amount) {
          canAfford = false;
          newNotifications.push(`Not enough ${resourceType} to build ${buildingType}. Needed: ${amount}, Have: ${state.resources[resourceType as keyof Resources] || 0}.`);
        }
      });
    } else {
      canAfford = false;
      newNotifications.push(`Unknown building type: ${buildingType}.`);
    }

    if (!canAfford) {
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    // Deduct Resources
    let newResources = { ...state.resources };
    if (costs) {
      Object.entries(costs).forEach(([resourceType, amount]) => {
        newResources = {
          ...newResources,
          [resourceType]: (newResources[resourceType as keyof Resources] || 0) - amount,
        };
      });
    }

    // Set new building and its production
    const updatedMap = state.map.map(tile =>
      tile.id === tileId
        ? { ...tile, building: { type: buildingType, level: 1, production: BUILDING_PRODUCTION[buildingType] || {} } }
        : tile
    );
    newNotifications.push(`Built ${buildingType} on ${tileToUpdate.name}.`);

    return {
      resources: newResources,
      map: updatedMap,
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),

  attackTile: (unitId, targetTileId) => set((state) => {
    const newNotifications: string[] = [];
    let newResources = { ...state.resources };
    let newMap = [...state.map];
    let newUnits = [...state.units];

    const attackingUnit = state.units.find(unit => unit.id === unitId);
    const targetTile = state.map.find(tile => tile.id === targetTileId);

    if (!attackingUnit || attackingUnit.state !== 'IDLE') {
      newNotifications.push('Attacking unit not found or not idle.');
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }
    if (!targetTile || targetTile.isOwned || targetTile.enemyThreat === 0) {
      newNotifications.push('Cannot attack this tile.');
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const playerPower = attackingUnit.combatPower;
    const enemyPower = targetTile.enemyThreat;
    const randomFactor = Math.floor(Math.random() * 21) - 10; // Random between -10 and +10

    const combatResult = playerPower - enemyPower + randomFactor;

    newNotifications.push(`${attackingUnit.name} (Power: ${playerPower}) attacks ${targetTile.name} (Threat: ${enemyPower}).`);

    if (combatResult >= 0) { // Win
      newNotifications.push(`VICTORY! ${attackingUnit.name} conquered ${targetTile.name}.`);
      newResources.valor += 10; // Gain Valor
      newNotifications.push(`Gained 10 Valor.`);

      newMap = newMap.map(tile =>
        tile.id === targetTileId
          ? { ...tile, isOwned: true, enemyThreat: 0, building: null, garrison: attackingUnit.id } // Set garrison to unit.id
          : tile
      );
      // Move unit to conquered tile and make it idle
      newUnits = newUnits.map(unit =>
        unit.id === attackingUnit.id
          ? { ...unit, locationTileId: targetTileId, state: 'IDLE' }
          : unit
      );
    } else { // Loss
      newNotifications.push(`DEFEAT! ${attackingUnit.name} was defeated at ${targetTile.name}.`);
      // Unit dies (removed from units array)
      newUnits = newUnits.filter(unit => unit.id !== attackingUnit.id);
      newNotifications.push(`${attackingUnit.name} was lost in combat.`);
    }

    return {
      resources: newResources,
      map: newMap,
      units: newUnits,
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),

  trainUnit: (tileId, unitType) => set((state) => {
    const newNotifications: string[] = [];
    const tile = state.map.find(t => t.id === tileId);

    if (!tile || !tile.isOwned) {
      newNotifications.push(`Cannot train units at unowned or non-existent tile ${tileId}.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    // Check for building required for training (e.g., Town Center or Barracks)
    if (!(tile.building?.type === 'TOWN_CENTER' || tile.building?.type === 'BARRACKS')) {
      newNotifications.push(`No suitable building (Town Center or Barracks) at ${tile.name} to train ${unitType}.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const costs = UNIT_COSTS[unitType];
    const trainingTime = UNIT_TRAINING_TIME[unitType];
    const basePower = UNIT_BASE_POWER[unitType];
    const upkeep = UNIT_UPKEEP[unitType];

    let canAfford = true;
    if (costs) {
      Object.entries(costs).forEach(([resourceType, amount]) => {
        if ((state.resources[resourceType as keyof Resources] || 0) < amount) {
          canAfford = false;
          newNotifications.push(`Not enough ${resourceType} to train ${unitType}. Needed: ${amount}, Have: ${state.resources[resourceType as keyof Resources] || 0}.`);
        }
      });
    } else {
      canAfford = false;
      newNotifications.push(`Unknown unit type: ${unitType}.`);
    }

    if (!canAfford) {
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    // Deduct Resources
    let newResources = { ...state.resources };
    if (costs) {
      Object.entries(costs).forEach(([resourceType, amount]) => {
        newResources = {
          ...newResources,
          [resourceType]: (newResources[resourceType as keyof Resources] || 0) - amount,
        };
      });
    }

    const newUnit: Unit = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      type: unitType,
      name: `${unitType} ${state.units.length + 1}`, // Generic name
      combatPower: basePower,
      upkeepCost: upkeep,
      locationTileId: tileId,
      state: 'TRAINING',
      turnsToTrain: trainingTime,
    };

    newNotifications.push(`Started training a ${unitType} at ${tile.name}. Training will take ${trainingTime} turns.`);

    return {
      resources: newResources,
      units: [...state.units, newUnit],
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),
}));
