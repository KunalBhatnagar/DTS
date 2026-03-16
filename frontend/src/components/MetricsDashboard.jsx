import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import API from "../services/api";
import socket from "../services/socket";
import { useDarkMode } from "../context/DarkModeContext";

const TASK_TYPES = [
  { value: "", label: "All Types" },
  { value: "data-processing", label: "Data Processing" },
  { value: "image-processing", label: "Image Processing" },
  { value: "email-sender", label: "Email Sender" },
];

export default function MetricsDashboard() {
  const { dark } = useDarkMode();

  // Dark-aware colors for Recharts SVG elements
  const tickColor  = dark ? "#9ca3af" : "#374151";
  const gridColor  = dark ? "#374151" : "#e5e7eb";
  const labelColor = dark ? "#d1d5db" : "#374151";

  const [stats, setStats] = useState({
    total: 0, queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, avgLatency: 0, completedCount: 0
  });
  const [metricsHistory, setMetricsHistory] = useState([]);

  const [completedFilter, setCompletedFilter] = useState("");
  const [latencyFilter, setLatencyFilter] = useState("");
  const [completedHistory, setCompletedHistory] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const [completedCurrentCount, setCompletedCurrentCount] = useState(null);
  const [latencyCurrentAvg, setLatencyCurrentAvg] = useState(null);

  const completedFilterRef = useRef("");
  const latencyFilterRef = useRef("");
  const wasActiveRef = useRef(false);

  useEffect(() => {
    completedFilterRef.current = completedFilter;
    setCompletedHistory([]);
    setCompletedCurrentCount(null);
    if (!completedFilter) return;
    API.get(`/tasks/stats?type=${completedFilter}`)
      .then(res => setCompletedCurrentCount(res.data.completedCount))
      .catch(() => {});
  }, [completedFilter]);

  useEffect(() => {
    latencyFilterRef.current = latencyFilter;
    setLatencyHistory([]);
    setLatencyCurrentAvg(null);
    if (!latencyFilter) return;
    API.get(`/tasks/stats?type=${latencyFilter}`)
      .then(res => setLatencyCurrentAvg(Math.round(res.data.avgLatency)))
      .catch(() => {});
  }, [latencyFilter]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    socket.on("taskUpdate", fetchAll);
    return () => {
      clearInterval(interval);
      socket.off("taskUpdate", fetchAll);
    };
  }, []);

  const fetchAll = async () => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      const cf = completedFilterRef.current;
      const lf = latencyFilterRef.current;

      const [mainRes, cfRes, lfRes] = await Promise.all([
        API.get("/tasks/stats"),
        cf ? API.get(`/tasks/stats?type=${cf}`) : Promise.resolve(null),
        lf ? API.get(`/tasks/stats?type=${lf}`) : Promise.resolve(null),
      ]);

      const newStats = mainRes.data;
      setStats(newStats);

      if (cfRes) setCompletedCurrentCount(cfRes.data.completedCount);
      if (lfRes) setLatencyCurrentAvg(Math.round(lfRes.data.avgLatency));

      const isActive = newStats.queued > 0 || newStats.processing > 0;
      const shouldAppend = isActive || wasActiveRef.current;
      wasActiveRef.current = isActive;

      if (shouldAppend) {
        setMetricsHistory(prev => [
          ...prev.slice(-19),
          {
            time: timestamp,
            completed: newStats.completedCount,
            queued: newStats.queued,
            processing: newStats.processing,
            avgLatency: Math.round(newStats.avgLatency)
          }
        ]);
        if (cfRes) setCompletedHistory(prev => [...prev.slice(-19), { time: timestamp, completed: cfRes.data.completedCount }]);
        if (lfRes) setLatencyHistory(prev => [...prev.slice(-19), { time: timestamp, avgLatency: Math.round(lfRes.data.avgLatency) }]);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const activeCompletedHistory = completedFilter ? completedHistory : metricsHistory;
  const activeLatencyHistory   = latencyFilter   ? latencyHistory   : metricsHistory;

  const throughput = metricsHistory.length > 1
    ? metricsHistory[metricsHistory.length - 1].completed - metricsHistory[0].completed
    : 0;

  const completedFilterLabel = TASK_TYPES.find(t => t.value === completedFilter)?.label;
  const latencyFilterLabel   = TASK_TYPES.find(t => t.value === latencyFilter)?.label;

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard title="Total"       value={stats.total}                          color="bg-blue-100 text-blue-800" />
        <StatCard title="Queued"      value={stats.queued}                         color="bg-yellow-100 text-yellow-800" />
        <StatCard title="Processing"  value={stats.processing}                     color="bg-orange-100 text-orange-800" />
        <StatCard title="Completed"   value={stats.completed}                      color="bg-green-100 text-green-800" />
        <StatCard title="Failed"      value={stats.failed ?? 0}                    color="bg-red-100 text-red-800" />
        <StatCard title="Cancelled"   value={stats.cancelled ?? 0}                 color="bg-gray-100 text-gray-700" />
        <StatCard title="Avg Latency" value={`${Math.round(stats.avgLatency)}ms`}  color="bg-purple-100 text-purple-800" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Task Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[stats]}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="type" hide />
              <YAxis tick={{ fill: tickColor }} />
              <Tooltip />
              <Legend wrapperStyle={{ color: labelColor }} />
              <Bar dataKey="queued"     fill="#fbbf24" name="Queued" />
              <Bar dataKey="processing" fill="#f97316" name="Processing" />
              <Bar dataKey="completed"  fill="#4ade80" name="Completed" />
              <Bar dataKey="failed"     fill="#f87171" name="Failed" />
              <Bar dataKey="cancelled"  fill="#9ca3af" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completed Tasks Over Time */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Completed Tasks Over Time</h3>
              {completedFilter && (
                <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                  {completedFilterLabel}
                </span>
              )}
            </div>
            <select
              value={completedFilter}
              onChange={e => setCompletedFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {activeCompletedHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activeCompletedHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis tick={{ fill: tickColor }} />
                <Tooltip />
                <Legend wrapperStyle={{ color: labelColor }} />
                <Line type="monotone" dataKey="completed" stroke="#4ade80" strokeWidth={2} name="Completed" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : completedFilter && completedCurrentCount !== null ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total completed — {completedFilterLabel}</p>
              <p className="text-6xl font-bold text-green-600 dark:text-green-400">{completedCurrentCount}</p>
              <p className="text-xs text-gray-400 mt-2">Submit tasks to see the live trend</p>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">Waiting for data...</div>
          )}
        </div>

        {/* Queue Status Over Time */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Queue Status Over Time</h3>
          {metricsHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis tick={{ fill: tickColor }} />
                <Tooltip />
                <Legend wrapperStyle={{ color: labelColor }} />
                <Line type="monotone" dataKey="queued"     stroke="#fbbf24" strokeWidth={2} name="Queued"     dot={false} />
                <Line type="monotone" dataKey="processing" stroke="#f97316" strokeWidth={2} name="Processing" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">Waiting for data...</div>
          )}
        </div>

        {/* Average Latency Over Time */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Average Latency Over Time</h3>
              {latencyFilter && (
                <span className="text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {latencyFilterLabel}
                </span>
              )}
            </div>
            <select
              value={latencyFilter}
              onChange={e => setLatencyFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {activeLatencyHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activeLatencyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: tickColor }} />
                <YAxis
                  tick={{ fill: tickColor }}
                  label={{ value: "ms", angle: -90, position: "insideLeft", fill: labelColor }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ color: labelColor }} />
                <Line type="monotone" dataKey="avgLatency" stroke="#a855f7" strokeWidth={2} name="Avg Latency (ms)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : latencyFilter && latencyCurrentAvg !== null ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg latency — {latencyFilterLabel}</p>
              <p className="text-6xl font-bold text-purple-600 dark:text-purple-400">{latencyCurrentAvg}ms</p>
              <p className="text-xs text-gray-400 mt-2">Submit tasks to see the live trend</p>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">Waiting for data...</div>
          )}
        </div>

      </div>

      {/* Performance Summary */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Throughput (last period)</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{throughput} tasks</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Processing Time</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(stats.avgLatency)}ms</p>
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className={`${color} p-4 rounded-lg shadow`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
