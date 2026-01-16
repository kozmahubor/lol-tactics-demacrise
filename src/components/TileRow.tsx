// src/components/TileRow.tsx
import React from 'react';
import type { MapTile, Building, Unit } from '../types/game';
import { useGameStore } from '../store/useGameStore';

interface TileRowProps {
  tile: MapTile;
}

const TileRow: React.FC<TileRowProps> = ({ tile }) => {
  const { constructBuilding, attackTile, trainUnit, moveUnit, units, map } = useGameStore();

  const [selectedUnitForAttack, setSelectedUnitForAttack] = React.useState<string | null>(null);
  const [unitToMove, setUnitToMove] = React.useState<{ unitId: string, destinationId: number | null } | null>(null);

  // MVP Fix: Allow any idle unit to attack, regardless of location.
  const availableUnitsForAttack = units.filter(unit => unit.state === 'IDLE');
  const unitsOnThisTile = units.filter(unit => unit.locationTileId === tile.id);
  const otherOwnedTiles = map.filter(m => m.isOwned && m.id !== tile.id);


  const handleBuild = (buildingType: Building['type']) => {
    constructBuilding(tile.id, buildingType);
  };

  const handleAttack = () => {
    if (selectedUnitForAttack) {
      attackTile(selectedUnitForAttack, tile.id);
      setSelectedUnitForAttack(null); // Reset selection after attack
    } else {
      alert('Please select a unit to attack with!');
    }
  };

  const handleTrain = (unitType: Unit['type']) => {
    trainUnit(tile.id, unitType);
  };

  const handleConfirmMove = () => {
    if(unitToMove && unitToMove.destinationId) {
        moveUnit(unitToMove.unitId, unitToMove.destinationId);
        setUnitToMove(null); // Reset after confirming
    }
  }

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
      {tile.garrison && <p>[Garrison: {tile.garrison}]</p>}

      {/* Action Buttons */}
      <div style={{ marginTop: '5px' }}>
        {/* Build buttons */}
        {!tile.building && tile.isOwned && tile.id !== 1 && (
          <div style={{ marginBottom: '5px' }}>
            <button onClick={() => handleBuild('FARM')} style={{ marginRight: '5px' }}>
              [BUILD FARM]
            </button>
            <button onClick={() => handleBuild('LUMBERMILL')} style={{ marginRight: '5px' }}>
              [BUILD LUMBERMILL]
            </button>
          </div>
        )}

        {/* Train Units buttons */}
        {tile.isOwned && (tile.building?.type === 'TOWN_CENTER' || tile.building?.type === 'BARRACKS') && (
          <div style={{ marginBottom: '5px' }}>
            <button onClick={() => handleTrain('SOLDIER')} style={{ marginRight: '5px' }}>
              [TRAIN SOLDIER]
            </button>
          </div>
        )}

        {/* Attack button */}
        {!tile.isOwned && tile.enemyThreat > 0 && availableUnitsForAttack.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <select
              onChange={(e) => setSelectedUnitForAttack(e.target.value)}
              value={selectedUnitForAttack || ''}
              style={{ marginRight: '5px', padding: '5px' }}
            >
              <option value="">Select Unit to Attack</option>
              {availableUnitsForAttack.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} @ {map.find(t=>t.id === unit.locationTileId)?.name} (Pwr: {unit.combatPower})
                </option>
              ))}
            </select>
            <button onClick={handleAttack} disabled={!selectedUnitForAttack}>
              [ATTACK]
            </button>
          </div>
        )}
      </div>

      {/* Display Units at this tile */}
      {tile.isOwned && unitsOnThisTile.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px dotted lightgray', paddingTop: '5px' }}>
          <strong>Units at {tile.name}:</strong>
          <ul>
            {unitsOnThisTile.map(unit => (
              <li key={unit.id} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span>
                    {unit.name} ({unit.type}) - Pwr: {unit.combatPower} - State: {unit.state}
                    {unit.state === 'TRAINING' && unit.turnsToTrain !== undefined && ` (${unit.turnsToTrain} turns left)`}
                </span>

                {/* Move UI */}
                {unit.state === 'IDLE' && otherOwnedTiles.length > 0 && (
                    unitToMove?.unitId === unit.id ? (
                        <>
                            <select 
                                onChange={e => setUnitToMove({ ...unitToMove, destinationId: Number(e.target.value)})}
                                value={unitToMove.destinationId || ''}
                            >
                                <option value="">Select Destination</option>
                                {otherOwnedTiles.map(dest => <option key={dest.id} value={dest.id}>{dest.name}</option>)}
                            </select>
                            <button onClick={handleConfirmMove} disabled={!unitToMove.destinationId}>Confirm Move</button>
                            <button onClick={() => setUnitToMove(null)}>Cancel</button>
                        </>
                    ) : (
                        <button onClick={() => setUnitToMove({ unitId: unit.id, destinationId: null })}>Move</button>
                    )
                )}

              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TileRow;
