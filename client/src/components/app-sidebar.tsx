import { Home, Image, ShoppingBag, Users, LayoutDashboard, BookOpen, LogIn, LogOut, Shield, Brush, Calendar } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Virtual Gallery",
    url: "/gallery",
    icon: Image,
  },
  {
    title: "Exhibitions",
    url: "/exhibitions",
    icon: Calendar,
  },
  {
    title: "Store",
    url: "/store",
    icon: ShoppingBag,
  },
  {
    title: "Artists",
    url: "/artists",
    icon: Users,
  },
  {
    title: "Blog",
    url: "/blog",
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileSidebar = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3" data-testid="link-logo" onClick={closeMobileSidebar}>
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight">ArtVerse</h1>
            <p className="text-xs text-muted-foreground">Virtual Art Experience</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url} onClick={closeMobileSidebar}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAuthenticated && user?.role === "user" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/dashboard"}
                    data-testid="link-nav-artist-dashboard"
                  >
                    <Link href="/dashboard" onClick={closeMobileSidebar}>
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Artist Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAuthenticated && user?.role === "curator" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/curator"}
                    data-testid="link-nav-curator-dashboard"
                  >
                    <Link href="/curator" onClick={closeMobileSidebar}>
                      <Brush className="w-4 h-4" />
                      <span>Curator Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAuthenticated && user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    data-testid="link-nav-admin-dashboard"
                  >
                    <Link href="/admin" onClick={closeMobileSidebar}>
                      <Shield className="w-4 h-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate" title={user.email ?? undefined}>
              {user.firstName || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Link href="/auth" onClick={closeMobileSidebar}>
            <Button variant="outline" size="sm" className="w-full">
              <LogIn className="w-4 h-4 mr-2" />
              Sign in
            </Button>
          </Link>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Discover. Collect. Create.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
