import express from "express";
import {
  login,
  logout,
  refreshToken,
  register,
  verify,
} from "../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/verify", verify);

export default router;