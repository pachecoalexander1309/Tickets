import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import ticketsRouter from "./tickets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(ticketsRouter);

export default router;
