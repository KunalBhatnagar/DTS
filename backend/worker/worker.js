import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { connectDB } from "../config/db.js";
import Task from "../models/task.js";

await connectDB();
const redisConnection = getRedisConnection();

const worker = new Worker(
  "taskQueue",

  async (job) => {
    const { taskId, inputNumber } = job.data;
    const startTime = Date.now();

    await Task.updateOne({ taskId }, { status: "processing", workerId: process.pid, progress: 0 });

    const totalDelay = (inputNumber / 200 + Math.random()) * 1000;
    const steps = 5;
    const stepDelay = totalDelay / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      const progress = Math.round((i / steps) * 100);
      await job.updateProgress(progress);
      await Task.updateOne({ taskId }, { progress });
    }

    // 20% chance of failure
    if (Math.random() < 0.2) {
      const error = "Simulated worker failure";
      await Task.updateOne({ taskId }, { status: "failed", error, progress: 0, completedAt: new Date() });
      throw new Error(error);
    }

    const latency = Date.now() - startTime;
    await Task.updateOne({ taskId }, { status: "completed", latency, completedAt: new Date(), progress: 100 });
    console.log(`Task ${taskId} done by worker ${process.pid}`);
  },

  { connection: redisConnection }
);

worker.on("failed", (job, err) => {
  console.log(`Task ${job?.data?.taskId} failed: ${err.message}`);
});
