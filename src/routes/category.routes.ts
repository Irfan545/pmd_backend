import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { RequestHandler } from "express";
import { searchProducts } from '../controllers/productController';
import { importNewCategories } from '../scripts/importNewCategories';

const router = Router();
const prisma = new PrismaClient();

// Import new categories from JSON file
router.post("/import", async (req, res) => {
  try {
    console.log('Starting category import via API...');
    await importNewCategories();
    res.json({ success: true, message: "Categories imported successfully" });
  } catch (error) {
    console.error('Error importing categories:', error);
    res.status(500).json({ error: "Failed to import categories" });
  }
});

// Get all main categories (categories without parents)
router.get("/main", async (req, res) => {
  try {
    const mainCategories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        subcategories: true,
      },
    });
    res.json(mainCategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get subcategories for a specific category
router.get("/:id/subcategories", async (req, res) => {
  try {
    const { id } = req.params;
    const subcategories = await prisma.category.findMany({
      where: {
        parentId: parseInt(id),
      },
    });
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// Get products by category ID
const getProductsByCategory: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get the category and its subcategories
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
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
      take: parseInt(limit as string)
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
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

router.get('/:id/products', getProductsByCategory);

export default router;
