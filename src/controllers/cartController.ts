import { Response } from "express";
import { Request } from "express";
import { prisma } from "../app";
import { PrismaClient } from "@prisma/client";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
  };
}

type CartItem = {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

type Cart = {
  id: number;
  userId: number;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
};

export const addToCart = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { productId, quantity } = req.body;

    console.log('Add to cart request:', { userId, productId, quantity });

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const cart = await (prisma as any).cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }) as Cart;

    console.log('Cart found/created:', cart);

    const cartItem = await (prisma as any).cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
    }) as CartItem;

    console.log('Cart item created/updated:', cartItem);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        price: true,
        imageUrl: true,
      },
    });

    console.log('Product found:', product);

    const responseItem = {
      id: cartItem.id,
      productId: cartItem.productId,
      name: product?.name,
      price: product?.price,
      image: product?.imageUrl[0],
      quantity: cartItem.quantity,
    };

    res.status(201).json({
      success: true,
      data: responseItem,
    });
  } catch (e) {
    console.error('Add to cart error:', e);
    res.status(500).json({
      success: false,
      message: "Some error occured!",
    });
  }
};

export const getCart = async (
  req: AuthenticatedRequest,
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

    const cart = await (prisma as any).cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    }) as Cart;

    if (!cart) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    const cartItemsWithProducts = await Promise.all(
      cart.items.map(async (item: CartItem) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            name: true,
            price: true,
            imageUrl: true,
          },
        });

        return {
          id: item.id,
          productId: item.productId,
          name: product?.name,
          price: product?.price,
          image: product?.imageUrl[0],
          quantity: item.quantity,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: cartItemsWithProducts,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart!",
    });
  }
};

export const removeFromCart = async (
  req: AuthenticatedRequest,
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

    await (prisma as any).cartItem.delete({
      where: {
        id: parseInt(id),
        cart: { userId },
      },
    });

    res.status(200).json({
      success: true,
      message: "Item is removed from cart",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to remove from cart!",
    });
  }
};

export const updateCartItemQuantity = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthenticated user",
      });

      return;
    }

    const updatedItem = await (prisma as any).cartItem.update({
      where: {
        id: parseInt(id),
        cart: { userId },
      },
      data: { quantity },
    }) as CartItem;

    const product = await prisma.product.findUnique({
      where: { id: updatedItem.productId },
      select: {
        name: true,
        price: true,
        imageUrl: true,
      },
    });

    const responseItem = {
      id: updatedItem.id,
      productId: updatedItem.productId,
      name: product?.name,
      price: product?.price,
      image: product?.imageUrl[0],
      quantity: updatedItem.quantity,
    };

    res.json({
      success: true,
      data: responseItem,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to update cart item quantity",
    });
  }
};

export const clearEntireCart = async (
  req: AuthenticatedRequest,
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

    await (prisma as any).cartItem.deleteMany({
      where: {
        cart: { userId },
      },
    });

    res.status(200).json({
      success: true,
      message: "cart cleared successfully!",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Failed to clear cart!",
    });
  }
};
