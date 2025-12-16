# PlotPinger

A network diagnostic tool with traceroute and ping visualization, built with Electron and React.

## Features

- **Browser-like Tabs**: Open multiple monitoring sessions in separate tabs
- **Real-time Traceroute**: View all hops with IP addresses and resolved hostnames
- **Per-Hop Statistics**: See current, average, min, max, and packet loss for each hop
- **Mini Graphs**: Each hop displays a small graph showing ping performance
- **Main Ping Graph**: Detailed visualization of ping times over different time ranges
- **Time Range Selection**: View data from 5 minutes to 1 month
- **History**: Dropdown of previously pinged destinations
- **Resizable Panels**: Adjust the size of traceroute and graph sections
- **Double-click Hops**: Double-click any hop to view its detailed graph

## Requirements

- Node.js (v16 or higher)
- npm or yarn

## Installation

```bash
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start both the Vite dev server and Electron. The app will open automatically.

### Building for Production

```bash
npm run build
npm run build:electron
```

Built applications will be in the `release/` directory.

## Usage

1. **Start Monitoring**:
   - Enter an IP address or hostname in the "Target" field
   - Select a ping interval (0.5s to 10s)
   - Click "Start"

2. **View Traceroute**:
   - The top section shows all hops to the destination
   - Each hop displays IP, hostname (if resolved), and statistics
   - Mini graphs show recent ping performance

3. **View Main Graph**:
   - The bottom section shows a detailed ping graph
   - Use the time range buttons to adjust the view (5min to 1mo)
   - Double-click any hop in the traceroute to view its graph

4. **Manage Tabs**:
   - Click "+" to open a new tab
   - Click "×" on a tab to close it
   - Each tab can monitor a different destination

5. **Resize Sections**:
   - Drag the horizontal divider between traceroute and graph sections

## Platform Notes

### Windows
- Runs natively with `ping` and `tracert` commands
- May require administrator privileges for some network operations

### Linux
- Requires `ping` and `traceroute` to be installed
- May require `sudo` privileges or capabilities for raw sockets

## Technical Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Recharts**: Charting library
- **Node.js**: Backend network operations

## Architecture

- `electron/main.js`: Main Electron process handling network operations
- `electron/preload.js`: Secure bridge between main and renderer processes
- `src/App.jsx`: Main React component
- `src/components/`: UI components (Tabs, TracerouteTable, PingGraph, etc.)
- `src/services/networkService.js`: Orchestrates ping and traceroute monitoring

## License

MIT
