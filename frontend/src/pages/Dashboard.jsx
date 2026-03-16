import { useState, useEffect } from "react";
import TaskForm from "../components/TaskForm";
import WorkerStatus from "../components/WorkerStatus";
import MetricsDashboard from "../components/MetricsDashboard";
import TaskTable from "../components/TaskTable";
import { useDarkMode } from "../context/DarkModeContext";
import { useToast } from "../components/ToastProvider";
import API from "../services/api";
import socket from "../services/socket";

export default function Dashboard() {
  const { dark, toggle } = useDarkMode();
  const { addToast } = useToast();
  const [queuePaused, setQueuePaused] = useState(false);

  useEffect(() => {
    socket.on("queueState", ({ paused }) => setQueuePaused(paused));
    return () => socket.off("queueState");
  }, []);

  const handlePause = async () => {
    try {
      await API.post("/queue/pause");
      setQueuePaused(true);
      addToast("Queue paused — no new tasks will be processed", "warning");
    } catch {
      addToast("Failed to pause queue", "error");
    }
  };

  const handleResume = async () => {
    try {
      await API.post("/queue/resume");
      setQueuePaused(false);
      addToast("Queue resumed", "success");
    } catch {
      addToast("Failed to resume queue", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Distributed Task Processing System
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Monitor and manage asynchronous task processing with real-time metrics and worker status
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Queue pause/resume */}
          {queuePaused ? (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm"
            >
              ▶ Resume Queue
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm"
            >
              ⏸ Pause Queue
            </button>
          )}

          {queuePaused && (
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-full animate-pulse">
              QUEUE PAUSED
            </span>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium"
          >
            {dark ? "☀ Light Mode" : "☾ Dark Mode"}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-1 space-y-6">
          <TaskForm />
          <WorkerStatus />
        </div>
        <div className="lg:col-span-2">
          <MetricsDashboard />
        </div>
      </div>

      {/* Task Table */}
      <TaskTable />
    </div>
  );
}
