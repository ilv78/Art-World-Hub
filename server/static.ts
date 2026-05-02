import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { resolveMetaTags, injectMetaTags } from "./meta";

// Paths under these prefixes serve static files (or are handled by API
// routes registered earlier). When a request to one of these paths reaches
// the SPA catch-all, it means the file was not found / route didn't match —
// we MUST return 404 instead of falling through to the SPA's index.html.
// Without this guard, a request like /uploads/artworks/missing.webp would
// receive HTML with the 30-day Cache-Control header from #555 and cache a
// bogus "image-but-actually-HTML" response in browsers for 30 days.
const STATIC_404_PREFIXES = ["/uploads/", "/api/", "/assets/"];

function shouldReturn404ForStaticMiss(url: string): boolean {
  return STATIC_404_PREFIXES.some((p) => url.startsWith(p));
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Cache the raw HTML template in memory
  const templateHtml = fs.readFileSync(
    path.resolve(distPath, "index.html"),
    "utf-8",
  );

  // Disable automatic index.html serving so all HTML requests go through the
  // catch-all below, which injects meta tags and JSON-LD before serving.
  app.use(express.static(distPath, { index: false }));

  // SPA catch-all with meta tag injection
  app.use("/{*path}", async (req, res) => {
    if (shouldReturn404ForStaticMiss(req.originalUrl)) {
      return res.status(404).end();
    }
    const meta = await resolveMetaTags(req.originalUrl);
    const html = injectMetaTags(templateHtml, meta);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}

export const __testing = { shouldReturn404ForStaticMiss, STATIC_404_PREFIXES };
