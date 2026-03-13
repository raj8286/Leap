import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getRtcConfig } from "../controllers/rtcConfig.controller.js";

const router = express.Router();
router.get("/rtcConfig", protectRoute, getRtcConfig);

export default router;