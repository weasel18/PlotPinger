import React, { useState, useEffect } from 'react';
import { startMonitoring, stopMonitoring } from '../services/networkService';

function ControlPanel({ tab, onUpdateTab, history, onAddToHistory }) {
  const [destination, setDestination] = useState('');
  const [interval, setInterval] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (tab) {
      setDestination(tab.destination || '');
      setIsRunning(!!tab.data?.isRunning);
    }
  }, [tab]);

  const handleStart = async () => {
    if (!destination.trim()) return;

    onAddToHistory(destination.trim());
    onUpdateTab(tab.id, {
      destination: destination.trim(),
      title: destination.trim(),
      data: {
        isRunning: true,
        traceroute: { hops: [], loading: true },
        pings: [],
        interval
      }
    });

    setIsRunning(true);

    // Start the monitoring
    startMonitoring(
      tab.id,
      destination.trim(),
      interval,
      (update) => {
        // Update tab data - App.jsx will handle deep merging
        onUpdateTab(tab.id, { data: update });
      }
    );
  };

  const handleStop = () => {
    stopMonitoring(tab.id);
    onUpdateTab(tab.id, {
      data: {
        ...tab.data,
        isRunning: false
      }
    });
    setIsRunning(false);
  };

  return (
    <div className="control-panel">
      <div className="control-group">
        <label>Target:</label>
        <input
          type="text"
          className="destination-input"
          list="history-list"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isRunning && handleStart()}
          placeholder="Enter IP or hostname"
          disabled={isRunning}
        />
        <datalist id="history-list">
          {history.map((item, index) => (
            <option key={index} value={item} />
          ))}
        </datalist>
      </div>

      <div className="control-group">
        <label>Interval:</label>
        <select
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          disabled={isRunning}
        >
          <option value={500}>0.5s</option>
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
        </select>
      </div>

      <div className="control-group">
        {!isRunning ? (
          <button onClick={handleStart} disabled={!destination.trim()}>
            Start
          </button>
        ) : (
          <button onClick={handleStop}>Stop</button>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;
