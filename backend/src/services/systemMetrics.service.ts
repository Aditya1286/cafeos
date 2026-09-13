import { monitorEventLoopDelay } from 'perf_hooks';

// This is a single-process monolith (no cluster/PM2 fan-out — see the earlier scaling
// review), so "system health" is really just "is this one Node process, and the Mongo
// it talks to, doing okay." A rolling in-memory buffer is enough to draw a trend line
// without standing up a real time-series store; it resets on restart, which is fine —
// a restart is itself the kind of event you'd want the graph to visibly restart after.
export interface SystemMetricsSample {
  timestamp: number;
  cpuPercent: number; // % of one core consumed since the previous sample
  heapUsedMB: number;
  rssMB: number;
  eventLoopLagMsMean: number;
  eventLoopLagMsP99: number;
}

const SAMPLE_INTERVAL_MS = 10_000;
const MAX_SAMPLES = 60; // 10 minutes of history at the interval above

const history: SystemMetricsSample[] = [];
let lastCpuUsage = process.cpuUsage();
let lastSampleAt = Date.now();
let started = false;

// resolution: 10 matches Node's own default and most published guidance (e.g. "watch for
// p99 spiking well above baseline"). monitorEventLoopDelay measures actual inter-check
// timing, not excess-over-schedule — so on a perfectly idle loop the mean naturally sits
// close to this resolution value itself, not near zero. The signal to watch is p99 (or
// mean) rising well above ~10ms, not the resting baseline.
const eventLoopHistogram = monitorEventLoopDelay({ resolution: 10 });
eventLoopHistogram.enable();

const takeSample = () => {
  const now = Date.now();
  const elapsedMs = now - lastSampleAt;

  const cpuUsage = process.cpuUsage();
  const userDeltaMicros = cpuUsage.user - lastCpuUsage.user;
  const sysDeltaMicros = cpuUsage.system - lastCpuUsage.system;
  const cpuPercent = elapsedMs > 0
    ? Math.round(((userDeltaMicros + sysDeltaMicros) / 1000 / elapsedMs) * 1000) / 10
    : 0;
  lastCpuUsage = cpuUsage;
  lastSampleAt = now;

  const mem = process.memoryUsage();

  const sample: SystemMetricsSample = {
    timestamp: now,
    cpuPercent,
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    // Nanoseconds -> milliseconds. Reset after every read so each sample describes
    // just its own window, not a cumulative average since process start.
    eventLoopLagMsMean: Math.round((eventLoopHistogram.mean / 1e6) * 100) / 100,
    eventLoopLagMsP99: Math.round((eventLoopHistogram.percentile(99) / 1e6) * 100) / 100
  };
  eventLoopHistogram.reset();

  history.push(sample);
  if (history.length > MAX_SAMPLES) history.shift();
};

export const startSystemMetricsCollector = () => {
  if (started) return; // guard against double-start if this module is ever imported twice
  started = true;
  takeSample(); // seed one sample immediately so the graph isn't empty on first load
  setInterval(takeSample, SAMPLE_INTERVAL_MS).unref();
};

export const getMetricsHistory = (): SystemMetricsSample[] => history;

// A fresh, request-time snapshot — independent of the sampling cadence above, so
// "current" numbers are never up to 10s stale.
export const getCurrentSnapshot = () => {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    eventLoopLagMsMean: Math.round((eventLoopHistogram.mean / 1e6) * 100) / 100
  };
};
