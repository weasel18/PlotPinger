import React, { useState } from 'react';
import MiniGraph from './MiniGraph';

function TracerouteTable({ tab, onUpdateTab }) {
  const [selectedHop, setSelectedHop] = useState(null);

  if (!tab.data) {
    return (
      <div className="empty-state">
        Enter a destination and click Start to begin
      </div>
    );
  }

  if (tab.data.traceroute?.loading) {
    return <div className="loading">Running traceroute...</div>;
  }

  const hops = tab.data.traceroute?.hops || [];

  if (hops.length === 0) {
    return (
      <div className="empty-state">
        No route data available
      </div>
    );
  }

  const handleRowDoubleClick = (hop) => {
    setSelectedHop(hop.hop);
    // Update tab to show this hop in main graph
    onUpdateTab(tab.id, {
      data: {
        ...tab.data,
        selectedHop: hop
      }
    });
  };

  return (
    <table className="traceroute-table">
      <thead>
        <tr>
          <th style={{ width: '50px' }}>Hop</th>
          <th style={{ width: '150px' }}>IP Address</th>
          <th style={{ width: '200px' }}>Hostname</th>
          <th style={{ width: '80px' }}>Current</th>
          <th style={{ width: '80px' }}>Avg</th>
          <th style={{ width: '80px' }}>Min</th>
          <th style={{ width: '80px' }}>Max</th>
          <th style={{ width: '80px' }}>Loss %</th>
          <th style={{ width: '180px' }}>Graph</th>
        </tr>
      </thead>
      <tbody>
        {hops.map(hop => (
          <tr
            key={hop.hop}
            className={selectedHop === hop.hop ? 'selected' : ''}
            onDoubleClick={() => handleRowDoubleClick(hop)}
            style={{ cursor: 'pointer' }}
          >
            <td>{hop.hop}</td>
            <td>{hop.ip || '*'}</td>
            <td style={{ fontSize: '11px', color: '#aaa' }}>
              {hop.hostname || '-'}
            </td>
            <td>{hop.current !== null ? `${hop.current.toFixed(2)} ms` : '-'}</td>
            <td>{hop.avg > 0 ? `${hop.avg.toFixed(2)} ms` : '-'}</td>
            <td>{hop.min < Infinity ? `${hop.min.toFixed(2)} ms` : '-'}</td>
            <td>{hop.max > 0 ? `${hop.max.toFixed(2)} ms` : '-'}</td>
            <td style={{ color: hop.loss > 0 ? '#ff6b6b' : '#51cf66' }}>
              {hop.loss.toFixed(2)}%
            </td>
            <td>
              <div className="hop-graph">
                {hop.pings && hop.pings.length > 0 ? (
                  <MiniGraph
                    pings={hop.pings}
                    min={hop.min}
                    max={hop.max}
                    avg={hop.avg}
                  />
                ) : (
                  <div style={{ fontSize: '10px', color: '#666' }}>No data</div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TracerouteTable;
