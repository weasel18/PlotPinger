import React, { useState, useEffect } from 'react';
import Tabs from './components/Tabs';
import ControlPanel from './components/ControlPanel';
import TracerouteTable from './components/TracerouteTable';
import PingGraph from './components/PingGraph';
import Resizer from './components/Resizer';

function App() {
  const [tabs, setTabs] = useState([{ id: 1, title: 'New Target', destination: '', data: null }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [tracerouteHeight, setTracerouteHeight] = useState(60); // percentage
  const [history, setHistory] = useState([]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    // Load history from localStorage
    const saved = localStorage.getItem('plotpinger-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  const addTab = () => {
    const newTab = {
      id: nextTabId,
      title: 'New Target',
      destination: '',
      data: null
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId(nextTabId + 1);
  };

  const closeTab = (tabId) => {
    if (tabs.length === 1) return;

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const updateTab = (tabId, updates) => {
    setTabs(tabs.map(t => {
      if (t.id === tabId) {
        // Deep merge the data object if it exists in updates
        if (updates.data && t.data) {
          return { ...t, ...updates, data: { ...t.data, ...updates.data } };
        }
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const addToHistory = (destination) => {
    if (!destination) return;

    const newHistory = [destination, ...history.filter(h => h !== destination)].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('plotpinger-history', JSON.stringify(newHistory));
  };

  return (
    <div className="app">
      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={addTab}
      />

      <ControlPanel
        tab={activeTab}
        onUpdateTab={updateTab}
        history={history}
        onAddToHistory={addToHistory}
      />

      <div className="content-area" style={{ height: 'calc(100vh - 100px)' }}>
        <div
          className="traceroute-section"
          style={{ height: `${tracerouteHeight}%` }}
        >
          <TracerouteTable tab={activeTab} onUpdateTab={updateTab} />
        </div>

        <Resizer
          onResize={(delta) => {
            const newHeight = Math.min(90, Math.max(10, tracerouteHeight + delta));
            setTracerouteHeight(newHeight);
          }}
        />

        <div
          className="ping-graph-section"
          style={{ height: `${100 - tracerouteHeight}%` }}
        >
          <PingGraph tab={activeTab} />
        </div>
      </div>
    </div>
  );
}

export default App;
