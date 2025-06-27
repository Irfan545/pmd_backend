import express from "express";
import { authJWT, isSuperAdmin } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";
import {
  addFeatureBanners,
  fetchFeatureBanners,
  fetchFeaturedProducts,
  updateFeaturedProducts,
} from "../controllers/settingsController";

const router = express.Router();

router.post(
  "/banners",
  authJWT,
  isSuperAdmin,
  upload.array("images", 5),
  addFeatureBanners
);

router.get("/banners", authJWT, fetchFeatureBanners);
router.post(
  "/update-feature-products",
  authJWT,
  isSuperAdmin,
  updateFeaturedProducts
);
router.get("/fetch-feature-products", authJWT, fetchFeaturedProducts);

export default router;
