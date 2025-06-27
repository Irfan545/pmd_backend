import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../app";

export const createAddress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Unauthenticated user",
    });
    return;
  }

  const { name, address, city, country, postalCode, phone, isDefault } =
    req.body;

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId },
      data: {
        isDefault: false,
      },
    });
  }

  const newlyCreatedAddress = await prisma.address.create({
    data: {
      userId,
      name,
      address,
      city,
      country,
      postalCode,
      phone,
      isDefault: isDefault || false,
    },
  });

  res.status(201).json({
    success: true,
    address: newlyCreatedAddress,
  });

  try {
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

export const getAddresses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const fetchAllAddresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      address: fetchAllAddresses,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

export const updateAddress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const existingAddress = await prisma.address.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: "Address not found!",
      });

      return;
    }

    const { name, address, city, country, postalCode, phone, isDefault } =
      req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: {
          isDefault: false,
        },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        city,
        country,
        postalCode,
        phone,
        isDefault: isDefault || false,
      },
    });

    res.status(200).json({
      success: true,
      address: updatedAddress,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};

export const deleteAddress = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const existingAddress = await prisma.address.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!existingAddress) {
      res.status(404).json({
        success: false,
        message: "Address not found!",
      });

      return;
    }

    await prisma.address.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: "Address deleted successfully!",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Some error occured",
    });
  }
};
