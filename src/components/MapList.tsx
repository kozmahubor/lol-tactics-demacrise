// src/components/MapList.tsx
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import TileRow from './TileRow';

const MapList: React.FC = () => {
  const { map } = useGameStore();

  return (
    <div style={{ border: '1px solid gray', padding: '10px' }}>
      <h3>World Map</h3>
      {map.map((tile) => (
        <TileRow key={tile.id} tile={tile} />
      ))}
    </div>
  );
};

export default MapList;
