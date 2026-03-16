import { useEffect } from "react";

const PRIORITY_COLORS = {
  high:   "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  low:    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const STATUS_COLORS = {
  queued:     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed:     "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

function Field({ label, children }) {
  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{children}</div>
    </div>
  );
}

export default function TaskDetailModal({ task, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-0">
          <Field label="Task ID">
            <span className="font-mono text-xs break-all">{task.taskId}</span>
          </Field>
          <Field label="Status">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status] || ""}`}>
              {task.status}
            </span>
          </Field>
          <Field label="Priority">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[task.priority] || ""}`}>
              {task.priority || "medium"}
            </span>
          </Field>
          <Field label="User">{task.user}</Field>
          <Field label="Type">{task.type}</Field>
          <Field label="Input Number">{task.inputNumber}</Field>

          {task.status === "processing" && (
            <Field label="Progress">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{task.progress || 0}%</span>
              </div>
            </Field>
          )}

          {task.delay > 0 && (
            <Field label="Delay">{task.delay}ms</Field>
          )}
          {task.workerId && (
            <Field label="Worker PID">{task.workerId}</Field>
          )}
          {task.latency != null && (
            <Field label="Latency">{task.latency.toFixed(0)}ms</Field>
          )}
          {task.retryCount > 0 && (
            <Field label="Retry Count">{task.retryCount}</Field>
          )}
          {task.error && (
            <Field label="Error">
              <span className="text-red-600 dark:text-red-400">{task.error}</span>
            </Field>
          )}
          <Field label="Created At">
            {new Date(task.createdAt).toLocaleString()}
          </Field>
          {task.completedAt && (
            <Field label="Completed At">
              {new Date(task.completedAt).toLocaleString()}
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}
