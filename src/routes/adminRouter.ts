import express from "express";
import { adminLogin, requireAdmin, getTickets, streamTickets } from "../controllers/adminController.ts";

export const AdminRouter = express.Router();

AdminRouter.post("/login", adminLogin);
AdminRouter.get("/tickets", requireAdmin, getTickets);
AdminRouter.get("/stream", requireAdmin, streamTickets);