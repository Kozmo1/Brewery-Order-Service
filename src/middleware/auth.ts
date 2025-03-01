import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    if (!config.jwtSecret) {
      res.status(500).json({ message: "JWT secret is not defined" });
      return;
    }
    const decoded = jwt.verify(token, config.jwtSecret) as unknown as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};