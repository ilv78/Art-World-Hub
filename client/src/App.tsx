import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { PublicLayout } from "@/components/public-layout";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import Store from "@/pages/store";
import Auctions from "@/pages/auctions";
import Artists from "@/pages/artists";
import ArtistDashboard from "@/pages/artist-dashboard";
import ArtistProfile from "@/pages/artist-profile";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import ArtworkDetail from "@/pages/artwork-detail";
import AuthPage from "@/pages/auth-page";
import SetPassword from "@/pages/set-password";
import AdminPage from "@/pages/admin";
import CuratorDashboard from "@/pages/curator-dashboard";
import CuratorGalleryPage from "@/pages/curator-gallery";
import Exhibitions from "@/pages/exhibitions";
import Changelog from "@/pages/changelog";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/exhibitions" component={Exhibitions} />
      <Route path="/store" component={Store} />
      <Route path="/auctions" component={Auctions} />
      <Route path="/artists" component={Artists} />
      <Route path="/artists/:id" component={ArtistProfile} />
      <Route path="/artworks/:slug" component={ArtworkDetail} />
      <Route path="/dashboard" component={ArtistDashboard} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogPost} />
      <Route path="/curator" component={CuratorDashboard} />
      <Route path="/curator-gallery/:id" component={CuratorGalleryPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/set-password" component={SetPassword} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <ScrollToTop />
            <PublicLayout>
              <Router />
            </PublicLayout>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
