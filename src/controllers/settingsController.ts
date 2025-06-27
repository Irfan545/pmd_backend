import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import cloudinary from "../config/cloudinary";
import { prisma } from "../app";
import fs from "fs";
import { Request } from "express";

export const addFeatureBanners = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(404).json({
        success: false,
        message: "No files provided",
      });
      return;
    }

    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: "ecommerce-feature-banners",
      })
    );

    const uploadResults = await Promise.all(uploadPromises);

    const banners = await Promise.all(
      uploadResults.map((res) =>
        prisma.featureBanner.create({
          data: {
            imageUrl: res.secure_url,
          },
        })
      )
    );

    files.forEach((file) => fs.unlinkSync(file.path));
    res.status(201).json({
      success: true,
      banners,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Failed to add feature banners",
    });
  }
};

export const fetchFeatureBanners = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const banners = await prisma.featureBanner.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      banners,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feature banners",
    });
  }
};

export const updateFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request body:', req.body);
    const { productIds } = req.body;

    // Validate input
    if (!Array.isArray(productIds)) {
      console.log('productIds is not an array:', productIds);
      res.status(400).json({
        success: false,
        error: "productIds must be an array"
      });
      return;
    }

    if (productIds.length === 0) {
      console.log('productIds array is empty');
      res.status(400).json({
        success: false,
        error: "productIds array cannot be empty"
      });
      return;
    }

    console.log('Processing productIds:', productIds);

    // Convert string IDs to numbers and validate
    const numericProductIds = productIds.map((id: string) => {
      const numId = parseInt(id);
      if (isNaN(numId)) {
        throw new Error(`Invalid product ID: ${id}`);
      }
      return numId;
    });

    console.log('Converted to numeric IDs:', numericProductIds);

    // First, set all products to not featured
    await prisma.product.updateMany({
      where: {
        isFeatured: true
      },
      data: {
        isFeatured: false
      }
    });

    // Then, set the selected products to featured
    await prisma.product.updateMany({
      where: {
        id: {
          in: numericProductIds
        }
      },
      data: {
        isFeatured: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Featured products updated successfully"
    });
  } catch (error) {
    console.error('Error updating featured products:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update featured products"
    });
  }
};

export const fetchFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const featuredProducts = await prisma.product.findMany({
      where: {
        isFeatured: true
      },
      include: {
        brand: true,
        model: true,
        category: true
      }
    });

    res.status(200).json({
      success: true,
      featuredProducts
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch featured products"
    });
  }
};
