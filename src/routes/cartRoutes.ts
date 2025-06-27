import express from "express";
import { authJWT } from "../middleware/authMiddleware";
import {
  addToCart,
  clearEntireCart,
  getCart,
  removeFromCart,
  updateCartItemQuantity,
} from "../controllers/cartController";

const router = express.Router();

router.get("/fetch-cart", authJWT, getCart);
router.post("/add-to-cart", authJWT, addToCart);
router.delete("/remove/:id", authJWT, removeFromCart);
router.put("/update/:id", authJWT, updateCartItemQuantity);
router.post("/clear-cart", authJWT, clearEntireCart);

export default router;
