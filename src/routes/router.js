import express from "express";
import { chatCompletion } from "../controllers/controller.js";

export const UseRouter = express.Router();

UseRouter.post("/chat", chatCompletion);