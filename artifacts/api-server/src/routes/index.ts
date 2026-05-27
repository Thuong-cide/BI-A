import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { tablesRouter } from "./tables";
import { sessionsRouter } from "./sessions";
import { settingsRouter } from "./settings";
import { usersRouter } from "./users";
import { dashboardRouter } from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tables", tablesRouter);
router.use("/sessions", sessionsRouter);
router.use("/settings", settingsRouter);
router.use("/users", usersRouter);
router.use("/dashboard", dashboardRouter);

export default router;
