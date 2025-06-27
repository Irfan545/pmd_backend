import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../app";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/authMiddleware";

function generateToken(userId: number, email: string, role: string) {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "60m" }
  );
  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
  // Implement your token generation logic here
}

async function setTokenInCookie(
  res: Response,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  // Set the access token and refresh token in cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, error: "User already exists!" });

      return;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "USER", // Default role
      },
    });
    res.status(201).json({
      message: "User created successfully",
      success: true,
      userId: user.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating user" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found for email:', email);
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const { accessToken, refreshToken } = generateToken(
      user.id,
      user.email,
      user.role
    );
    console.log('Generated tokens for user:', email);
    
    // Set tokens in cookies
    await setTokenInCookie(res, accessToken, refreshToken);
    console.log('Set cookies for user:', email);

    res.status(200).json({
      message: "Login successful",
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Error logging in" });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: "No refresh token found!" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { refreshToken: refreshToken },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "User not found!" });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateToken(
      user.id,
      user.email,
      user.role
    );

    await setTokenInCookie(res, accessToken, newRefreshToken);
    
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: "Error refreshing token" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      res
        .status(401)
        .json({ success: false, error: "No refresh token found!" });
      return;
    }
    // await prisma.user.update({
    //   where: { refreshToken },
    //   data: { refreshToken: null },
    // });
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error logging out" });
  }
};

export const verify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
