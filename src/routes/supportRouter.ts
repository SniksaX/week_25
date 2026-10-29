import { Router } from "express";
import {
  getTickets,
  login,
  logout,
  me,
  postTicket,
} from "../controllers/supportController.ts";
import { requireAdmin } from "../middlewares/requireAdmin.ts";

const router = Router();

router.post("/admin/login", login);
router.post("/admin/logout", logout);
router.get("/admin/me", me);
router.get("/admin/tickets", requireAdmin, getTickets);

router.post("/tickets", postTicket);

export default router;