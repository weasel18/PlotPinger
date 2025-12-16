// Active monitoring sessions
const sessions = new Map();

// Parse traceroute output
function parseTraceroute(output) {
  const lines = output.split('\n');
  const hops = [];
  const isWindows = navigator.platform.indexOf('Win') > -1;

  for (const line of lines) {
    if (!line.trim()) continue;

    let match;
    if (isWindows) {
      // Windows tracert format: " 1    23 ms    24 ms    24 ms  100.107.228.120"
      // Also handles: " 1     *        *        *     Request timed out."
      match = line.match(/^\s*(\d+)\s+(?:<?(\d+)\s*ms|\*)\s+(?:<?(\d+)\s*ms|\*)\s+(?:<?(\d+)\s*ms|\*)\s+([\d\.]+)/);

      if (match) {
        const [, hopNum, time1, time2, time3, ip] = match;
        const times = [time1, time2, time3].filter(t => t && t !== '*').map(Number);

        hops.push({
          hop: parseInt(hopNum),
          ip: ip,
          hostname: null,
          times: times.length > 0 ? times : [null],
          loss: times.length === 0 ? 100 : 0
        });
      }
    } else {
      // Linux/Mac traceroute format: " 1  192.168.1.1  0.123 ms  0.456 ms  0.789 ms"
      match = line.match(/^\s*(\d+)\s+([\d\.]+|[\*])\s+([\d\.]+\s*ms|[\*])\s+([\d\.]+\s*ms|[\*])\s+([\d\.]+\s*ms|[\*])/);

      if (match) {
        const [, hopNum, ip, t1, t2, t3] = match;
        const times = [t1, t2, t3]
          .map(t => t === '*' ? null : parseFloat(t))
          .filter(t => t !== null);

        hops.push({
          hop: parseInt(hopNum),
          ip: ip === '*' ? null : ip,
          hostname: null,
          times: times.length > 0 ? times : [null],
          loss: times.length === 0 ? 100 : 0
        });
      }
    }
  }

  return hops;
}

// Resolve hostnames for IPs
async function resolveHostnames(hops) {
  const resolvedHops = [];

  for (const hop of hops) {
    if (hop.ip && hop.ip !== '*') {
      try {
        const result = await window.electronAPI.reverseDNS(hop.ip);
        resolvedHops.push({
          ...hop,
          hostname: result.hostname
        });
      } catch (err) {
        resolvedHops.push(hop);
      }
    } else {
      resolvedHops.push(hop);
    }
  }

  return resolvedHops;
}

// Run traceroute and update hops
async function runTraceroute(session, destination, existingHops, onUpdate) {
  try {
    console.log('Running traceroute for:', destination);
    const result = await window.electronAPI.traceroute(destination);
    console.log('Traceroute result:', result);

    if (result.success) {
      const parsedHops = parseTraceroute(result.output);
      console.log('Parsed hops:', parsedHops);

      const resolvedHops = await resolveHostnames(parsedHops);
      console.log('Resolved hops:', resolvedHops);

      // Check if traceroute changed
      if (hasTracerouteChanged(existingHops, resolvedHops)) {
        const timestamp = Date.now();
        console.log('⚠️ TRACEROUTE CHANGED!');
        console.log('Old route:', existingHops.map(h => `${h.hop}: ${h.ip}`).join(' -> '));
        console.log('New route:', resolvedHops.map(h => `${h.hop}: ${h.ip}`).join(' -> '));

        // Store route change event
        session.routeChanges.push({
          timestamp,
          oldHops: existingHops.map(h => ({ hop: h.hop, ip: h.ip, hostname: h.hostname })),
          newHops: resolvedHops.map(h => ({ hop: h.hop, ip: h.ip, hostname: h.hostname }))
        });
      }

      // Map new hops and preserve existing ping data where possible
      session.hops = resolvedHops.map(hop => {
        // Check if this hop existed before (same hop number and IP)
        const existingHop = existingHops.find(h => h.hop === hop.hop && h.ip === hop.ip);
        const existingPingData = session.hopPings.get(hop.hop);

        // If hop existed and IP is the same, preserve its ping data
        if (existingHop && existingPingData) {
          const validPings = existingPingData.filter(p => p.success && p.time !== null);
          const times = validPings.map(p => p.time);

          return {
            ...hop,
            current: existingHop.current,
            avg: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
            min: times.length > 0 ? Math.min(...times) : Infinity,
            max: times.length > 0 ? Math.max(...times) : 0,
            loss: existingPingData.length > 0 ? ((existingPingData.length - validPings.length) / existingPingData.length) * 100 : 0,
            pings: existingPingData
          };
        }

        // New hop or IP changed, start fresh
        return {
          ...hop,
          current: null,
          avg: 0,
          min: Infinity,
          max: 0,
          loss: 0,
          pings: []
        };
      });

      // Remove ping data for hops that no longer exist
      const currentHopNumbers = new Set(resolvedHops.map(h => h.hop));
      for (const [hopNum] of session.hopPings) {
        if (!currentHopNumbers.has(hopNum)) {
          console.log(`Removing data for hop ${hopNum} (no longer in route)`);
          session.hopPings.delete(hopNum);
        }
      }

      onUpdate({
        traceroute: {
          hops: session.hops,
          loading: false
        },
        routeChanges: session.routeChanges
      });

      return true;
    }
  } catch (err) {
    console.error('Traceroute exception:', err);
    onUpdate({
      traceroute: {
        hops: [],
        loading: false,
        error: 'Traceroute failed: ' + err.message
      }
    });
  }
  return false;
}

// Start monitoring a target
export async function startMonitoring(tabId, destination, interval, onUpdate) {
  // Check if there's an existing session
  const existingSession = sessions.get(tabId);
  const existingPings = existingSession?.pings || [];
  const existingHopPings = existingSession?.hopPings || new Map();
  const existingHops = existingSession?.hops || [];

  // Stop any active monitoring but keep the data
  if (existingSession?.intervalId) {
    clearInterval(existingSession.intervalId);
  }

  const session = {
    destination,
    interval,
    isRunning: true,
    intervalId: null,
    tracerouteIntervalId: null,
    hops: [],
    pings: existingPings, // Preserve existing ping data
    hopPings: existingHopPings, // Preserve hop ping data
    routeChanges: [] // Track route change events
  };

  sessions.set(tabId, session);

  // Run initial traceroute
  await runTraceroute(session, destination, existingHops, onUpdate);

  // Set up periodic traceroute (every 5 minutes)
  session.tracerouteIntervalId = setInterval(async () => {
    if (session.isRunning) {
      await runTraceroute(session, destination, session.hops, onUpdate);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Start pinging
  const doPing = async () => {
    if (!session.isRunning) return;

    const timestamp = Date.now();

    // Ping main destination
    const result = await window.electronAPI.ping(destination);

    if (result.success) {
      session.pings.push({
        timestamp,
        time: result.time,
        success: true
      });
    } else {
      session.pings.push({
        timestamp,
        time: null,
        success: false
      });
    }

    // Ping each hop
    for (const hop of session.hops) {
      if (!hop.ip) continue;

      const hopResult = await window.electronAPI.ping(hop.ip);

      if (!session.hopPings.has(hop.hop)) {
        session.hopPings.set(hop.hop, []);
      }

      const hopPingData = session.hopPings.get(hop.hop);
      hopPingData.push({
        timestamp,
        time: hopResult.success ? hopResult.time : null,
        success: hopResult.success
      });

      // Update hop statistics
      const validPings = hopPingData.filter(p => p.success && p.time !== null);
      const times = validPings.map(p => p.time);

      hop.current = hopResult.success ? hopResult.time : null;
      hop.pings = hopPingData;

      if (times.length > 0) {
        hop.avg = times.reduce((a, b) => a + b, 0) / times.length;
        hop.min = Math.min(...times);
        hop.max = Math.max(...times);
        hop.loss = ((hopPingData.length - validPings.length) / hopPingData.length) * 100;
      } else {
        hop.loss = 100;
      }
    }

    onUpdate({
      pings: session.pings,
      traceroute: {
        hops: session.hops,
        loading: false
      }
    });
  };

  // Do initial ping
  await doPing();

  // Set up interval
  session.intervalId = setInterval(doPing, interval);
}

// Compare two traceroute hop arrays to detect changes
function hasTracerouteChanged(oldHops, newHops) {
  if (!oldHops || oldHops.length === 0) return false;
  if (oldHops.length !== newHops.length) return true;

  for (let i = 0; i < oldHops.length; i++) {
    if (oldHops[i].hop !== newHops[i].hop || oldHops[i].ip !== newHops[i].ip) {
      return true;
    }
  }

  return false;
}

// Stop monitoring
export function stopMonitoring(tabId) {
  const session = sessions.get(tabId);
  if (session) {
    session.isRunning = false;
    if (session.intervalId) {
      clearInterval(session.intervalId);
      session.intervalId = null;
    }
    if (session.tracerouteIntervalId) {
      clearInterval(session.tracerouteIntervalId);
      session.tracerouteIntervalId = null;
    }
    // Keep session data but mark as stopped - don't delete
    console.log('Stopped monitoring for tab:', tabId);
  }
}

// Resume monitoring with existing data
export function resumeMonitoring(tabId, destination, interval, onUpdate) {
  const session = sessions.get(tabId);
  if (session) {
    session.isRunning = true;
    session.destination = destination;
    session.interval = interval;
    console.log('Resuming monitoring for tab:', tabId, 'with existing data');
  }
}
