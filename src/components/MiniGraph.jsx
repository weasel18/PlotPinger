import React from 'react';

function MiniGraph({ pings, min, max, avg }) {
  const width = 150;
  const height = 30;
  const padding = 5;

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

  // Calculate horizontal positions
  const yCenter = height / 2;
  const lineStart = padding;
  const lineEnd = width - padding;
  const lineLength = lineEnd - lineStart;

  // Position for min (left), max (right), avg (proportional)
  const minX = lineStart;
  const maxX = lineEnd;
  const avgX = lineStart + ((avg - minTime) / range) * lineLength;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Background */}
      <rect x="0" y="0" width={width} height={height} fill="#1e1e1e" />

      {/* Min-Max horizontal line */}
      <line
        x1={minX}
        y1={yCenter}
        x2={maxX}
        y2={yCenter}
        stroke="#555"
        strokeWidth="2"
      />

      {/* Min marker (left) */}
      <line
        x1={minX}
        y1={yCenter - 4}
        x2={minX}
        y2={yCenter + 4}
        stroke="#51cf66"
        strokeWidth="2"
      />

      {/* Max marker (right) */}
      <line
        x1={maxX}
        y1={yCenter - 4}
        x2={maxX}
        y2={yCenter + 4}
        stroke="#ff6b6b"
        strokeWidth="2"
      />

      {/* Avg dot */}
      <circle
        cx={avgX}
        cy={yCenter}
        r="3"
        fill="#ffd43b"
      />

      {/* Recent ping dots along the line */}
      {pings.slice(-20).map((ping, index) => {
        if (!ping.success || ping.time === null) return null;

        const x = lineStart + ((ping.time - minTime) / range) * lineLength;

        return (
          <circle
            key={index}
            cx={x}
            cy={yCenter}
            r="1.5"
            fill="#4dabf7"
            opacity="0.6"
          />
        );
      })}
    </svg>
  );
}

export default MiniGraph;
