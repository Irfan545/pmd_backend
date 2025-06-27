import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";

export const createCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code, discount, startDate, endDate, userLimit } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discount: parseFloat(discount),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userLimit: userLimit ? parseInt(userLimit) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

export const fetchAllCoupons = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const fetchAllCouponsList = await prisma.coupon.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.status(201).json({
      success: true,
      message: "Coupon created successfully!",
      couponList: fetchAllCouponsList,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupon list",
    });
  }
};

export const deleteCoupon = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id: parseInt(id) },
    });

    res.status(201).json({
      success: true,
      message: "Coupon deleted successfully!",
      id: id,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
    });
  }
};
