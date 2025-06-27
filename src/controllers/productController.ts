import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import cloudinary from "../config/cloudinary";
import { prisma } from "../lib/prisma";
import { parse } from "path";
import fs from "fs";

//create a product
export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      model,
      stock,
      compatibilities,
      isFeatured,
      compatibleEngine,
    } = req.body;
    const files = req.files as Express.Multer.File[];
    //upload images to cloudinary
    const uploadPromises = files.map((file) => {
      return cloudinary.uploader.upload(file.path, {
        folder: "products",
      });
    });
    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((result) => result.secure_url);
    const imagePublicIds = uploadResults.map((result) => result.public_id);

    const newlyCreatedProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        brand,
        model,
        stock: parseInt(stock),
        compatibilities: compatibilities.split(","),
        isFeatured,
        compatibleEngine,
        imageUrl: imageUrls,
      },
    });
    files.forEach((file) => {
      fs.unlinkSync(file.path); // delete the file from the server
    });
    res.status(201).json({
      message: "Product created successfully",
      product: newlyCreatedProduct,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// get all products
export const fetchAllProductsForAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const fetchProducts = await prisma.product.findMany();
    res.status(200).json(fetchProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// get a product by id
export const getProductById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!product) {
      res.status(404).json({
        error: "Product not found",
        success: false,
      });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// update a product by id (admin only)
export const updateProductById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category,
      brand,
      model,
      stock,
      compatibilities,
      isFeatured,
      compatibleEngine,
    } = req.body;

    console.log(req.body, "req.body");
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      // Fetch current product
      const existingProduct = await prisma.product.findUnique({
        where: { id: Number(id) },
      });

      // Delete old Cloudinary images
      if (existingProduct?.imagePublicIds?.length) {
        await Promise.all(
          existingProduct.imagePublicIds.map((publicId: string) =>
            cloudinary.uploader.destroy(publicId)
          )
        );
      }
      //upload images to cloudinary
      const uploadPromises = files.map((file) => {
        return cloudinary.uploader.upload(file.path, {
          folder: "products",
        });
      });
      const uploadResults = await Promise.all(uploadPromises);
      const imageUrls = uploadResults.map((result) => result.secure_url);
      const imagePublicIds = uploadResults.map((result) => result.public_id);

      files.forEach((file) => {
        fs.unlinkSync(file.path); // delete the file from the server
      });
      const updateData: any = {
        name,
        description,
        price: parseFloat(price),
        category,
        brand,
        model,
        stock: parseInt(stock),
        compatibilities: compatibilities.split(","),
        isFeatured,
        compatibleEngine,
      };

      if (imageUrls && imagePublicIds) {
        updateData.imageUrl = imageUrls;
        updateData.imagePublicIds = imagePublicIds;
      }

      const updatedProduct = await prisma.product.update({
        where: { id: Number(id) },
        data: updateData,
    });
      res.status(200).json(updatedProduct);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

// delete a product by id
export const deleteProductById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({
      message: "Product deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};

//fetch products by category
export const fetchProductsByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get the category and its subcategories
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      res.status(404).json({ 
        error: "Category not found",
        success: false 
      });
      return;
    }

    // Get all category IDs (main category + subcategories)
    const categoryIds = [
      category.id,
      ...category.subcategories.map((sub: { id: number }) => sub.id)
    ];

    const products = await prisma.product.findMany({
      where: {
        categoryId: {
          in: categoryIds
        }
      },
      include: {
        brand: true,
        model: true,
        category: true,
        partNumbers: true
      },
      skip,
      take: parseInt(limit as string),
      orderBy: { [sortBy as string]: sortOrder }
    });

    const total = await prisma.product.count({
      where: {
        categoryId: {
          in: categoryIds
        }
      }
    });

    res.json({
      products,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ 
      error: "Failed to fetch products",
      success: false 
    });
  }
};

// Upload images for a product by part number
export const uploadImagesByPartNumber = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { partNumber } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: "No images provided" 
      });
      return;
    }

    // Find product by part number
    const product = await prisma.product.findFirst({
      where: {
        partNumbers: {
          some: {
            number: partNumber
          }
        }
      },
      include: {
        partNumbers: true
      }
    });

    if (!product) {
      res.status(404).json({ 
        success: false, 
        error: "Product not found with the given part number" 
      });
      return;
    }

    // Upload images to Cloudinary
    const uploadPromises = files.map((file) => {
      return cloudinary.uploader.upload(file.path, {
        folder: "products",
        public_id: `${partNumber}_${Date.now()}`,
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    const imageUrls = uploadResults.map((result) => result.secure_url);
    const imagePublicIds = uploadResults.map((result) => result.public_id);

    // Update product with new images
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: [...product.imageUrl, ...imageUrls],
        imagePublicIds: [...(product.imagePublicIds || []), ...imagePublicIds],
      },
    });

    // Clean up uploaded files
    files.forEach((file) => {
      fs.unlinkSync(file.path);
    });

    res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to upload images" 
    });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    console.log('Search request received:', { search, page, limit, sortBy, sortOrder });

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        {
          partNumbers: {
            some: {
              number: { contains: search as string, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    console.log('Search query:', where);

    const products = await prisma.product.findMany({
      where,
      include: { 
        brand: true, 
        model: true, 
        category: true,
        partNumbers: true
      },
      skip,
      take: parseInt(limit as string),
      orderBy: { [sortBy as string]: sortOrder },
    });

    console.log('Found products:', products.length);

    const total = await prisma.product.count({ where });

    res.json({
      products,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error) {
    console.error('Error in searchProducts:', error);
    res.status(500).json({ 
      error: "Failed to fetch products",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
