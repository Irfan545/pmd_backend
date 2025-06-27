import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@gmail.com";
  const password = "admin123";
  const name = "SUPER_ADMIN";
  const existingUser = await prisma.user.findFirst({
    where: {
      role: "SUPER_ADMIN",
    },
  });

  if (existingUser) {
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const superAdminUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "SUPER_ADMIN",
    },
  });
}

main();