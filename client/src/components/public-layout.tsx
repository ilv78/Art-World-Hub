import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { PalettePicker } from "@/components/palette-picker";
import { CartSheet } from "@/components/cart-sheet";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { title: "Gallery", url: "/gallery" },
  { title: "Exhibitions", url: "/exhibitions" },
  { title: "Store", url: "/store" },
  { title: "Artists", url: "/artists" },
  { title: "Blog", url: "/blog" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardUrl = user?.role === "admin"
    ? "/admin"
    : user?.role === "curator"
      ? "/curator"
      : "/dashboard";

  const dashboardLabel = user?.role === "admin"
    ? "Admin Dashboard"
    : user?.role === "curator"
      ? "Curator Dashboard"
      : "Artist Dashboard";

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-bold text-lg">A</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline">
              ArtVerse
            </span>
          </Link>

          {/* Center: Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.url} href={link.url}>
                <Button
                  variant={location === link.url ? "secondary" : "ghost"}
                  size="sm"
                  className="text-sm"
                >
                  {link.title}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <CartSheet />
            <PalettePicker />
            <ThemeToggle />
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href={dashboardUrl}>
                  <Button size="sm" className="text-sm">
                    {dashboardLabel}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in
                </Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.url} href={link.url} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={location === link.url ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                >
                  {link.title}
                </Button>
              </Link>
            ))}
            {isAuthenticated && user ? (
              <>
                <Link href={dashboardUrl} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    {dashboardLabel}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </>
            ) : (
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start text-sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main content — full width */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer placeholder — will be built in #238 */}
      <footer className="border-t py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <p>Discover. Collect. Create.</p>
          <Link href="/changelog" className="hover:underline">
            Changelog
          </Link>
        </div>
      </footer>
    </div>
  );
}
