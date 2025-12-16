import React from 'react';

function MiniGraph({ pings, min, max, avg }) {
  const width = 150;
  const height = 30;
  const padding = 2;

  if (!pings || pings.length === 0) {
    return null;
  }

  // Calculate range
  const validPings = pings.filter(p => p.success && p.time !== null);
  if (validPings.length === 0) {
    return (
      <div style={{ fontSize: '10px', color: '#666' }}>
        All packets lost
      </div>
    );
  }

  const minTime = min < Infinity ? min : 0;
  const maxTime = max > 0 ? max : minTime + 1;
  const range = maxTime - minTime || 1;

  // Calculate positions
  const minY = height - padding - ((minTime - minTime) / range) * (height - 2 * padding);
  const maxY = height - padding - ((maxTime - minTime) / range) * (height - 2 * padding);
  const avgY = height - padding - ((avg - minTime) / range) * (height - 2 * padding);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="#1e1e1e" />

      {/* Min-Max line */}
      <line
        x1={width / 2}
        y1={maxY}
        x2={width / 2}
        y2={minY}
        stroke="#555"
        strokeWidth="2"
      />

      {/* Min marker */}
      <line
        x1={width / 2 - 4}
        y1={minY}
        x2={width / 2 + 4}
        y2={minY}
        stroke="#51cf66"
        strokeWidth="1"
      />

      {/* Max marker */}
      <line
        x1={width / 2 - 4}
        y1={maxY}
        x2={width / 2 + 4}
        y2={maxY}
        stroke="#ff6b6b"
        strokeWidth="1"
      />

      {/* Avg dot */}
      <circle
        cx={width / 2}
        cy={avgY}
        r="3"
        fill="#ffd43b"
      />

      {/* Recent ping dots */}
      {pings.slice(-20).map((ping, index) => {
        if (!ping.success || ping.time === null) return null;

        const x = (index / 20) * width;
        const y = height - padding - ((ping.time - minTime) / range) * (height - 2 * padding);

        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="1"
            fill="#4dabf7"
            opacity="0.6"
          />
        );
      })}
    </svg>
  );
}

export default MiniGraph;
