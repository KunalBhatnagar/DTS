import { useState, useEffect } from "react";
import API from "../services/api";
import socket from "../services/socket";
import { useToast } from "./ToastProvider";
import TaskDetailModal from "./TaskDetailModal";

const STATUS_FILTERS = ["all", "queued", "processing", "completed", "failed", "cancelled"];

const STATUS_COLOR = {
  queued:     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed:     "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const PRIORITY_COLOR = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  low:    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function TaskTable() {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();

    const onTaskUpdate = (updated) => {
      setTasks(prev => prev.map(t => t._id === updated._id ? { ...t, ...updated } : t));
      setSelectedTask(prev => prev?._id === updated._id ? { ...prev, ...updated } : prev);
    };

    const onTaskCreated = (newTask) => {
      setTasks(prev => [newTask, ...prev]);
    };

    socket.on("taskUpdate", onTaskUpdate);
    socket.on("taskCreated", onTaskCreated);

    return () => {
      socket.off("taskUpdate", onTaskUpdate);
      socket.off("taskCreated", onTaskCreated);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await API.get("/tasks");
      setTasks(res.data);
    } catch {
      addToast("Failed to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e, task) => {
    e.stopPropagation();
    try {
      await API.delete(`/tasks/${task._id}`);
      addToast("Task cancelled", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Cancel failed", "error");
    }
  };

  const handleRetry = async (e, task) => {
    e.stopPropagation();
    try {
      await API.post(`/tasks/${task._id}/retry`);
      addToast("Task requeued for retry", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Retry failed", "error");
    }
  };

  const exportCSV = () => {
    const headers = ["taskId", "user", "type", "status", "priority", "progress", "latency", "retryCount", "createdAt", "completedAt"];
    const rows = filteredTasks.map(t =>
      headers.map(h => JSON.stringify(t[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("CSV exported", "success");
  };

  const filteredTasks = tasks
    .filter(t => filter === "all" || t.status === filter)
    .filter(t => !userFilter || t.user?.toLowerCase().includes(userFilter.toLowerCase()));

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tasks</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* User filter */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Filter by user..."
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === s
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">No tasks found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Task ID</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">User</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Priority</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Progress</th>
                <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Latency</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Created</th>
                <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.slice(0, 20).map((task) => (
                <tr
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-mono text-xs">
                    {task.taskId?.substring(0, 8)}…
                  </td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{task.user}</td>
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{task.type}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
                      {task.priority || "medium"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[task.status] || ""}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 w-28">
                    {task.status === "processing" ? (
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-7 text-right">
                          {task.progress || 0}%
                        </span>
                      </div>
                    ) : task.status === "completed" ? (
                      <span className="text-xs text-green-600 dark:text-green-400">100%</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    {task.latency ? `${task.latency.toFixed(0)}ms` : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                    {task.status === "queued" && (
                      <button
                        onClick={e => handleCancel(e, task)}
                        className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Cancel
                      </button>
                    )}
                    {task.status === "failed" && (
                      <button
                        onClick={e => handleRetry(e, task)}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {Math.min(filteredTasks.length, 20)} of {filteredTasks.length} filtered ({tasks.length} total)
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
