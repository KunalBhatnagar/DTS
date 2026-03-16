import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import IORedis from "ioredis";

let instance = null;

export function getRedisConnection() {
  if (!instance) {
    const redisOpts = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return times * 500;
      },
    };

    if (process.env.REDIS_URL) {
      instance = new IORedis(process.env.REDIS_URL, redisOpts);
    } else {
      instance = new IORedis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === "true" ? {} : false,
        ...redisOpts,
      });
    }

    instance.on("connect", () => {
      console.log("Redis connected successfully");
    });

    instance.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
  }
  return instance;
}