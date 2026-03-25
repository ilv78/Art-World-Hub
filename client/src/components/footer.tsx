import { Link } from "wouter";
import { Instagram, Twitter, Facebook, Youtube, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const navLinks = [
  { title: "Gallery", url: "/gallery" },
  { title: "Store", url: "/store" },
  { title: "Exhibitions", url: "/exhibitions" },
  { title: "Artists", url: "/artists" },
  { title: "Blog", url: "/blog" },
];

const artistLinks = [
  { title: "Join as Artist", url: "/auth" },
  { title: "Artist Dashboard", url: "/dashboard" },
];

const socialLinks = [
  { icon: Instagram, label: "Instagram", url: "#" },
  { icon: Twitter, label: "X / Twitter", url: "#" },
  { icon: Facebook, label: "Facebook", url: "#" },
  { icon: Youtube, label: "YouTube", url: "#" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/40">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand + tagline + social */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif font-bold text-lg">
                  A
                </span>
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">
                ArtVerse
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Discover. Collect. Create.
              <br />
              A virtual gallery connecting artists and collectors worldwide.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, label, url }) => (
                <a
                  key={label}
                  href={url}
                  aria-label={label}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="font-serif font-semibold text-sm mb-4">Explore</h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: For Artists */}
          <div>
            <h3 className="font-serif font-semibold text-sm mb-4">
              For Artists
            </h3>
            <ul className="space-y-2.5">
              {artistLinks.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="font-serif font-semibold text-sm mb-4">
              Stay Updated
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get notified about new exhibitions and featured artists.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2"
            >
              <Input
                type="email"
                placeholder="your@email.com"
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; {year} ArtVerse. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/changelog"
              className="hover:text-foreground transition-colors"
            >
              Changelog
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
