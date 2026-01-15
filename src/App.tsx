// src/App.tsx
import React from 'react';
import GameDashboard from './components/GameDashboard';
import MapList from './components/MapList';
import './App.css'; // Keep existing CSS if any

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Demacia Rising - Text Protocol (MVP)</h1>
      <GameDashboard />
      <MapList />
    </div>
  );
}

export default App;