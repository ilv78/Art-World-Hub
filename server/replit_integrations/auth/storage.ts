import { users, magicLinks, type User, type UpsertUser, type MagicLink } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and, isNull, gt } from "drizzle-orm";

// Interface for auth storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  setPassword(userId: string, hashedPassword: string): Promise<void>;
  createMagicLink(email: string, token: string, expiresAt: Date): Promise<MagicLink>;
  consumeMagicLink(token: string): Promise<MagicLink | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Use email as the stable unique key when available.
    // Do NOT update the primary key `id` on email conflict.
    const hasEmail = !!userData.email;

    if (hasEmail) {
      const { id: _id, ...userDataNoId } = userData as any;
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.email,
          set: {
            ...userDataNoId,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();

    return user;
  }

  async setPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createMagicLink(email: string, token: string, expiresAt: Date): Promise<MagicLink> {
    const [link] = await db
      .insert(magicLinks)
      .values({ email, token, expiresAt })
      .returning();
    return link;
  }

  async consumeMagicLink(token: string): Promise<MagicLink | undefined> {
    // Find valid, unused, non-expired token
    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          isNull(magicLinks.usedAt),
          gt(magicLinks.expiresAt, new Date())
        )
      );

    if (!link) return undefined;

    // Mark as used
    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, link.id));

    return link;
  }
}

export const authStorage = new AuthStorage();
