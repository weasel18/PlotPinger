# PlotPinger - Project Guide

## Overview
A network diagnostic tool built with Electron and React that provides real-time traceroute visualization and ping monitoring with historical data tracking.

## Current State

### Implemented Features ✓

#### Core Functionality
- **Real-time Ping Monitoring**: Continuous ping with configurable intervals (0.5s - 10s)
- **Traceroute Integration**: Complete route tracing with hop-by-hop analysis
- **DNS Resolution**: Automatic hostname resolution for all IPs in the route
- **Multi-target Support**: Browser-like tabs to monitor multiple destinations simultaneously

#### Data Visualization
- **Per-Hop Statistics**: Current, Average, Min, Max, and Packet Loss % for each hop
- **Mini Graphs**: Inline visualization for each hop showing:
  - Min-Max range indicator
  - Average marker
  - Recent ping history dots
- **Main Graph**: Detailed time-series chart with multiple time ranges:
  - 5min, 10min, 30min, 1hr, 2hr, 6hr, 12hr, 24hr, 48hr, 1wk, 2wk, 1mo
- **Interactive**: Double-click any hop to view its detailed graph

#### UI/UX Features
- **Resizable Panels**: Drag divider to adjust traceroute vs graph sections
- **History Dropdown**: Remembers last 20 pinged destinations
- **Dark Theme**: Professional dark UI optimized for long monitoring sessions
- **High Precision**: Displays times to 2 decimal places (e.g., 7.32ms)

#### Data Persistence
- **Session Continuity**: Stop/restart monitoring without losing historical data
- **Route Change Detection**: Automatically detects and logs when network routes change
- **Dynamic Hop Management**: Removes old hops and preserves data for persistent ones

### Technical Architecture

#### Stack
- **Frontend**: React 18 with functional components and hooks
- **Desktop**: Electron 28 for cross-platform desktop application
- **Build Tool**: Vite for fast development and optimized builds
- **Charts**: Recharts for data visualization
- **Networking**: Native OS commands (ping/tracert) via Node.js child_process

#### Project Structure
```
├── electron/
│   ├── main.js          # Electron main process, IPC handlers
│   └── preload.js       # Secure IPC bridge
├── src/
│   ├── components/
│   │   ├── Tabs.jsx              # Tab management UI
│   │   ├── ControlPanel.jsx      # Start/stop, interval controls
│   │   ├── TracerouteTable.jsx   # Hop list with statistics
│   │   ├── MiniGraph.jsx         # Per-hop visualization
│   │   ├── PingGraph.jsx         # Main time-series chart
│   │   └── Resizer.jsx           # Draggable panel divider
│   ├── services/
│   │   └── networkService.js     # Monitoring orchestration
│   ├── App.jsx                   # Main application component
│   └── main.jsx                  # React entry point
├── package.json
└── vite.config.js
```

#### Key Design Decisions
1. **State Management**: Local React state with prop drilling (simple, no Redux needed)
2. **IPC Pattern**: Electron handles all network operations, renderer displays results
3. **Data Flow**: networkService → IPC → Electron → OS commands → back through chain
4. **Performance**: Only store data points within selected time range, auto-cleanup old data

### Current Limitations

#### Known Issues
- Windows ping reports integer milliseconds only (precision limited by OS)
- Long traceroutes (>30 hops) may take time to complete initially
- No export functionality yet
- DNS resolution can slow down initial traceroute

#### Platform Support
- ✓ Windows (fully tested)
- ✓ Linux (supported, limited testing)
- ✗ macOS (not yet tested, may need privilege handling)

## End Goals / Roadmap

### Phase 1: Enhanced Monitoring (Priority)
- [ ] **Continuous Traceroute**: Re-run traceroute periodically (every 5-10 min) to detect route changes
- [ ] **Alert System**: Notifications for packet loss > threshold, route changes, high latency
- [ ] **Jitter Calculation**: Track ping variance over time
- [ ] **Performance Metrics**: Track route stability score

### Phase 2: Data Management
- [ ] **Export Capabilities**:
  - Export to CSV (raw data)
  - Export to PNG/SVG (graphs)
  - Export session report (summary + graphs)
- [ ] **Session Saving**: Save/load complete monitoring sessions
- [ ] **Database Storage**: Optional SQLite for long-term data storage
- [ ] **Data Cleanup**: Auto-purge data older than X days/weeks

### Phase 3: Advanced Visualization
- [ ] **Multiple Graph Overlays**: Compare multiple hops or targets on same chart
- [ ] **Heatmap View**: Show latency patterns over time
- [ ] **Packet Loss Visualization**: Dedicated loss % graph
- [ ] **Route Map**: Visual representation of network path
- [ ] **Statistics Dashboard**: Summary cards with key metrics

### Phase 4: Network Diagnostics
- [ ] **MTR-style Continuous Traceroute**: Combine ping + traceroute in real-time
- [ ] **Bandwidth Testing**: Optional throughput measurements
- [ ] **Port Scanning**: Check if specific ports are reachable
- [ ] **DNS Diagnostics**: Query multiple DNS servers
- [ ] **Geolocation**: Show geographic location of hops (using IP lookup)

### Phase 5: Enterprise Features
- [ ] **Monitoring Profiles**: Save configurations for different monitoring scenarios
- [ ] **Scheduled Monitoring**: Run tests at specific times
- [ ] **SLA Tracking**: Monitor against defined SLA thresholds
- [ ] **Multi-Host Comparison**: Side-by-side comparison of multiple targets
- [ ] **API Integration**: REST API for external monitoring tools

### Phase 6: Quality of Life
- [ ] **Themes**: Light mode, custom color schemes
- [ ] **Keyboard Shortcuts**: Quick access to common actions
- [ ] **Search/Filter**: Filter hops, search history
- [ ] **Settings Panel**: Configurable defaults, behavior options
- [ ] **Auto-Updates**: Built-in updater for new versions
- [ ] **Tray Icon**: Minimize to system tray with status

## Development Setup

### Requirements
- Node.js 16+
- npm or yarn
- Windows/Linux OS

### Quick Start
```bash
# Install dependencies
npm install

# Run development mode
npm run dev

# Build for production
npm run build
npm run build:electron
```

### Development Workflow
1. Vite dev server runs on `http://localhost:5173`
2. Electron loads from dev server with hot reload
3. DevTools open automatically in development
4. Console logs show network operation details

## Contributing Guidelines

### Code Style
- Use functional components with hooks
- Keep components focused and single-purpose
- Add console.log for important state changes
- Document complex logic with comments

### Testing Checklist
- [ ] Test start/stop/restart cycle
- [ ] Test route change detection (use VPN)
- [ ] Test multiple tabs simultaneously
- [ ] Test long running sessions (>1 hour)
- [ ] Test history persistence (close/reopen)

### Performance Considerations
- Limit stored ping data points (auto-cleanup)
- Throttle UI updates during high-frequency pings
- Use React.memo for expensive components
- Debounce resize operations

## Future Considerations

### Potential Enhancements
- WebSocket support for remote monitoring
- Cloud sync for session data
- Mobile companion app
- Browser extension for quick checks
- Integration with network monitoring tools (Grafana, etc.)
- Machine learning for anomaly detection
- IPv6 support
- ICMP timestamp requests for clock skew detection

### Architecture Evolution
- Consider migrating to TypeScript for better type safety
- Explore Tauri as lighter Electron alternative
- Implement proper state management (Zustand/Redux) if complexity grows
- Add E2E testing with Playwright
- Set up CI/CD pipeline

## Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [Recharts API](https://recharts.org/en-US/api)

### Similar Tools (for inspiration)
- PingPlotter (commercial)
- WinMTR
- Smokeping
- PRTG Network Monitor

---

**Last Updated**: 2025-12-15
**Version**: 1.0.0-alpha
**Status**: Active Development
