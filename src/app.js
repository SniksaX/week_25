import express from "express";
import cors from "cors";
import { UseRouter } from "./routes/router.js";

export function createApp() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));
  
  app.use("/api/ai", UseRouter);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}