import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assetsRouter from "./assets";
import scanRouter from "./scan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assetsRouter);
router.use(scanRouter);

export default router;
