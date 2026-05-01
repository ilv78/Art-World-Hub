import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { PublicLayout } from "@/components/public-layout";

// Route components are lazy-loaded so each ships its own chunk; the home-page
// initial bundle no longer carries the 3D gallery, dashboards, or admin code.
// (#558)
const Home = lazy(() => import("@/pages/home"));
const Gallery = lazy(() => import("@/pages/gallery"));
const Store = lazy(() => import("@/pages/store"));
const Auctions = lazy(() => import("@/pages/auctions"));
const Artists = lazy(() => import("@/pages/artists"));
const ArtistDashboard = lazy(() => import("@/pages/artist-dashboard"));
const ArtistProfile = lazy(() => import("@/pages/artist-profile"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const ArtworkDetail = lazy(() => import("@/pages/artwork-detail"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const SetPassword = lazy(() => import("@/pages/set-password"));
const AdminPage = lazy(() => import("@/pages/admin"));
const CuratorDashboard = lazy(() => import("@/pages/curator-dashboard"));
const CuratorGalleryPage = lazy(() => import("@/pages/curator-gallery"));
const Exhibitions = lazy(() => import("@/pages/exhibitions"));
const Changelog = lazy(() => import("@/pages/changelog"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Koningsdag = lazy(() => import("@/pages/koningsdag"));
const NotFound = lazy(() => import("@/pages/not-found"));

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

// Suspense fallback shown during route-chunk fetches. min-h reserves layout
// space so the chrome (TopNav/Footer) doesn't reflow on chunk swap.
function RouteLoadingFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh]"
      data-testid="route-loading"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Routes rendered without the standard public chrome (TopNav/Footer/BottomTabs).
const BARE_ROUTES = new Set(["/koningsdag"]);

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/exhibitions" component={Exhibitions} />
        <Route path="/store" component={Store} />
        <Route path="/auctions" component={Auctions} />
        <Route path="/artists" component={Artists} />
        <Route path="/artists/:slug" component={ArtistProfile} />
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
        <Route path="/koningsdag" component={Koningsdag} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Shell() {
  const [location] = useLocation();
  if (BARE_ROUTES.has(location)) {
    return <Router />;
  }
  return (
    <PublicLayout>
      <Router />
    </PublicLayout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <ScrollToTop />
            <Shell />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
