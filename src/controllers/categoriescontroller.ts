import { Response } from "express";
import { prisma } from "../lib/prisma";

export const getCategories = async (res: Response): Promise<void> => {
  try {
    const fetchCategories = await prisma.category.findMany();
    res.status(200).json(fetchCategories);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal Server Error", success: false });
  }
};
