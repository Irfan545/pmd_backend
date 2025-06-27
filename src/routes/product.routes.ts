import { Router, RequestHandler } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authJWT, isSuperAdmin } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { searchProducts, fetchProductsByCategory } from '../controllers/productController';

const router = Router();
const prisma = new PrismaClient();

// Add search route first
router.get('/search', searchProducts as RequestHandler);

// Add route for fetching products by category
router.get('/category/:id', fetchProductsByCategory as RequestHandler);

// Get product by ID - this should come before the general route
const getProductById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        brand: true,
        model: true,
        category: true,
        compatibleEngine: true
      }
    });
    
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

router.get('/:id', getProductById);

// Get all products with pagination and filters
const getAllProducts: RequestHandler = async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10',
      categoryId,
      brandId,
      modelId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};
    
    // Apply filters
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (brandId) where.brandId = parseInt(brandId as string);
    if (modelId) where.modelId = parseInt(modelId as string);
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        {
          category: {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              {
                parent: {
                  name: { contains: search as string, mode: 'insensitive' }
                }
              }
            ]
          }
        },
        {
          partNumbers: {
            some: {
              number: { contains: search as string, mode: 'insensitive' }
            }
          }
        }
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        brand: {
          select: {
            id: true,
            name: true
          }
        },
        model: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        partNumbers: {
          select: {
            id: true,
            number: true,
            type: true,
            manufacturer: true,
            isOriginal: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      },
      skip,
      take: parseInt(limit as string)
    });
    
    const total = await prisma.product.count({ where });
    
    res.json({
      products,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

router.get('/', getAllProducts);

// Admin endpoint to get all products without pagination
const getAllProductsForAdmin: RequestHandler = async (req, res) => {
  try {
    const { 
      categoryId,
      brandId,
      modelId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};
    
    // Apply filters
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (brandId) where.brandId = parseInt(brandId as string);
    if (modelId) where.modelId = parseInt(modelId as string);
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        {
          category: {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              {
                parent: {
                  name: { contains: search as string, mode: 'insensitive' }
                }
              }
            ]
          }
        },
        {
          partNumbers: {
            some: {
              number: { contains: search as string, mode: 'insensitive' }
            }
          }
        }
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }
    
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        imageUrl: true,
        isFeatured: true,
        brand: {
          select: {
            id: true,
            name: true
          }
        },
        model: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        partNumbers: {
          select: {
            id: true,
            number: true,
            type: true,
            manufacturer: true,
            isOriginal: true
          }
        }
      },
      orderBy: {
        [sortBy as string]: sortOrder
      }
    });
    
    const total = await prisma.product.count({ where });
    
    res.json({
      products,
      total
    });
  } catch (error) {
    console.error('Error fetching all products for admin:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

router.get('/admin/all', getAllProductsForAdmin);

// Upload images by part number
const uploadImagesByPartNumber: RequestHandler = async (req, res) => {
  try {
    const { partNumber } = req.params;
    const files = req.files as Express.Multer.File[];

    console.log('Received files:', files);
    console.log('Part number:', partNumber);

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

    console.log('Found product:', product);

    if (!product) {
      res.status(404).json({ 
        success: false, 
        error: "Product not found with the given part number" 
      });
      return;
    }

    try {
      // Upload images to Cloudinary
      const uploadPromises = files.map((file) => {
        console.log('Uploading file:', file.path);
        return cloudinary.uploader.upload(file.path, {
          folder: "products",
          public_id: `${partNumber}_${Date.now()}`,
        });
      });

      const uploadResults = await Promise.all(uploadPromises);
      console.log('Cloudinary upload results:', uploadResults);

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
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error deleting file:', file.path, error);
        }
      });

      res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        product: updatedProduct,
      });
    } catch (uploadError) {
      console.error('Error during upload process:', uploadError);
      // Clean up uploaded files in case of error
      files.forEach((file) => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error deleting file:', file.path, error);
        }
      });
      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload images" 
    });
  }
};

router.post(
  '/upload-images/:partNumber',
  authJWT,
  isSuperAdmin,
  upload.array('images', 5),
  uploadImagesByPartNumber
);

// Get products by category
const getProductsByCategory: RequestHandler = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { 
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const products = await prisma.product.findMany({
      where: {
        categoryId: parseInt(categoryId)
      },
      include: {
        brand: true,
        model: true,
        category: true
      },
      orderBy: {
        [sortBy as string]: sortOrder
      },
      skip,
      take: parseInt(limit as string)
    });
    
    const total = await prisma.product.count({
      where: {
        categoryId: parseInt(categoryId)
      }
    });
    
    res.json({
      products,
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
};

router.get('/category/:categoryId', getProductsByCategory);

export default router;