import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TIME_RANGES = [
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

  const chartData = useMemo(() => {
    if (!tab.data) return [];

    const selectedHop = tab.data.selectedHop;
    const pings = selectedHop ? selectedHop.pings : tab.data.pings || [];

    if (!pings || pings.length === 0) return [];

    const now = Date.now();
    const cutoff = now - selectedRange;

    return pings
      .filter(p => p.timestamp >= cutoff)
      .map(p => ({
        timestamp: p.timestamp,
        time: p.success ? p.time : null,
        timeLabel: new Date(p.timestamp).toLocaleTimeString()
      }));
  }, [tab.data, selectedRange]);

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
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              className={`time-range-btn ${selectedRange === range.value ? 'active' : ''}`}
              onClick={() => setSelectedRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state">
          Waiting for ping data...
        </div>
      ) : (
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
              type="monotone"
              dataKey="time"
              stroke="#4dabf7"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default PingGraph;
