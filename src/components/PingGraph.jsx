import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TIME_RANGES = [
  { label: '30sec', value: 30 * 1000 },
  { label: '1min', value: 60 * 1000 },
  { label: '5min', value: 5 * 60 * 1000 },
  { label: '10min', value: 10 * 60 * 1000 },
  { label: '30min', value: 30 * 60 * 1000 },
  { label: '1hr', value: 60 * 60 * 1000 },
  { label: '2hr', value: 2 * 60 * 60 * 1000 },
  { label: '6hr', value: 6 * 60 * 60 * 1000 },
  { label: '12hr', value: 12 * 60 * 60 * 1000 },
  { label: '24hr', value: 24 * 60 * 60 * 1000 },
  { label: '48hr', value: 48 * 60 * 60 * 1000 },
  { label: '1wk', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '2wk', value: 14 * 24 * 60 * 60 * 1000 },
  { label: '1mo', value: 30 * 24 * 60 * 60 * 1000 }
];

function PingGraph({ tab }) {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0].value);
  const [selectedRouteChange, setSelectedRouteChange] = useState(null);

  const chartData = useMemo(() => {
    if (!tab.data) return [];

    const selectedHop = tab.data.selectedHop;
    const pings = selectedHop ? selectedHop.pings : tab.data.pings || [];

    const now = Date.now();
    const cutoff = now - selectedRange;

    // Get pings within the time window
    const recentPings = pings
      .filter(p => p.timestamp >= cutoff)
      .map(p => ({
        timestamp: p.timestamp,
        time: p.success ? p.time : null,
        timeLabel: new Date(p.timestamp).toLocaleTimeString()
      }));

    // Create data points for the entire time window
    // This ensures the graph always shows the full time range
    const dataPoints = [];
    const intervalMs = 1000; // 1 second intervals for smooth graph

    for (let t = cutoff; t <= now; t += intervalMs) {
      // Find if we have a ping near this time
      const nearestPing = recentPings.find(p =>
        Math.abs(p.timestamp - t) < intervalMs / 2
      );

      dataPoints.push({
        timestamp: t,
        time: nearestPing ? nearestPing.time : null,
        timeLabel: new Date(t).toLocaleTimeString()
      });
    }

    return dataPoints; // Oldest on left, newest on right
  }, [tab.data, selectedRange]);

  // Get route changes within the visible time window
  const routeChanges = useMemo(() => {
    if (!tab.data?.routeChanges) return [];

    const now = Date.now();
    const cutoff = now - selectedRange;

    return tab.data.routeChanges.filter(change => change.timestamp >= cutoff);
  }, [tab.data?.routeChanges, selectedRange]);

  if (!tab.data) {
    return (
      <div className="empty-state">
        Enter a destination and click Start to begin
      </div>
    );
  }

  const selectedHop = tab.data.selectedHop;
  const title = selectedHop
    ? `Hop ${selectedHop.hop}: ${selectedHop.ip || 'Unknown'} ${selectedHop.hostname ? `(${selectedHop.hostname})` : ''}`
    : `Target: ${tab.destination}`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="graph-header">
        <div className="graph-title">{title}</div>
        <div className="time-range-selector">
          <label style={{ marginRight: '8px', fontSize: '12px' }}>Time Range:</label>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(Number(e.target.value))}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state">
          Waiting for ping data...
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis
                dataKey="timeLabel"
                stroke="#888"
                tick={{ fontSize: 11 }}
                tickFormatter={(value, index) => {
                  // Show fewer labels to avoid crowding
                  if (chartData.length > 50 && index % Math.ceil(chartData.length / 10) !== 0) {
                    return '';
                  }
                  return value;
                }}
              />
              <YAxis
                stroke="#888"
                tick={{ fontSize: 11 }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  borderRadius: '3px',
                  color: '#fff'
                }}
                formatter={(value) => (value !== null ? `${value.toFixed(2)} ms` : 'Lost')}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line
                type="linear"
                dataKey="time"
                stroke="#4dabf7"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Route change markers */}
              {routeChanges.map((change, index) => {
                const dataPoint = chartData.find(d =>
                  Math.abs(d.timestamp - change.timestamp) < 1000
                );
                if (!dataPoint) return null;

                return (
                  <ReferenceLine
                    key={index}
                    x={dataPoint.timeLabel}
                    stroke="#ff6b6b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: '⚠',
                      position: 'top',
                      fill: '#ff6b6b',
                      fontSize: 16,
                      cursor: 'pointer',
                      onClick: () => setSelectedRouteChange(change)
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>

          {/* Route Change Modal */}
          {selectedRouteChange && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#252526',
                border: '2px solid #ff6b6b',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '600px',
                maxHeight: '80%',
                overflow: 'auto',
                zIndex: 1000
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#ff6b6b' }}>⚠️ Route Changed</h3>
                <button
                  onClick={() => setSelectedRouteChange(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#888' }}>
                {new Date(selectedRouteChange.timestamp).toLocaleString()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#ff6b6b', marginTop: 0 }}>Old Route:</h4>
                  <div style={{ fontSize: '12px' }}>
                    {selectedRouteChange.oldHops.map(hop => (
                      <div key={hop.hop} style={{ marginBottom: '5px' }}>
                        <strong>Hop {hop.hop}:</strong> {hop.ip}
                        {hop.hostname && <div style={{ color: '#888', marginLeft: '10px' }}>{hop.hostname}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#51cf66', marginTop: 0 }}>New Route:</h4>
                  <div style={{ fontSize: '12px' }}>
                    {selectedRouteChange.newHops.map(hop => (
                      <div key={hop.hop} style={{ marginBottom: '5px' }}>
                        <strong>Hop {hop.hop}:</strong> {hop.ip}
                        {hop.hostname && <div style={{ color: '#888', marginLeft: '10px' }}>{hop.hostname}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backdrop for modal */}
          {selectedRouteChange && (
            <div
              onClick={() => setSelectedRouteChange(null)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 999
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default PingGraph;
