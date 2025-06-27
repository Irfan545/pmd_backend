import { Request, Response } from "express";
import { prisma } from "../app";
import { Prisma } from "@prisma/client";

// Recursive function to include all nested subcategories (removed type filtering)
const includeSubcategories = {
  subcategories: {
    orderBy: {
      name: 'asc' as const
    },
    include: {
      subcategories: {
        orderBy: {
          name: 'asc' as const
        },
        include: {
          subcategories: {
            orderBy: {
              name: 'asc' as const
            },
            include: {
              subcategories: {
                orderBy: {
                  name: 'asc' as const
                },
                include: {
                  subcategories: {
                    orderBy: {
                      name: 'asc' as const
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const getMainHomeCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching main categories...');
    const mainCategories = await prisma.category.findMany({
      where: {
        parentId: null
        // Removed type: 'home_page' filter
      },
      orderBy: {
        name: 'asc'
      },
      include: includeSubcategories
    });
    
    // Log the structure of categories for debugging
    // const debugCategories = mainCategories.map(cat => ({
    //   name: cat.name,
    //   subcategories: cat.subcategories?.map(sub => ({
    //     name: sub.name,
    //     subcategories: sub.subcategories?.map(subsub => ({
    //       name: subsub.name,
    //       subcategories: subsub.subcategories?.map(subsubsub => ({
    //         name: subsubsub.name
    //       }))
    //     }))
    //   }))
    // }));
    // console.log('Category structure:', JSON.stringify(debugCategories, null, 2));

    res.status(200).json(mainCategories);
  } catch (error) {
    console.error('Error in getMainHomeCategories:', error);
    res.status(500).json({ error: "Failed to fetch home page categories", success: false });
  }
};

export const getHomeSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`Fetching subcategories for parent ID: ${id}`);
    const subcategories = await prisma.category.findMany({
      where: {
        parentId: parseInt(id)
        // Removed type: 'home_page' filter
      },
      orderBy: {
        name: 'asc'
      },
      include: includeSubcategories
    });
    console.log('Found subcategories:', JSON.stringify(subcategories, null, 2));
    res.status(200).json(subcategories);
  } catch (error) {
    console.error('Error in getHomeSubcategories:', error);
    res.status(500).json({ error: "Failed to fetch home page subcategories", success: false });
  }
};

export const getHomeProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const products = await prisma.product.findMany({
      where: {
        categoryId: parseInt(id)
        // Removed category type filter
      },
      include: {
        brand: true,
        model: true,
        category: true
      },
      skip,
      take: parseInt(limit as string)
    });

    const total = await prisma.product.count({
      where: {
        categoryId: parseInt(id)
        // Removed category type filter
      }
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products', success: false });
  }
}; 