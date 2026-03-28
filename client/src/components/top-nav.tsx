import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { PalettePicker } from "@/components/palette-picker";
import { CartSheet } from "@/components/cart-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogIn,
  LogOut,
  Menu,
  X,
  Search,
  LayoutDashboard,
} from "lucide-react";

const navLinks = [
  { title: "Gallery", url: "/gallery" },
  { title: "Exhibitions", url: "/exhibitions" },
  { title: "Store", url: "/store" },
  { title: "Artists", url: "/artists" },
  { title: "Blog", url: "/blog" },
];

export function TopNav() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dashboardUrl =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "curator"
        ? "/curator"
        : "/dashboard";

  const dashboardLabel =
    user?.role === "admin"
      ? "Admin Dashboard"
      : user?.role === "curator"
        ? "Curator Dashboard"
        : "Artist Dashboard";

  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"
    : "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/store?search=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg" style={{ fontFamily: "'Tenor Sans', sans-serif" }}>V9</span>
          </div>
          <span className="text-xl tracking-tight hidden sm:inline" style={{ fontFamily: "'Tenor Sans', sans-serif" }}>
            Vernis<span className="ml-0.5">9</span>
          </span>
        </Link>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location === link.url;
            return (
              <Link key={link.url} href={link.url}>
                <button
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.title}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            title="Search artworks"
          >
            <Search className="h-5 w-5" />
          </Button>

          <CartSheet />
          <PalettePicker />
          <ThemeToggle />

          {/* User menu (desktop) */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-xs font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">
                    {user.firstName
                      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                      : user.email}
                  </p>
                  {user.firstName && user.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={dashboardUrl} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {dashboardLabel}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = location === link.url;
            return (
              <Link
                key={link.url}
                href={link.url}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.title}
                </button>
              </Link>
            );
          })}
          {isAuthenticated && user ? (
            <>
              <Link
                href={dashboardUrl}
                onClick={() => setMobileMenuOpen(false)}
              >
                <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  {dashboardLabel}
                </button>
              </Link>
              <button
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2"
                onClick={() => logout()}
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[480px] top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search artworks, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
