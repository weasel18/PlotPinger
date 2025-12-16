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
    const newTabId = nextTabId;
    const newTab = {
      id: newTabId,
      title: 'New Target',
      destination: '',
      data: null
    };

    // Use functional updates to ensure consistency
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTabId);
    setNextTabId(prevId => prevId + 1);
  };

  const closeTab = (tabId) => {
    setTabs(prevTabs => {
      if (prevTabs.length === 1) return prevTabs;

      const newTabs = prevTabs.filter(t => t.id !== tabId);

      // Update active tab if we're closing the active one
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }

      return newTabs;
    });
  };

  const updateTab = (tabId, updates) => {
    setTabs(prevTabs => prevTabs.map(t => {
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

  if (!activeTab) {
    return <div className="app">Loading...</div>;
  }

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
