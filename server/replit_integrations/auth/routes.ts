import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { authLogger as logger } from "../../logger";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const claims = req.user?.claims;
      const userId = claims?.sub;
      const email = claims?.email;

      const user = email
        ? await authStorage.getUserByEmail(email)
        : userId
          ? await authStorage.getUser(userId)
          : undefined;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Never send password hash to client
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      logger.error({ err: error }, "Error fetching user");
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
