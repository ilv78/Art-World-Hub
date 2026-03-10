import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

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
      secure: true,
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

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientId = getClientId();
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    console.warn(
      "[auth] OIDC_CLIENT_ID / OIDC_CLIENT_SECRET not set; auth routes will be disabled"
    );
    return;
  }

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

  const ensureStrategy = (domain: string) => {
    const strategyName = `oidc:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      assertHostAllowed(req.hostname);
    } catch (e) {
      return res.status(400).json({ message: "Invalid host" });
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`oidc:${req.hostname}`, {
      prompt: "consent",
      access_type: "offline",
      scope: ["openid", "email", "profile"],
    } as any)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    try {
      assertHostAllowed(req.hostname);
    } catch (e) {
      return res.status(400).json({ message: "Invalid host" });
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`oidc:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // @ts-expect-error session.destroy exists at runtime
      req.session?.destroy(() => {
        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (typeof (req as any).isAuthenticated !== "function") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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
