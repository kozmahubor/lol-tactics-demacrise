// src/components/TileRow.tsx
import React from 'react';
import type { MapTile, Building, Unit } from '../types/game';
import { useGameStore } from '../store/useGameStore';

interface TileRowProps {
  tile: MapTile;
}

const TileRow: React.FC<TileRowProps> = ({ tile }) => {
  const { constructBuilding, attackTile, trainUnit, units } = useGameStore();

  const [selectedUnitForAttack, setSelectedUnitForAttack] = React.useState<string | null>(null);

  const availableUnitsForAttack = units.filter(unit =>
    unit.state === 'IDLE' && unit.locationTileId === tile.id
  );

  const handleBuild = (buildingType: Building['type']) => {
    constructBuilding(tile.id, buildingType);
  };

  const handleAttack = () => {
    if (selectedUnitForAttack) {
      attackTile(selectedUnitForAttack, tile.id);
      setSelectedUnitForAttack(null); // Reset selection after attack
    } else {
      // If no specific unit selected, try to find one
      const unitToAttackWith = units.find(unit => unit.state === 'IDLE' && unit.locationTileId === tile.id);
      if (unitToAttackWith) {
        attackTile(unitToAttackWith.id, tile.id);
      } else {
        alert('No idle units at this tile to attack with!');
      }
    }
  };

  const handleTrain = (unitType: Unit['type']) => {
    trainUnit(tile.id, unitType);
  };

  return (
    <div style={{ border: '1px solid lightgray', padding: '8px', margin: '5px 0' }}>
      <p>
        <strong>[ID: {tile.id}]</strong> [Name: {tile.name}] [Owner: {tile.isOwned ? 'YOU' : 'ENEMY'}]
        [Terrain: {tile.terrain}]
      </p>
      {tile.building ? (
        <p>[Building: {tile.building.type} (Lvl {tile.building.level})] (Prod: {JSON.stringify(tile.building.production)})</p>
      ) : (
        tile.isOwned && <p>[Building: NONE]</p>
      )}
      {tile.enemyThreat > 0 && <p>[Threat: {tile.enemyThreat}]</p>}
      {tile.garrison && <p>[Garrison: {tile.garrison}]</p>} {/* Placeholder for garrison name/ID */}

      {/* Action Buttons */}
      <div style={{ marginTop: '5px' }}>
        {/* Build buttons */}
        {!tile.building && tile.isOwned && tile.id !== 1 && ( // Can't build on capital (id:1) or if already built
          <div style={{ marginBottom: '5px' }}>
            <button onClick={() => handleBuild('FARM')} style={{ marginRight: '5px' }}>
              [BUILD FARM (50 Wood)]
            </button>
            <button onClick={() => handleBuild('LUMBERMILL')} style={{ marginRight: '5px' }}>
              [BUILD LUMBERMILL (75 Wood)]
            </button>
            <button onClick={() => handleBuild('QUARRY')} style={{ marginRight: '5px' }}>
              [BUILD QUARRY (100 Wood)]
            </button>
            <button onClick={() => handleBuild('BARRACKS')} style={{ marginRight: '5px' }}>
              [BUILD BARRACKS (150 Wood, 50 Stone)]
            </button>
          </div>
        )}

        {/* Train Units buttons */}
        {tile.isOwned && (tile.building?.type === 'TOWN_CENTER' || tile.building?.type === 'BARRACKS') && (
          <div style={{ marginBottom: '5px' }}>
            <button onClick={() => handleTrain('SOLDIER')} style={{ marginRight: '5px' }}>
              [TRAIN SOLDIER]
            </button>
            <button onClick={() => handleTrain('RANGER')} style={{ marginRight: '5px' }}>
              [TRAIN RANGER]
            </button>
            <button onClick={() => handleTrain('CHAMPION')} style={{ marginRight: '5px' }}>
              [TRAIN CHAMPION]
            </button>
          </div>
        )}

        {/* Attack button */}
        {!tile.isOwned && tile.enemyThreat > 0 && availableUnitsForAttack.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              onChange={(e) => setSelectedUnitForAttack(e.target.value)}
              value={selectedUnitForAttack || ''}
              style={{ marginRight: '5px', padding: '5px' }}
            >
              <option value="">Select Unit to Attack</option>
              {availableUnitsForAttack.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} (Power: {unit.combatPower})
                </option>
              ))}
            </select>
            <button onClick={handleAttack} disabled={!selectedUnitForAttack}>
              [ATTACK with {selectedUnitForAttack ? units.find(u => u.id === selectedUnitForAttack)?.name : 'Selected Unit'}]
            </button>
          </div>
        )}
      </div>
      {/* Display Units at this tile */}
      {tile.isOwned && units.filter(unit => unit.locationTileId === tile.id).length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px dotted lightgray', paddingTop: '5px' }}>
          <strong>Units at {tile.name}:</strong>
          <ul>
            {units.filter(unit => unit.locationTileId === tile.id).map(unit => (
              <li key={unit.id}>
                {unit.name} ({unit.type}) - Power: {unit.combatPower} - State: {unit.state}
                {unit.state === 'TRAINING' && unit.turnsToTrain !== undefined && ` (${unit.turnsToTrain} turns left)`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TileRow;
