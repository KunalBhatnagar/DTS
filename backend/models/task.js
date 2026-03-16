import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  taskId:      String,
  user:        String,
  type:        String,
  priority:    { type: String, default: "medium" },
  inputNumber: Number,
  status:      { type: String, default: "queued" },
  jobId:       String,
  delay:       { type: Number, default: 0 },
  progress:    { type: Number, default: 0 },
  retryCount:  { type: Number, default: 0 },
  workerId:    String,
  latency:     Number,
  error:       String,
  createdAt:   { type: Date, default: Date.now },
  completedAt: Date
});

export default mongoose.model("Task", taskSchema);
