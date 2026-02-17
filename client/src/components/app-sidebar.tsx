import { Home, Image, ShoppingBag, Users, LayoutDashboard } from "lucide-react";
import { useLocation, Link } from "wouter";
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
    title: "Artist Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
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
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          Discover. Collect. Create.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
