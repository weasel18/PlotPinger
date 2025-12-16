import React from 'react';

function Tabs({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }) {
  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="tab-title" title={tab.title}>
            {tab.title}
          </span>
          {tabs.length > 1 && (
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              ✕
            </span>
          )}
        </div>
      ))}
      <button className="tab-new" onClick={onNewTab}>+</button>
    </div>
  );
}

export default Tabs;
