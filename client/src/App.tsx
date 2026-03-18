import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { PalettePicker } from "@/components/palette-picker";
import { CartSheet } from "@/components/cart-sheet";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import Store from "@/pages/store";
import Auctions from "@/pages/auctions";
import Artists from "@/pages/artists";
import ArtistDashboard from "@/pages/artist-dashboard";
import ArtistProfile from "@/pages/artist-profile";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import AuthPage from "@/pages/auth-page";
import SetPassword from "@/pages/set-password";
import AdminPage from "@/pages/admin";
import CuratorDashboard from "@/pages/curator-dashboard";
import Changelog from "@/pages/changelog";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/store" component={Store} />
      <Route path="/auctions" component={Auctions} />
      <Route path="/artists" component={Artists} />
      <Route path="/artists/:id" component={ArtistProfile} />
      <Route path="/dashboard" component={ArtistDashboard} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogPost} />
      <Route path="/curator" component={CuratorDashboard} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/set-password" component={SetPassword} />
      <Route path="/changelog" component={Changelog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="sticky top-0 z-40 flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <CartSheet />
                    <PalettePicker />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
