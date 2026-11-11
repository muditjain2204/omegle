import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "omegle-secret-jwt-key";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        profile: true,
        trialEntitlement: true,
        usageBalance: true,
      },
    });

    if (!user || user.isBanned) {
      return res.status(403).json({ error: "User is banned or not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

