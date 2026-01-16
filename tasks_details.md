# Detailed Task Breakdown for Demacia Rising

This document provides a detailed breakdown of the new tasks to be implemented based on the latest requirements.

---

### 1. REWORK: Food System as Unit Capacity

**Objective:** Change the food resource from a per-turn consumable to a permanent unit capacity limit.

**Details:**
-   **Current State:** Food is a resource that is produced by farms and consumed as upkeep by units every turn.
-   **Target State:** Food represents the maximum number of units the player can have. It is increased by building/upgrading Farms. Units "occupy" a food slot for as long as they exist.

**Implementation Steps:**
1.  **Modify State (`useGameStore.ts`):**
    -   The `resources.food` property will now be treated as the `unitCapacity`.
2.  **Modify `endTurn` Action:**
    -   Remove the entire "Upkeep" step. No food should be deducted for units.
    -   Remove the "Starvation" debuff logic as it is no longer relevant.
3.  **Modify `trainUnit` Action:**
    -   Before deducting resource costs, add a new check: `if (state.units.length >= state.resources.food)`.
    -   If the check fails (army is full), add a notification "Cannot train unit: Army capacity is full. Build more Farms to increase capacity." and abort the action.
    -   Update the interpretation of unit costs from `details.txt`: The "1 Food" cost for units like Guards means they take up 1 capacity slot, which is now handled by the check above. Do not deduct food as a resource.
4.  **Verify Farm Production:**
    -   Ensure that when `endTurn` runs, the production from Farms correctly increases the `resources.food` (unit capacity) value. The current production logic should already handle this correctly if we just change our interpretation of what `resources.food` means.

---

### 2. FEATURE: Defensive Events

**Objective:** Implement a system where player villages are periodically attacked by enemies, with a 5-turn warning.

**Details:**
-   An attack will be scheduled to occur on a player-owned village every 10 turns (turn 10, 20, 30, etc.).
-   The player will be notified of the impending attack 5 turns in advance (at turn 5, 15, 25, etc.).

**Implementation Steps:**
1.  **Update State (`useGameStore.ts`):**
    -   Add a new property to the state to manage these events:
        ```typescript
        interface ScheduledAttack {
          targetTileId: number;
          attackTurn: number;
          threatLevel: number;
        }
        scheduledAttacks: ScheduledAttack[];
        ```
2.  **Modify `endTurn` Action:**
    -   **Event Scheduling:**
        -   Add a check at the start of the action: `if ((state.turn + 5) % 10 === 0 && state.turn > 0)`.
        -   Inside this check:
            -   Get a list of all `owned` tiles.
            -   Select one random owned tile to be the target.
            -   Generate a random `threatLevel` for the attack.
            -   Add a new `ScheduledAttack` object to the `scheduledAttacks` array in the state.
            -   Add a notification: `A threat is gathering near [Village Name]! An attack is expected in 5 turns on turn ${state.turn + 5}.`
    -   **Event Resolution:**
        -   Add a new step in the `endTurn` sequence.
        -   Find any `scheduledAttacks` where `attackTurn` matches the `newTurn`.
        -   For each triggered attack:
            -   Identify defending units (all player units at `targetTileId`).
            -   Calculate total defender power.
            -   Resolve combat against the `threatLevel`.
            -   If players win, remove the scheduled attack and add a "Victory" notification.
            -   If players lose, the tile becomes unowned (`isOwned: false`), buildings are destroyed (`building: null`), and a "Defeat" notification is shown. Remove player units that were at the tile.

---

### 3. FEATURE: Unit Movement

**Objective:** Allow players to move units between their owned villages, with travel taking one turn.

**Implementation Steps:**
1.  **Update Unit Type (`src/types/game.ts`):**
    -   Modify the `Unit` interface to support movement. The `state` already includes `'MOVING'`. We might need a `destinationTileId`.
        ```typescript
        interface Unit {
          // ... existing properties
          state: 'IDLE' | 'MOVING' | 'TRAINING';
          destinationTileId?: number; // Optional, only for moving units
        }
        ```
2.  **Create `moveUnit` Action (`useGameStore.ts`):**
    -   Define a new action: `moveUnit: (unitId: string, targetTileId: number) => void`.
    -   **Logic:**
        -   Find the unit by `unitId`.
        -   Check if the `targetTileId` corresponds to an owned tile.
        -   Check that `targetTileId` is not the unit's current `locationTileId`.
        -   If checks pass, update the unit's state: `state: 'MOVING'`, `destinationTileId: targetTileId`.
        -   Add a notification: `[Unit Name] is now moving to [Target Tile Name]. It will arrive next turn.`
3.  **Modify `endTurn` Action:**
    -   In the "Movement" step (currently a placeholder):
        -   Iterate through all units.
        -   If a unit has `state === 'MOVING'` and a `destinationTileId`:
            -   Update `locationTileId` to `destinationTileId`.
            -   Reset state to `'IDLE'`.
            -   Remove `destinationTileId`.
            -   Add a notification: `[Unit Name] has arrived at [New Tile Name].`
4.  **Update UI (`TileRow.tsx`):**
    -   Add a "Move" button next to each unit listed under a tile.
    -   Clicking "Move" could open a dropdown/modal showing other owned tiles to move to.
    -   This UI part can be simple for now; the core logic is the priority.

---

### 4. BUGFIX: Correct `garrison` type

**Objective:** Fix the type mismatch for the `garrison` property on `MapTile`.

**Implementation Steps:**
1.  **Edit `src/types/game.ts`:**
    -   Change the `MapTile` interface:
        ```typescript
        // From
        garrison: number | null;
        // To
        garrison: string | null;
        ```
    - This will align it with the `Unit.id` which is a `string`.

---

### 5. BUGFIX: Fix Combat Initiation Logic

**Objective:** Fix the UI logic that currently makes it impossible to attack an enemy tile.

**Implementation Steps:**
1.  **Edit `TileRow.tsx`:**
    -   Locate the `availableUnitsForAttack` constant.
    -   **Change the filter logic:** Instead of filtering for units *on the target tile*, filter for all idle units the player owns, regardless of location.
        ```typescript
        // From
        const availableUnitsForAttack = units.filter(unit =>
          unit.state === 'IDLE' && unit.locationTileId === tile.id
        );
        // To (simple MVP fix)
        const availableUnitsForAttack = units.filter(unit => unit.state === 'IDLE');
        ```
    -   This will allow the attack UI (dropdown and button) to appear on enemy tiles, as long as the player has at least one idle unit anywhere. The `attackTile` action already handles moving the unit to the conquered tile on victory.
