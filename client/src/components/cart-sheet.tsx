import { ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart-store";
import { useState } from "react";
import { CheckoutDialog } from "./checkout-dialog";

export function CartSheet() {
  const { items, removeItem, getTotal, getItemCount, clearCart } = useCartStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const itemCount = getItemCount();
  const total = getTotal();

  const handleCheckoutSuccess = () => {
    clearCart();
    setIsCheckoutOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                data-testid="badge-cart-count"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-serif">Your Cart</SheetTitle>
            <SheetDescription>
              {itemCount === 0
                ? "Your cart is empty"
                : `${itemCount} item${itemCount > 1 ? "s" : ""} in your cart`}
            </SheetDescription>
          </SheetHeader>

          {itemCount > 0 ? (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                  {items.map((item) => (
                    <div
                      key={item.artwork.id}
                      className="flex gap-4 items-start"
                      data-testid={`cart-item-${item.artwork.id}`}
                    >
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.artwork.imageUrl}
                          alt={item.artwork.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {item.artwork.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          by {item.artwork.artist.name}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {parseInt(item.artwork.price).toLocaleString()} &euro;
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.artwork.id)}
                        data-testid={`button-remove-${item.artwork.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="pt-4 space-y-4">
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{total.toLocaleString()} &euro;</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Shipping</span>
                  <span className="text-sm">Calculated at checkout</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary" data-testid="text-cart-total">
                    {total.toLocaleString()} &euro;
                  </span>
                </div>
                <SheetFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => clearCart()}
                    data-testid="button-clear-cart"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setIsCheckoutOpen(true)}
                    data-testid="button-checkout"
                  >
                    Checkout
                  </Button>
                </SheetFooter>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="font-serif text-lg font-medium mb-2">No items yet</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Browse our store and add some beautiful artworks to your collection
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        items={items}
        total={total}
        onSuccess={handleCheckoutSuccess}
      />
    </>
  );
}
