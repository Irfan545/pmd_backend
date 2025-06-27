import express from "express";
import { authJWT } from "../middleware/authMiddleware";
import { 
  fetchFeaturedProducts, 
  updateFeaturedProducts,
  fetchFeatureBanners,
  addFeatureBanners 
} from "../controllers/settingsController";
import { upload } from "../middleware/uploadMiddleware";

const router = express.Router();

// Public routes
router.get("/fetch-feature-products", fetchFeaturedProducts);
router.get("/banners", fetchFeatureBanners);

// Protected routes
router.post("/update-feature-products", authJWT, updateFeaturedProducts);
router.post(
  "/banners",
  authJWT,
  upload.array("images", 5),
  addFeatureBanners
);

export default router; 