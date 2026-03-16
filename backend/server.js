import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { Server } from "socket.io";
import { QueueEvents } from "bullmq";
import { getRedisConnection } from "./config/redis.js";
import { getTaskQueue } from "./queues/taskQueue.js";
import Task from "./models/task.js";
import { computeStats } from "./controllers/taskController.js";

const PORT = process.env.PORT || 4000;

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, "http://localhost:5173"]
      : "*",
    credentials: true,
  }
});

app.set("io", io);

io.on("connection", async (socket) => {
  console.log("Client connected:", socket.id);

  // Send current queue pause state to the newly connected client
  try {
    const isPaused = await getTaskQueue().isPaused();
    socket.emit("queueState", { paused: isPaused });
  } catch (_) {}

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Worker registry
const workerRegistry = new Map();

const queueEvents = new QueueEvents("taskQueue", {
  connection: getRedisConnection()
});

queueEvents.on("active", async ({ jobId }) => {
  try {
    const job = await getTaskQueue().getJob(jobId);
    if (!job) return;
    const task = await Task.findById(job.data.mongoId).lean();
    if (!task) return;
    io.emit("taskUpdate", { ...task, status: "processing" });
  } catch (err) {
    console.error("Error handling active event:", err);
  }
});

queueEvents.on("progress", async ({ jobId, data }) => {
  try {
    const job = await getTaskQueue().getJob(jobId);
    if (!job) return;
    const task = await Task.findById(job.data.mongoId).lean();
    if (!task) return;
    io.emit("taskUpdate", { ...task, progress: data });
  } catch (err) {
    console.error("Error handling progress event:", err);
  }
});

queueEvents.on("completed", async ({ jobId }) => {
  try {
    const job = await getTaskQueue().getJob(jobId);
    if (!job) return;
    const task = await Task.findById(job.data.mongoId);
    if (!task) return;

    io.emit("taskUpdate", task);

    const workerId = String(task.workerId);
    const existing = workerRegistry.get(workerId) || {
      id: workerId, name: `Worker ${workerId}`, pid: workerId, tasksProcessed: 0
    };
    const updated = { ...existing, status: "idle", tasksProcessed: existing.tasksProcessed + 1 };
    workerRegistry.set(workerId, updated);
    io.emit("workerUpdate", updated);
    io.emit("workerStatus", Array.from(workerRegistry.values()));
  } catch (err) {
    console.error("Error handling completed event:", err);
  }
});

queueEvents.on("failed", async ({ jobId }) => {
  try {
    const job = await getTaskQueue().getJob(jobId);
    if (!job) return;
    const task = await Task.findById(job.data.mongoId).lean();
    if (!task) return;
    io.emit("taskUpdate", { ...task, status: "failed" });
  } catch (err) {
    console.error("Error handling failed event:", err);
  }
});

// Emit stats periodically
setInterval(async () => {
  try {
    io.emit("stats", await computeStats());
  } catch (error) {
    console.error("Error emitting stats:", error);
  }
}, 1000);

export { io };

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
