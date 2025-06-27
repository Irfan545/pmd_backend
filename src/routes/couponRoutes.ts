import express from "express";
import { authJWT, isSuperAdmin } from "../middleware/authMiddleware";
import {
  createCoupon,
  deleteCoupon,
  fetchAllCoupons,
} from "../controllers/couponController";

const router = express.Router();

router.use(authJWT);

router.get("/fetch-all-coupons", fetchAllCoupons);
router.post("/create-coupon", isSuperAdmin, createCoupon);
router.delete("/:id", isSuperAdmin, deleteCoupon);

export default router;
