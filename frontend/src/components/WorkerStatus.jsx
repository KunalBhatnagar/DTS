import { useEffect, useState } from "react";
import socket from "../services/socket";

export default function WorkerStatus() {
  const [workers, setWorkers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    setConnectionStatus(socket.connected ? "connected" : "disconnected");

    socket.on("connect",    () => setConnectionStatus("connected"));
    socket.on("disconnect", () => setConnectionStatus("disconnected"));

    socket.on("workerStatus", (data) => setWorkers(Array.isArray(data) ? data : []));

    socket.on("workerUpdate", (workerData) => {
      setWorkers(prev => {
        const exists = prev.find(w => w.id === workerData.id);
        return exists
          ? prev.map(w => w.id === workerData.id ? workerData : w)
          : [...prev, workerData];
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("workerStatus");
      socket.off("workerUpdate");
    };
  }, []);

  const connectionColor = {
    connected:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    connecting:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    disconnected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const workerStatusColor = {
    idle:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    busy:    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    offline: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Worker Status</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${connectionColor[connectionStatus] || ""}`}>
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
      </div>

      {workers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No workers connected yet</p>
          <p className="text-sm mt-2">Workers appear here once they process their first task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((worker) => (
            <div
              key={worker.id || worker.name}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {worker.name || `Worker ${worker.id || "?"}`}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PID: {worker.pid || "N/A"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${workerStatusColor[worker.status || "idle"] || ""}`}>
                  {worker.status || "idle"}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {worker.tasksProcessed || 0} tasks
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Workers: <span className="font-bold text-gray-900 dark:text-gray-100">{workers.length}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Active: <span className="font-bold text-green-600 dark:text-green-400">{workers.filter(w => w.status === "busy").length}</span>
        </p>
      </div>
    </div>
  );
}
