import { Link, useLocation } from "wouter";
import { Home, Image, Store, Users, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/cart-store";

const tabs = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Gallery", icon: Image, href: "/gallery" },
  { label: "Store", icon: Store, href: "/store" },
  { label: "Artists", icon: Users, href: "/artists" },
];

export function BottomTabs() {
  const [location] = useLocation();
  const itemCount = useCartStore((s) => s.items.length);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== "/" && location.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
        {/* Cart tab with badge */}
        <Link
          href="/store"
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
            location === "/checkout"
              ? "text-primary"
              : "text-muted-foreground"
          }`}
          onClick={(e) => {
            e.preventDefault();
            // Trigger cart sheet by clicking the cart button in top nav
            const cartBtn = document.querySelector('[data-testid="button-cart"]') as HTMLButtonElement;
            cartBtn?.click();
          }}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-2 -right-3 h-4 min-w-4 flex items-center justify-center p-0 text-[9px]">
                {itemCount}
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </Link>
      </div>
    </nav>
  );
}
