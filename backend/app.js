import express from "express";
import cors from "cors";
import taskRoutes from "./routes/taskRoute.js";

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use("/api", taskRoutes);

export default app;