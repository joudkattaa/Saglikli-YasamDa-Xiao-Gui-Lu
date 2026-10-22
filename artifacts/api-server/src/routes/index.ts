import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dengeRouter from "./denge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dengeRouter);

export default router;
