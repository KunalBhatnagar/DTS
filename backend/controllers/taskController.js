import crypto from "crypto";
import Task from "../models/task.js";
import { getTaskQueue } from "../queues/taskQueue.js";

const PRIORITY_MAP = { high: 1, medium: 2, low: 3 };

export const computeStats = async (type = null) => {
  const pipeline = [];
  if (type) pipeline.push({ $match: { type } });
  pipeline.push({
    $group: {
      _id: "$status",
      count: { $sum: 1 },
      totalLatency: { $sum: { $ifNull: ["$latency", 0] } },
      latencyCount: { $sum: { $cond: [{ $ifNull: ["$latency", false] }, 1, 0] } }
    }
  });

  const counts = await Task.aggregate(pipeline);
  const stats = { total: 0, queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, avgLatency: 0, completedCount: 0 };
  let totalLatency = 0, latencyCount = 0;

  for (const r of counts) {
    stats[r._id] = r.count;
    stats.total += r.count;
    totalLatency += r.totalLatency;
    latencyCount += r.latencyCount;
  }

  stats.avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
  stats.completedCount = stats.completed;
  return stats;
};

export const createTasks = async (req, res) => {
  const { user, taskType, numberOfTasks, priority = "medium", delay = 0 } = req.body;
  const io = req.app.get("io");

  if (!user || !taskType || !numberOfTasks) {
    return res.status(400).json({ error: "Invalid input" });
  }
  if (numberOfTasks > 100) {
    return res.status(400).json({ error: "Maximum 100 tasks allowed per request" });
  }

  const tasksCreated = [];

  for (let i = 1; i <= numberOfTasks; i++) {
    const taskId = crypto.randomUUID();

    const task = await Task.create({
      taskId,
      user,
      type: taskType,
      inputNumber: numberOfTasks,
      priority,
      delay,
      status: "queued"
    });

    const job = await getTaskQueue().add(
      "task",
      { taskId, user, type: taskType, inputNumber: numberOfTasks, mongoId: task._id.toString() },
      { priority: PRIORITY_MAP[priority] ?? 2, delay: delay > 0 ? delay : undefined, attempts: 1 }
    );

    await Task.updateOne({ taskId }, { jobId: job.id });

    tasksCreated.push(taskId);

    if (io) {
      const updatedTask = await Task.findOne({ taskId });
      io.emit("taskCreated", updatedTask);
    }
  }

  res.json({ message: `${numberOfTasks} tasks queued`, tasksCreated });
};

export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).limit(100);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getTaskStats = async (req, res) => {
  try {
    res.json(await computeStats(req.query.type || null));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

export const cancelTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "queued") return res.status(400).json({ error: "Only queued tasks can be cancelled" });

    try {
      const job = await getTaskQueue().getJob(task.jobId);
      if (job) await job.remove();
    } catch (_) {
      // job may have already been picked up
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    req.app.get("io")?.emit("taskUpdate", updated);
    res.json({ message: "Task cancelled" });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel task" });
  }
};

export const retryTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== "failed") return res.status(400).json({ error: "Only failed tasks can be retried" });

    const job = await getTaskQueue().add(
      "task",
      { taskId: task.taskId, user: task.user, type: task.type, inputNumber: task.inputNumber, mongoId: task._id.toString() },
      { priority: PRIORITY_MAP[task.priority] ?? 2, attempts: 1 }
    );

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { status: "queued", jobId: job.id, progress: 0, error: null, workerId: null, retryCount: task.retryCount + 1 },
      { new: true }
    );

    req.app.get("io")?.emit("taskUpdate", updated);
    res.json({ message: "Task requeued" });
  } catch (error) {
    res.status(500).json({ error: "Failed to retry task" });
  }
};

export const pauseQueue = async (req, res) => {
  try {
    await getTaskQueue().pause();
    req.app.get("io")?.emit("queueState", { paused: true });
    res.json({ message: "Queue paused" });
  } catch (error) {
    res.status(500).json({ error: "Failed to pause queue" });
  }
};

export const resumeQueue = async (req, res) => {
  try {
    await getTaskQueue().resume();
    req.app.get("io")?.emit("queueState", { paused: false });
    res.json({ message: "Queue resumed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to resume queue" });
  }
};
