# Development Journal - PlotPinger

A chronological log of development activities, decisions, and fixes.

---

## 2025-12-15

### Session 1: Initial Project Setup

**Goal**: Create a network diagnostic tool with traceroute and ping visualization (inspired by PingPlotter).

#### Requirements Gathered
- Split UI: Top 3/4 for traceroute table, bottom 1/4 for ping graph (resizable)
- Browser-like tabs for multiple monitoring sessions
- History dropdown for previously pinged destinations
- Per-hop statistics: Current, Avg, Min, Max, Packet Loss %
- Mini graphs for each hop row
- Main graph with time range selection (5min to 1 month)
- Double-click hop to show in main graph
- Hostname resolution for all IPs

#### Technology Stack Selection
- **Framework**: Electron + React (chosen over Tauri, Python+Qt)
- **Reasoning**:
  - Cross-platform desktop support
  - Rich ecosystem for charting
  - Good networking capabilities
  - Familiar web technologies
- **Target Platforms**: Windows + Linux

#### Project Scaffolding
```bash
Created structure:
├── electron/          # Main process
├── src/components/    # React components
├── src/services/      # Business logic
├── public/            # Static assets
└── Configuration files
```

**Files Created**:
- `package.json` - Dependencies and scripts
- `vite.config.js` - Build configuration
- `index.html` - Entry HTML
- `electron/main.js` - Electron main process with IPC handlers
- `electron/preload.js` - Secure IPC bridge

**Dependencies Installed**:
- Electron 28, React 18, Vite 5
- Recharts for charting
- Concurrently for dev workflow

#### Core Components Built

**1. App.jsx** - Main application
- Tab state management
- History tracking with localStorage
- Resizable panel state (default 60/40 split)

**2. Tabs.jsx** - Tab bar
- Add/close tab functionality
- Active tab highlighting
- Minimum 1 tab enforced

**3. ControlPanel.jsx** - Controls
- Destination input with history datalist
- Interval selector (0.5s - 10s)
- Start/Stop buttons
- Integration with networkService

**4. TracerouteTable.jsx** - Hop display
- Table with hop details
- Statistics display
- Mini graph integration
- Row selection on double-click

**5. MiniGraph.jsx** - Inline visualization
- SVG-based mini chart
- Min/Max range line
- Average dot marker
- Recent ping dots overlay

**6. PingGraph.jsx** - Main chart
- Recharts LineChart integration
- Time range selector buttons
- Responsive container
- Tooltip formatting

**7. Resizer.jsx** - Panel divider
- Mouse drag handling
- Percentage-based resizing
- Visual feedback on hover

#### Network Service Implementation

**networkService.js** - Monitoring orchestration
- Session management with Map
- `startMonitoring()` - Initiates ping/traceroute cycle
- `stopMonitoring()` - Halts monitoring
- `parseTraceroute()` - Parses OS command output
- `resolveHostnames()` - DNS reverse lookups
- Ping interval scheduling
- Per-hop statistics calculation

**IPC Handlers in main.js**:
- `ping` - Single ping execution
- `traceroute` - Full route trace
- `reverse-dns` - IP to hostname
- `forward-dns` - Hostname to IP

#### Styling
- Dark theme with professional color scheme
- Custom scrollbars
- Hover effects and active states
- Monospace font for technical data
- Responsive layout

**Status**: ✅ Basic application functional, ready for testing

---

### Session 2: Bug Fixes - Data Not Displaying

**Issue Reported**: Traceroute showing "running traceroute" and "waiting for ping data" indefinitely. No data appearing in UI.

#### Investigation

**Problem #1: Traceroute Regex Not Matching**
- Windows `tracert` output format wasn't matching regex pattern
- Tested with actual `tracert` command output
- Output format: `  1    24 ms    24 ms    23 ms  100.107.228.120`

**Fix Applied**: Updated regex in `networkService.js:17`
```javascript
// Old: Too strict, didn't handle Windows spacing
/^\s*(\d+)\s+(?:<?(\d+)\s*ms|[\*\s]+)\s+.../

// New: More flexible spacing
/^\s*(\d+)\s+(?:<?(\d+)\s*ms|\*)\s+(?:<?(\d+)\s*ms|\*)\s+(?:<?(\d+)\s*ms|\*)\s+([\d\.]+)/
```

**Problem #2: State Management Bug**
- `updateTab()` function wasn't deep merging nested `data` objects
- Traceroute results were being overwritten instead of merged
- Closure issue in ControlPanel callback with stale `tab.data` reference

**Fix Applied**: Updated `App.jsx:52-63`
```javascript
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
```

**Problem #3: Ping Parsing Limited to Integers**
- Used `parseInt()` instead of `parseFloat()`
- Lost any decimal precision from ping output

**Fix Applied**: Updated `electron/main.js:69-77`
```javascript
// Now captures decimals: time=7ms or time=7.32ms
const match = output.match(/time[=<](\d+\.?\d*)ms/i);
time = parseFloat(match[1]);
```

**Added Debugging**:
- Console logs in traceroute handler
- Parsing step visibility
- DNS resolution logging

**Testing**: Created `test-parse.js` to validate regex against real output
- Confirmed successful parsing of all hops
- Verified IP extraction working

**Status**: ✅ Data now displays correctly

---

### Session 3: Data Persistence & Route Change Detection

**Issue Reported**: User noted Tailscale VPN was interfering with results. Also requested:
1. Keep ping graph data when stopping/restarting
2. Log when traceroute changes
3. Remove old hops when route changes

#### Implementation

**Feature 1: Persist Data on Stop/Restart**

**Changes to `networkService.js:233-255`**:
```javascript
// Old: Deleted session on stop
sessions.delete(tabId);

// New: Keep session, just stop interval
session.isRunning = false;
if (session.intervalId) {
  clearInterval(session.intervalId);
  session.intervalId = null;
}
// Session stays in Map with all historical data
```

**Changes to `startMonitoring()` (lines 80-101)**:
- Check for existing session before creating new one
- Preserve `pings` array and `hopPings` Map
- Only clear `intervalId` if stopping

**Benefit**: Users can now stop monitoring to save resources, then resume without losing graph history.

**Feature 2: Traceroute Change Detection**

**Added function `hasTracerouteChanged()` (lines 218-230)**:
```javascript
function hasTracerouteChanged(oldHops, newHops) {
  if (!oldHops || oldHops.length === 0) return false;
  if (oldHops.length !== newHops.length) return true;

  for (let i = 0; i < oldHops.length; i++) {
    if (oldHops[i].hop !== newHops[i].hop ||
        oldHops[i].ip !== newHops[i].ip) {
      return true;
    }
  }
  return false;
}
```

**Integrated into `startMonitoring()` (lines 116-121)**:
```javascript
if (hasTracerouteChanged(existingHops, resolvedHops)) {
  console.log('⚠️ TRACEROUTE CHANGED!');
  console.log('Old route:', existingHops.map(h => `${h.hop}: ${h.ip}`).join(' -> '));
  console.log('New route:', resolvedHops.map(h => `${h.hop}: ${h.ip}`).join(' -> '));
}
```

**Use Cases**:
- VPN connection/disconnection
- ISP routing changes
- Network failover
- BGP route changes

**Feature 3: Dynamic Hop Management**

**Smart hop reconciliation (lines 123-155)**:
- Compare new hops with existing hops
- If hop exists at same position with same IP → preserve all ping data
- If hop is new → start fresh with empty arrays
- Calculate statistics from preserved data

**Cleanup obsolete hops (lines 157-164)**:
```javascript
const currentHopNumbers = new Set(resolvedHops.map(h => h.hop));
for (const [hopNum] of session.hopPings) {
  if (!currentHopNumbers.has(hopNum)) {
    console.log(`Removing data for hop ${hopNum} (no longer in route)`);
    session.hopPings.delete(hopNum);
  }
}
```

**Benefit**: UI stays clean, only shows current route, but preserves history for stable hops.

**Status**: ✅ All three features implemented and working

---

### Session 4: Precision Improvements

**Issue Reported**: User wants finer precision in ping times (e.g., 7.32ms instead of 7.0ms)

#### Analysis
- Current display: 1 decimal place (`.toFixed(1)`)
- Desired: 2 decimal places for better accuracy
- Need to update both display formatting AND parsing

#### Changes Made

**1. TracerouteTable.jsx (lines 68-74)**:
```javascript
// Updated all .toFixed(1) to .toFixed(2)
<td>{hop.current !== null ? `${hop.current.toFixed(2)} ms` : '-'}</td>
<td>{hop.avg > 0 ? `${hop.avg.toFixed(2)} ms` : '-'}</td>
<td>{hop.min < Infinity ? `${hop.min.toFixed(2)} ms` : '-'}</td>
<td>{hop.max > 0 ? `${hop.max.toFixed(2)} ms` : '-'}</td>
<td>{hop.loss.toFixed(2)}%</td>
```

**2. PingGraph.jsx (line 104)**:
- Already had `.toFixed(2)` in tooltip formatter ✅

**3. electron/main.js (lines 69-81)**:
```javascript
// Changed from parseInt to parseFloat
// Added decimal support to regex
const match = output.match(/time[=<](\d+\.?\d*)ms/i);
time = parseFloat(match[1]);
```

#### Caveat Noted
Windows `ping` command typically reports integer milliseconds only. The improved precision will mainly benefit:
- **Calculated averages** across multiple pings
- **Statistical measures** (min/max over time)
- **Sub-millisecond times** (will show as `<1ms` or `0.xx ms`)

Real decimal precision from ping would require:
- Custom ICMP implementation
- Third-party ping library with microsecond precision
- Or Linux with high-resolution timers

**Status**: ✅ Display precision improved to 2 decimals

---

### Session 5: Documentation

**Created comprehensive project documentation**:

**1. project_guide.md**:
- Current state overview
- Complete feature list
- Technical architecture
- Known limitations
- Detailed roadmap (6 phases)
- Development setup
- Contributing guidelines

**2. development_journal.md** (this file):
- Chronological development log
- Problem-solution documentation
- Code change tracking
- Decision rationale

**Purpose**:
- Onboarding new developers
- Tracking progress
- Remembering why decisions were made
- Planning future work

**Status**: ✅ Documentation complete

---

## Notes & Observations

### What Worked Well
- **Electron + React**: Great combination for desktop apps
- **Vite**: Much faster than Webpack
- **Component Architecture**: Easy to reason about data flow
- **Console Logging**: Invaluable for debugging network operations
- **Iterative Development**: Build → test → fix cycle

### Challenges Faced
- **Windows-specific Parsing**: OS command output varies
- **State Management**: Nested object updates need care
- **Async Coordination**: DNS lookups, ping timing
- **Closure Stale Data**: React hooks can capture old values

### Lessons Learned
1. Always test with actual OS command output
2. Deep merge nested state objects carefully
3. Use `parseFloat` for any numeric data that might have decimals
4. Keep historical data separate from active monitoring state
5. Log everything during development, remove logs in production

### Performance Observations
- DNS resolution is slowest part of initial traceroute
- Pinging 10+ hops every second is CPU-intensive
- Recharts handles 1000+ data points smoothly
- localStorage for history is instant

---

## Next Steps

### Immediate Priorities
1. [ ] Test on Linux system
2. [ ] Add continuous traceroute (re-run every 5 minutes)
3. [ ] Implement alert system for packet loss
4. [ ] Add export to CSV functionality

### Medium-term Goals
1. [ ] Optimize DNS resolution (cache results)
2. [ ] Add jitter calculation
3. [ ] Implement session save/load
4. [ ] Create settings panel

### Long-term Vision
1. [ ] MTR-style live traceroute
2. [ ] Multi-target comparison view
3. [ ] Integration with external monitoring tools
4. [ ] Consider TypeScript migration

---

## How to Update This Journal

When making significant changes:

1. Add a new session header with date
2. Describe the problem/feature
3. Document investigation steps
4. Show code changes with line numbers
5. Explain the reasoning
6. Note the outcome (✅ ❌ ⚠️)

Keep entries concise but informative. Future you will thank you!

---

**Last Updated**: 2025-12-15 20:30 UTC
**Current Version**: 1.0.0-alpha
**Total Development Time**: ~4 hours
**Lines of Code**: ~1,500
