import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

let taskQueue;

export function getTaskQueue() {
  if (!taskQueue) {
    taskQueue = new Queue("taskQueue", {
      connection: getRedisConnection()
    });
  }
  return taskQueue;
}