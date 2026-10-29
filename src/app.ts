import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { UseRouter } from "./routes/router.ts";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  app.use("/api/ai", UseRouter);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
