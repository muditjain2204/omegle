import { Router, Request, Response } from "express";
import { runCronTasks } from "../cron";

const router = Router();

// GET /api/cron/keep-alive
// Ping endpoint for keep-alive services, external crons, or status checks
router.get("/keep-alive", async (req: Request, res: Response) => {
  const result = await runCronTasks();
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
});

// POST /api/cron/run
router.post("/run", async (req: Request, res: Response) => {
  const result = await runCronTasks();
  return res.json(result);
});

export default router;

