import express from "express";
import { authJWT } from "../middleware/authMiddleware";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../controllers/addressController";

const router = express.Router();

router.use(authJWT);

router.post("/add-address", createAddress);
router.get("/get-address", getAddresses);
router.delete("/delete-address/:id", deleteAddress);
router.put("/update-address/:id", updateAddress);

export default router;
