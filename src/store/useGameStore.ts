
// src/store/useGameStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Resources, MapTile, Building, Unit, ScheduledAttack } from '../types/game';
import { BUILDING_COSTS, BUILDING_PRODUCTION } from '../constants/buildings';
import { UNIT_COSTS, UNIT_TRAINING_TIME, UNIT_BASE_POWER, UNIT_UPKEEP } from '../constants/units';
import { writeTextFile, BaseDirectory } from '@tauri-apps/api/fs';


interface GameState {
  resources: Resources;
  turn: number;
  map: MapTile[];
  units: Unit[];
  notifications: string[];
  scheduledAttacks: ScheduledAttack[];
}

interface GameActions {
  // Meta-Game Loop
  simulateLoLMatch: (result: 'WIN' | 'LOSS') => void;

  // Turn System
  endTurn: () => void;

  // Construction System
  constructBuilding: (tileId: number, buildingType: Building['type']) => void;

  // Unit & Combat
  attackTile: (unitId: string, targetTileId: number) => void;
  trainUnit: (tileId: number, unitType: Unit['type']) => void;
  moveUnit: (unitId: string, targetTileId: number) => void;
}

const initialResources: Resources = {
  silverShields: 200,
  food: 5, // Start with a capacity for 5 units
  wood: 150,
  stone: 50,
  metal: 0,
  petricite: 0,
  valor: 0,
};

const initialMap: MapTile[] = [
  {
    id: 1,
    name: 'Capital City (Zeffira)',
    terrain: 'PLAINS',
    isOwned: true,
    building: { type: 'TOWN_CENTER', level: 1, production: { food: 1, wood: 2 } }, // Produces 1 food capacity
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
const initialScheduledAttacks: ScheduledAttack[] = [];

type GameStore = GameState & GameActions;

// Helper function to append to the log file
const appendToLog = async (content: string) => {
  // This is a placeholder for file system interaction.
  // In a real Tauri/Electron app, you'd use the fs API.
  console.log("--- LOG ---\n" + content + "\n--- END LOG ---");
  // Example for Tauri:
  // await writeTextFile('turn_log.txt', content, { dir: BaseDirectory.App, append: true });
};


export const useGameStore = create<GameStore>((set, get) => ({
  resources: initialResources,
  turn: 0,
  map: initialMap,
  units: initialUnits,
  notifications: initialNotifications,
  scheduledAttacks: initialScheduledAttacks,

  simulateLoLMatch: (result) => set((state) => {
    let shieldsGained = 0;
    if (result === 'WIN') {
      shieldsGained = 300;
    } else {
      shieldsGained = 150;
    }
    const newShields = Math.min(state.resources.silverShields + shieldsGained, 2000);
    const newNotifications = [`Simulated LoL match: ${result}. Gained ${newShields - state.resources.silverShields} Silver Shields.`];
    return {
      resources: { ...state.resources, silverShields: newShields },
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),

  endTurn: () => {
    const state = get();
    if (state.resources.silverShields < 10) {
      set({ notifications: [...state.notifications, 'Not enough Silver Shields to end turn!'].slice(-5) });
      return;
    }

    const turnLog: string[] = [];
    let newResources = { ...state.resources };
    let newMap = [...state.map];
    let newUnits = [...state.units];
    let newScheduledAttacks = [...state.scheduledAttacks];

    newResources.silverShields -= 10;
    turnLog.push(`Turn ${state.turn + 1} begins. 10 Silver Shields spent.`);

    // --- Production ---
    state.map.forEach(tile => {
      if (tile.isOwned && tile.building) {
        Object.entries(tile.building.production).forEach(([resourceType, amount]) => {
          newResources = {
            ...newResources,
            [resourceType]: (newResources[resourceType as keyof Resources] || 0) + amount,
          };
          turnLog.push(`+${amount} ${resourceType} from ${tile.name}'s ${tile.building?.type}.`);
        });
      }
    });

    // --- Training ---
    newUnits = newUnits.map(unit => {
      if (unit.state === 'TRAINING' && unit.turnsToTrain !== undefined && unit.turnsToTrain > 0) {
        const newTurnsToTrain = unit.turnsToTrain - 1;
        if (newTurnsToTrain <= 0) {
          turnLog.push(`${unit.name} finished training at ${state.map.find(t => t.id === unit.locationTileId)?.name}.`);
          return { ...unit, state: 'IDLE', turnsToTrain: 0 };
        } else {
          return { ...unit, turnsToTrain: newTurnsToTrain };
        }
      }
      return unit;
    });

    // --- Movement ---
    newUnits = newUnits.map(unit => {
        if (unit.state === 'MOVING' && unit.destinationTileId) {
            const destinationName = state.map.find(t => t.id === unit.destinationTileId)?.name || 'Unknown';
            turnLog.push(`${unit.name} arrived at ${destinationName}.`);
            return { ...unit, state: 'IDLE', locationTileId: unit.destinationTileId, destinationTileId: undefined };
        }
        return unit;
    });

    // --- Defensive Event Scheduling ---
    if ((state.turn + 6) % 10 === 0 && state.turn >= 0) {
        const ownedTiles = state.map.filter(t => t.isOwned);
        if (ownedTiles.length > 0) {
            const targetTile = ownedTiles[Math.floor(Math.random() * ownedTiles.length)];
            const newAttack: ScheduledAttack = {
                targetTileId: targetTile.id,
                attackTurn: state.turn + 5,
                threatLevel: 15 + (state.turn * 2), // Threat scales with game progress
            };
            newScheduledAttacks.push(newAttack);
            turnLog.push(`[WARNING] A threat is gathering near ${targetTile.name}! An attack is expected on turn ${newAttack.attackTurn}.`);
        }
    }

    // --- Defensive Event Resolution ---
    const attacksThisTurn = newScheduledAttacks.filter(atk => atk.attackTurn === state.turn + 1);
    if (attacksThisTurn.length > 0) {
        attacksThisTurn.forEach(attack => {
            const targetTile = newMap.find(t => t.id === attack.targetTileId);
            if(targetTile && targetTile.isOwned) {
                const defendingUnits = newUnits.filter(u => u.locationTileId === attack.targetTileId);
                const totalDefensePower = defendingUnits.reduce((sum, unit) => sum + unit.combatPower, 0);

                turnLog.push(`[COMBAT] ${targetTile.name} is under attack! (Threat: ${attack.threatLevel} vs. Defense: ${totalDefensePower})`);

                if(totalDefensePower >= attack.threatLevel) {
                    turnLog.push(`[VICTORY] The attack on ${targetTile.name} was repelled!`);
                    newResources.valor += 5;
                    turnLog.push(`+5 Valor for the successful defense.`);
                } else {
                    turnLog.push(`[DEFEAT] ${targetTile.name} has been overrun! The tile is lost.`);
                    newMap = newMap.map(t => t.id === attack.targetTileId ? {...t, isOwned: false, building: null, garrison: null} : t);
                    newUnits = newUnits.filter(u => u.locationTileId !== attack.targetTileId); // Defeated units are lost
                }
            }
        });
        newScheduledAttacks = newScheduledAttacks.filter(atk => atk.attackTurn !== state.turn + 1);
    }
    
    // --- Log to File ---
    const logContent = `\n--- Turn ${state.turn + 1} Report ---\n` + turnLog.join('\n') + '\n';
    // This action is async, but we won't wait for it to complete to keep the UI snappy.
    // In a real tauri app, this would be: appendToLog(logContent);
    // For now, we'll just console log it.
    console.log(logContent);

    set({
      resources: newResources,
      map: newMap,
      turn: state.turn + 1,
      units: newUnits,
      scheduledAttacks: newScheduledAttacks,
      notifications: [...state.notifications, ...turnLog].slice(-10),
    });
  },

  constructBuilding: (tileId, buildingType) => set((state) => {
    const tileToUpdate = state.map.find(tile => tile.id === tileId);
    if (!tileToUpdate) return state; 

    let newNotifications: string[] = [];

    if (!tileToUpdate.isOwned) {
      newNotifications.push(`Cannot build on unowned tile: ${tileToUpdate.name}.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    if (tileToUpdate.building) {
      newNotifications.push(`${tileToUpdate.name} already has a building.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const costs = BUILDING_COSTS[buildingType];
    let canAfford = true;
    if (costs) {
      for (const [resourceType, amount] of Object.entries(costs)) {
        if ((state.resources[resourceType as keyof Resources] || 0) < amount) {
          canAfford = false;
          newNotifications.push(`Not enough ${resourceType} to build ${buildingType}.`);
          break;
        }
      }
    } else {
      canAfford = false;
      newNotifications.push(`Unknown building type: ${buildingType}.`);
    }

    if (!canAfford) {
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    let newResources = { ...state.resources };
    if(costs) {
        for (const [resourceType, amount] of Object.entries(costs)) {
            newResources = {
                ...newResources,
                [resourceType]: (newResources[resourceType as keyof Resources] || 0) - amount,
            };
        }
    }

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
    
    newNotifications.push(`${attackingUnit.name} (Power: ${playerPower}) attacks ${targetTile.name} (Threat: ${enemyPower}).`);

    if (playerPower >= enemyPower) { // Win
      newNotifications.push(`VICTORY! ${attackingUnit.name} conquered ${targetTile.name}.`);
      newResources.valor += 10;
      newNotifications.push(`Gained 10 Valor.`);

      newMap = newMap.map(tile =>
        tile.id === targetTileId
          ? { ...tile, isOwned: true, enemyThreat: 0, building: null, garrison: attackingUnit.id }
          : tile
      );
      
      newUnits = newUnits.map(unit =>
        unit.id === attackingUnit.id
          ? { ...unit, locationTileId: targetTileId, state: 'IDLE' }
          : unit
      );
    } else { // Loss
      newNotifications.push(`DEFEAT! ${attackingUnit.name} was defeated at ${targetTile.name}.`);
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

    if (!tile || !tile.isOwned || !(tile.building?.type === 'TOWN_CENTER' || tile.building?.type === 'BARRACKS')) {
      newNotifications.push(`Cannot train units at ${tile?.name || 'this location'}.`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    if (state.units.length >= state.resources.food) {
      newNotifications.push(`Cannot train unit: Army capacity is full (${state.units.length}/${state.resources.food}).`);
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const costs = UNIT_COSTS[unitType];
    const trainingTime = UNIT_TRAINING_TIME[unitType];
    const basePower = UNIT_BASE_POWER[unitType];
    const upkeep = UNIT_UPKEEP[unitType];

    let canAfford = true;
    let newResources = { ...state.resources };

    if (costs) {
      for (const [resourceType, amount] of Object.entries(costs)) {
        if (resourceType === 'food') continue;
        if ((newResources[resourceType as keyof Resources] || 0) < amount) {
          canAfford = false;
          newNotifications.push(`Not enough ${resourceType} to train ${unitType}.`);
          break;
        }
        newResources[resourceType as keyof Resources] -= amount;
      }
    }

    if (!canAfford) {
      return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const newUnit: Unit = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: unitType,
      name: `${unitType} #${state.units.filter(u => u.type === unitType).length + 1}`,
      combatPower: basePower,
      upkeepCost: upkeep,
      locationTileId: tileId,
      state: 'TRAINING',
      turnsToTrain: trainingTime,
    };

    newNotifications.push(`Started training a ${unitType} at ${tile.name}. It will be ready in ${trainingTime} turns.`);

    return {
      resources: newResources,
      units: [...state.units, newUnit],
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),

  moveUnit: (unitId, targetTileId) => set((state) => {
    const newNotifications: string[] = [];
    const unit = state.units.find(u => u.id === unitId);
    const targetTile = state.map.find(t => t.id === targetTileId);

    if (!unit || unit.state !== 'IDLE' || !targetTile || !targetTile.isOwned || unit.locationTileId === targetTileId) {
        newNotifications.push('Invalid move: Unit must be idle and move to a different, owned tile.');
        return { ...state, notifications: [...state.notifications, ...newNotifications].slice(-5) };
    }

    const updatedUnits = state.units.map(u => 
        u.id === unitId 
        ? { ...u, state: 'MOVING' as 'MOVING', destinationTileId: targetTileId } 
        : u
    );

    newNotifications.push(`${unit.name} is moving to ${targetTile.name}. Arrival next turn.`);
    
    return {
      units: updatedUnits,
      notifications: [...state.notifications, ...newNotifications].slice(-5),
    };
  }),
}));
