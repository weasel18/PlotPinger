import React from 'react';

// Tiered scale ranges in milliseconds
const SCALE_TIERS = [
  { max: 100, label: '100ms' },
  { max: 250, label: '250ms' },
  { max: 500, label: '500ms' },
  { max: 1000, label: '1s' },
  { max: 2500, label: '2.5s' },
  { max: 5000, label: '5s' },
  { max: 10000, label: '10s' }
];

function MiniGraph({ pings, min, max, avg }) {
  const graphWidth = 100;
  const height = 30;
  const padding = 5;

  if (!pings || pings.length === 0) {
    return null;
  }

  // Calculate range
  const validPings = pings.filter(p => p.success && p.time !== null);
  if (validPings.length === 0) {
    return (
      <div style={{ fontSize: '10px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: '#51cf66', width: '35px', textAlign: 'right' }}>0ms</span>
        <span style={{ color: '#666' }}>All packets lost</span>
        <span style={{ color: '#ff6b6b', width: '35px' }}>-</span>
      </div>
    );
  }

  const minTime = min < Infinity ? min : 0;
  const maxTime = max > 0 ? max : minTime + 1;

  // Find appropriate scale tier
  const scaleTier = SCALE_TIERS.find(tier => tier.max >= maxTime) || SCALE_TIERS[SCALE_TIERS.length - 1];
  const scaleMax = scaleTier.max;
  const scaleMin = 0;
  const range = scaleMax - scaleMin;

  // Calculate horizontal positions
  const yCenter = height / 2;
  const lineStart = padding;
  const lineEnd = graphWidth - padding;
  const lineLength = lineEnd - lineStart;

  // Position for min, max, avg within the scaled range
  const minX = lineStart + ((minTime - scaleMin) / range) * lineLength;
  const maxX = lineStart + ((maxTime - scaleMin) / range) * lineLength;
  const avgX = lineStart + ((avg - scaleMin) / range) * lineLength;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px' }}>
      {/* Min label */}
      <span style={{ color: '#51cf66', width: '35px', textAlign: 'right', fontWeight: 'bold' }}>
        {minTime.toFixed(1)}ms
      </span>

      {/* Graph SVG */}
      <svg width={graphWidth} height={height} style={{ display: 'block' }}>
        {/* Background */}
        <rect x="0" y="0" width={graphWidth} height={height} fill="#1e1e1e" />

        {/* Scale line (full range) */}
        <line
          x1={lineStart}
          y1={yCenter}
          x2={lineEnd}
          y2={yCenter}
          stroke="#333"
          strokeWidth="1"
        />

        {/* Min-Max active range line */}
        <line
          x1={minX}
          y1={yCenter}
          x2={maxX}
          y2={yCenter}
          stroke="#555"
          strokeWidth="2"
        />

        {/* Min marker */}
        <line
          x1={minX}
          y1={yCenter - 4}
          x2={minX}
          y2={yCenter + 4}
          stroke="#51cf66"
          strokeWidth="2"
        />

        {/* Max marker */}
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

        {/* Recent ping dots */}
        {pings.slice(-20).map((ping, index) => {
          if (!ping.success || ping.time === null) return null;

          // Clamp to scale range
          const clampedTime = Math.min(Math.max(ping.time, scaleMin), scaleMax);
          const x = lineStart + ((clampedTime - scaleMin) / range) * lineLength;

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

      {/* Max label */}
      <span style={{ color: '#ff6b6b', width: '35px', fontWeight: 'bold' }}>
        {maxTime.toFixed(1)}ms
      </span>
    </div>
  );
}

export default MiniGraph;
