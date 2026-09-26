import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { Cpu, MemoryStick, Timer, Database, Server } from 'lucide-react';
import { adminTooltipStyle } from '@/constants/chartTheme';
import { SystemHealth } from '@/types';

interface SystemHealthPanelProps {
  systemHealth: SystemHealth | null;
}

const formatClock = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: string;
}) => (
  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className={`text-xl font-extrabold ${color}`}>{value}</div>
    <div className="text-[11px] text-slate-400">{sub}</div>
  </div>
);

export const SystemHealthPanel = ({ systemHealth }: SystemHealthPanelProps) => {
  const heapUsedMB = systemHealth?.memoryUsage?.heapUsedMB;
  const heapTotalMB = systemHealth?.memoryUsage?.heapTotalMB;
  const rssMB = systemHealth?.memoryUsage?.rssMB;
  const heapPct =
    heapUsedMB !== undefined && heapTotalMB ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;

  const history = (systemHealth?.history || []).map((s) => ({
    ...s,
    time: formatClock(s.timestamp),
  }));
  const mongo = systemHealth?.mongo;

  const opcounterData = mongo
    ? [
        { op: 'Query', count: mongo.opcounters.query },
        { op: 'Command', count: mongo.opcounters.command },
        { op: 'Update', count: mongo.opcounters.update },
        { op: 'Insert', count: mongo.opcounters.insert },
        { op: 'Delete', count: mongo.opcounters.delete },
        { op: 'GetMore', count: mongo.opcounters.getmore },
      ]
    : [];

  return (
    <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">Server Health</h3>
          <p className="text-xs text-slate-500 font-medium">
            How the app's server and database are doing right now. Updates every 10 seconds.
          </p>
        </div>
        <span
          className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold border whitespace-nowrap ${
            systemHealth?.status === 'HEALTHY'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          {systemHealth?.status === 'HEALTHY' ? '● HEALTHY' : 'Checking…'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Timer}
          label="Running For"
          value={
            systemHealth?.uptimeSeconds !== undefined
              ? `${Math.floor(systemHealth.uptimeSeconds / 60)}m`
              : '—'
          }
          sub="Since last restart"
          color="text-slate-900"
        />
        <StatCard
          icon={Cpu}
          label="Processor Use"
          value={systemHealth?.cpuPercent !== undefined ? `${systemHealth.cpuPercent}%` : '—'}
          sub="Over the last 10 seconds"
          color={systemHealth && systemHealth.cpuPercent > 80 ? 'text-rose-600' : 'text-slate-900'}
        />
        <StatCard
          icon={Timer}
          label="Server Delay"
          value={
            systemHealth?.eventLoopLagMs !== undefined ? `${systemHealth.eventLoopLagMs}ms` : '—'
          }
          sub="Around 10ms is normal — watch for big jumps"
          color={
            systemHealth && systemHealth.eventLoopLagMs > 50 ? 'text-rose-600' : 'text-slate-900'
          }
        />
        <StatCard
          icon={MemoryStick}
          label="Memory Used"
          value={rssMB !== undefined ? `${rssMB} MB` : '—'}
          sub={heapUsedMB !== undefined ? `${heapUsedMB} MB used by the app` : 'Loading…'}
          color="text-slate-900"
        />
        <StatCard
          icon={Database}
          label="Database"
          value={systemHealth?.database ?? '—'}
          sub={mongo ? `MongoDB ${mongo.version}` : 'Database connection'}
          color={systemHealth?.database === 'CONNECTED' ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      {/* Heap usage bar — current snapshot, not a time series, so it stays separate from the charts below */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>App Memory Use</span>
          <span>{heapUsedMB !== undefined ? `${heapUsedMB} / ${heapTotalMB} MB` : 'Loading…'}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
            style={{ width: `${heapPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">Memory Over Time</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorRss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHeap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}MB`}
                />
                <Tooltip contentStyle={adminTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="rssMB"
                  name="Total Memory (MB)"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRss)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="heapUsedMB"
                  name="App Memory (MB)"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorHeap)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-blue-500 rounded-full inline-block" /> Total memory
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-red-500 rounded-full inline-block" /> App memory
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">
            Processor Use & Server Delay Over Time
          </h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="cpu"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="lag"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip contentStyle={adminTooltipStyle} />
                <Line
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="cpuPercent"
                  name="CPU %"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="lag"
                  type="monotone"
                  dataKey="eventLoopLagMsP99"
                  name="Server Delay (ms)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-500 rounded-full inline-block" /> Processor use %
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-violet-500 rounded-full inline-block" /> Server delay
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" />
          <h4 className="text-sm font-extrabold text-slate-900">Database Details</h4>
        </div>

        {!mongo ? (
          <p className="text-xs text-slate-400 font-medium py-4">
            {systemHealth?.database === 'CONNECTED'
              ? "Connected, but more details aren't available with the current database access."
              : 'Not connected to the database.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={Server}
                label="Database Running For"
                value={`${Math.floor(mongo.uptimeSeconds / 3600)}h`}
                sub={`v${mongo.version}`}
                color="text-slate-900"
              />
              <StatCard
                icon={Database}
                label="Connections"
                value={`${mongo.connections.current}`}
                sub={`of ${mongo.connections.available} available`}
                color="text-slate-900"
              />
              <StatCard
                icon={MemoryStick}
                label="Database Memory"
                value={`${mongo.memMB.resident} MB`}
                sub={`${mongo.memMB.virtual} MB virtual`}
                color="text-slate-900"
              />
              <StatCard
                icon={Server}
                label="Data Transferred"
                value={`${mongo.network.bytesInMB} MB in`}
                sub={`${mongo.network.bytesOutMB} MB out (lifetime)`}
                color="text-slate-900"
              />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">
                Database Activity (all time)
              </h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={opcounterData}>
                    <XAxis
                      dataKey="op"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={adminTooltipStyle} />
                    <Bar dataKey="count" name="Operations" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemHealthPanel;
