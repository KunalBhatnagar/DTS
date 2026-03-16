import express from "express";
import {
  createTasks,
  getTasks,
  getTaskStats,
  cancelTask,
  retryTask,
  pauseQueue,
  resumeQueue
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/tasks",            createTasks);
router.get("/tasks",             getTasks);
router.get("/tasks/stats",       getTaskStats);
router.delete("/tasks/:id",      cancelTask);
router.post("/tasks/:id/retry",  retryTask);
router.post("/queue/pause",      pauseQueue);
router.post("/queue/resume",     resumeQueue);

export default router;
