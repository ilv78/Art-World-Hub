import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { sendMagicLinkEmail } from "../../email";
import { z } from "zod";
import type { User } from "@shared/models/auth";

function buildSessionUser(user: { id: string; email: string | null; firstName: string | null; lastName: string | null }) {
  return {
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    },
  };
}

/**
 * Generic OIDC auth (used for Google OAuth in production).
 *
 * Required env vars:
 * - OIDC_CLIENT_ID
 * - OIDC_CLIENT_SECRET
 * - SESSION_SECRET
 * Optional:
 * - OIDC_ISSUER_URL (default: https://accounts.google.com)
 */

const getIssuerUrl = () => process.env.OIDC_ISSUER_URL ?? "https://accounts.google.com";
const getClientId = () => process.env.OIDC_CLIENT_ID;
const getClientSecret = () => process.env.OIDC_CLIENT_SECRET;

const getAllowedHosts = () => (process.env.OIDC_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

function assertHostAllowed(hostname: string) {
  const allowed = getAllowedHosts();
  if (allowed.length == 0) return;
  if (!allowed.includes(hostname)) {
    throw new Error(`Host not allowed for OIDC: ${hostname}`);
  }
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = getIssuerUrl();
    const clientId = getClientId();
    const clientSecret = getClientSecret();

    if (!clientId) throw new Error("OIDC_CLIENT_ID is not configured");
    if (!clientSecret) throw new Error("OIDC_CLIENT_SECRET is not configured");

    // IMPORTANT:
    // - openid-client v6 requires configuring client authentication so token exchange includes the client_secret.
    // - We use ClientSecretPost for simplicity.
    return await client.discovery(
      new URL(issuerUrl),
      clientId,
      clientSecret,
      client.ClientSecretPost(clientSecret)
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  // Google OIDC claims: sub, email, given_name, family_name, picture
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["given_name"] ?? claims["first_name"],
    lastName: claims["family_name"] ?? claims["last_name"],
    profileImageUrl: claims["picture"] ?? claims["profile_image_url"],
  });
}

// Build the origin (protocol + host + port) for callback URLs
function getOrigin(req: any): string {
  const proto = process.env.NODE_ENV === "production" ? "https" : req.protocol;
  const host = req.get("host"); // includes port if non-standard
  return `${proto}://${host}`;
}

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // --- Local (email + password) strategy ---
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await authStorage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, buildSessionUser(user));
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // --- Email auth routes ---

  // Sign up: send magic link
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email } = signupSchema.parse(req.body);

      // If user already has a password, they should log in instead
      const existing = await authStorage.getUserByEmail(email);
      if (existing?.password) {
        return res.status(409).json({ message: "Account already exists. Please sign in." });
      }

      // Generate magic link token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await authStorage.createMagicLink(email, token, expiresAt);

      // Send email
      const origin = getOrigin(req);
      await sendMagicLinkEmail(email, token, origin);

      res.json({ message: "Check your email for a verification link." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // Verify email: consume magic link token
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.redirect("/auth?error=invalid_token");
      }

      const link = await authStorage.consumeMagicLink(token);
      if (!link) {
        return res.redirect("/auth?error=expired_token");
      }

      // Create or get user
      const user = await authStorage.upsertUser({
        email: link.email,
        emailVerified: true,
      });

      req.login(buildSessionUser(user), (err) => {
        if (err) {
          console.error("Login after verify error:", err);
          return res.redirect("/auth?error=login_failed");
        }
        // Redirect to set-password page if no password yet
        if (!user.password) {
          return res.redirect("/auth/set-password");
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.redirect("/auth?error=verification_failed");
    }
  });

  // Set password (after magic link verification)
  app.post("/api/auth/set-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { password } = setPasswordSchema.parse(req.body);
      const userId = req.user.claims.sub;

      const hashedPassword = await bcrypt.hash(password, 12);
      await authStorage.setPassword(userId, hashedPassword);

      res.json({ message: "Password set successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Set password error:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Sign in with email + password
  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Logged in successfully" });
      });
    })(req, res, next);
  });

  // --- OIDC (Google OAuth) setup ---
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const googleEnabled = !!(clientId && clientSecret);

  // Public endpoint so the frontend knows which auth methods are available
  app.get("/api/auth/config", (_req, res) => {
    res.json({ googleEnabled });
  });

  if (!googleEnabled) {
    console.warn(
      "[auth] OIDC_CLIENT_ID / OIDC_CLIENT_SECRET not set; Google login will be disabled"
    );
  } else {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    const registeredStrategies = new Set<string>();

    const ensureStrategy = (host: string, origin: string) => {
      const strategyName = `oidc:${host}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile",
            callbackURL: `${origin}/api/callback`,
          },
          verify
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };

    app.get("/api/login/google", (req, res, next) => {
      const host = req.get("host")!;
      try {
        assertHostAllowed(req.hostname);
      } catch (e) {
        return res.status(400).json({ message: "Invalid host" });
      }
      ensureStrategy(host, getOrigin(req));
      passport.authenticate(`oidc:${host}`, {
        prompt: "consent",
        access_type: "offline",
        scope: ["openid", "email", "profile"],
      } as any)(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      const host = req.get("host")!;
      try {
        assertHostAllowed(req.hostname);
      } catch (e) {
        return res.status(400).json({ message: "Invalid host" });
      }
      ensureStrategy(host, getOrigin(req));
      passport.authenticate(`oidc:${host}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/auth?error=google_failed",
      })(req, res, next);
    });
  }

  // Keep /api/login as redirect to the auth page (for backwards compat)
  app.get("/api/login", (_req, res) => {
    res.redirect("/auth");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session?.destroy(() => {
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (typeof (req as any).isAuthenticated !== "function" || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Local auth users have no expires_at — session validity is managed by express-session TTL
  if (!user.expires_at) {
    return next();
  }

  // OIDC users — check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
