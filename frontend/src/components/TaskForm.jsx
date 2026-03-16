import { useState } from "react";
import API from "../services/api";
import { useToast } from "./ToastProvider";

export default function TaskForm() {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    user: "default-user",
    taskType: "data-processing",
    numberOfTasks: 10,
    priority: "medium",
    delay: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === "numberOfTasks" || name === "delay") ? parseInt(value) || 0 : value
    }));
  };

  const submitTask = async () => {
    if (!formData.user || !formData.taskType || formData.numberOfTasks <= 0) {
      addToast("Please fill all fields with valid values", "error");
      return;
    }

    try {
      setLoading(true);
      await API.post("/tasks", {
        user: formData.user,
        taskType: formData.taskType,
        numberOfTasks: formData.numberOfTasks,
        priority: formData.priority,
        delay: formData.delay,
      });
      addToast(`${formData.numberOfTasks} tasks submitted successfully!`, "success");
      setFormData(prev => ({ ...prev, numberOfTasks: 10, delay: 0 }));
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to submit tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Submit Tasks</h2>

      <div className="space-y-4">
        {/* User */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Name</label>
          <input
            type="text"
            name="user"
            value={formData.user}
            onChange={handleChange}
            placeholder="Enter user name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Type</label>
          <select
            name="taskType"
            value={formData.taskType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="data-processing">Data Processing</option>
            <option value="image-processing">Image Processing</option>
            <option value="email-sender">Email Sender</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
          <div className="flex gap-2">
            {["high", "medium", "low"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                  formData.priority === p
                    ? p === "high"   ? "bg-red-500 text-white"
                    : p === "medium" ? "bg-yellow-500 text-white"
                    :                  "bg-green-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Tasks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Tasks: {formData.numberOfTasks}
          </label>
          <input
            type="range"
            name="numberOfTasks"
            min="1"
            max="100"
            value={formData.numberOfTasks}
            onChange={handleChange}
            className="w-full"
          />
          <input
            type="number"
            name="numberOfTasks"
            value={formData.numberOfTasks}
            onChange={handleChange}
            min="1"
            max="100"
            className="w-full mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Delay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Schedule Delay (ms) — 0 = immediate
          </label>
          <input
            type="number"
            name="delay"
            value={formData.delay}
            onChange={handleChange}
            min="0"
            step="1000"
            placeholder="e.g. 5000 = 5 seconds"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={submitTask}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {loading ? "Submitting..." : "Start Processing"}
        </button>
      </div>
    </div>
  );
}
