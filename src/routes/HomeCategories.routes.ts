import { Router } from "express";
import { getMainHomeCategories, getHomeSubcategories, getHomeProducts } from "../controllers/HomeCategoryController";

const router = Router();

// Get all main home page categories
router.get("/main", getMainHomeCategories);

// Get subcategories for a specific home page category
router.get("/:id/subcategories", getHomeSubcategories);

// Get products by home page category ID
router.get('/:id/products', getHomeProducts);

export default router; 