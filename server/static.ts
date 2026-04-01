import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { resolveMetaTags, injectMetaTags } from "./meta";

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
    const meta = await resolveMetaTags(req.originalUrl);
    const html = injectMetaTags(templateHtml, meta);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
