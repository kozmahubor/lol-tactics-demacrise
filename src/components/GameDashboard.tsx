// src/components/GameDashboard.tsx
import React from 'react';
import { useGameStore } from '../store/useGameStore';

const GameDashboard: React.FC = () => {
  const { resources, turn, notifications, units, simulateLoLMatch, endTurn } = useGameStore();

  return (
    <div style={{ border: '1px solid gray', padding: '10px', marginBottom: '20px' }}>
      {/* Zone A: The Dashboard (Top) */}
      <div style={{ marginBottom: '10px' }}>
        <p><strong>[TURN: {turn}]</strong> | <strong>[SHIELDS: {resources.silverShields}]</strong></p>
        <p>
          <strong>ARMY: {units.length} / {resources.food}</strong> | WOOD: {resources.wood} | STONE: {resources.stone} | METAL: {resources.metal} | PETRICITE: {resources.petricite} | VALOR: {resources.valor}
        </p>
        <div style={{ borderTop: '1px solid lightgray', paddingTop: '5px', marginTop: '5px' }}>
          <strong>NOTIFICATIONS:</strong>
          {notifications.length > 0 ? (
            <ul>
              {notifications.map((msg, index) => (
                <li key={index}>{msg}</li>
              ))}
            </ul>
          ) : (
            <p>No new notifications.</p>
          )}
        </div>
      </div>

      {/* Zone B: The Controls (Middle) */}
      <div style={{ borderTop: '1px solid gray', paddingTop: '10px' }}>
        <button onClick={() => simulateLoLMatch('WIN')} style={{ marginRight: '10px' }}>
          [MOCK: Win LoL Game]
        </button>
        <button onClick={() => endTurn()}>
          [ACTION: End Turn (-10 Shields)]
        </button>
      </div>
    </div>
  );
};

export default GameDashboard;
