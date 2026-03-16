import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShoppingCart, Calendar, Ruler, Palette, MapPin } from "lucide-react";
import type { ArtworkWithArtist } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

interface ArtworkDetailDialogProps {
  artwork: ArtworkWithArtist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtworkDetailDialog({
  artwork,
  open,
  onOpenChange,
}: ArtworkDetailDialogProps) {
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  if (!artwork) return null;

  const isInCart = items.some((item) => item.artwork.id === artwork.id);

  const handleAddToCart = () => {
    if (!isInCart && artwork.isForSale) {
      addItem(artwork);
      toast({
        title: "Added to cart",
        description: `"${artwork.title}" has been added to your cart.`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted min-h-[200px]">
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-auto object-contain max-h-[60vh]"
            />
            {!artwork.isForSale && (
              <Badge className="absolute top-3 right-3" variant="secondary">
                Sold
              </Badge>
            )}
          </div>

          <div className="flex flex-col">
            <DialogHeader className="text-left">
              <DialogTitle className="font-serif text-2xl leading-tight">
                {artwork.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={artwork.artist.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {artwork.artist.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {artwork.artist.name}
                    </p>
                    {artwork.artist.country && (
                      <p className="text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {artwork.artist.country}
                      </p>
                    )}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4" />

            <div className="space-y-4 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {artwork.description}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span>{artwork.medium}</span>
                </div>
                {artwork.dimensions && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span>{artwork.dimensions}{!/cm/i.test(artwork.dimensions) ? ' cm' : ''}</span>
                  </div>
                )}
                {artwork.year && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{artwork.year}</span>
                  </div>
                )}
                <Badge variant="outline" className="w-fit">
                  {artwork.category}
                </Badge>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              {artwork.isForSale && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-detail-price">
                    {formatPrice(artwork.price)}
                  </span>
                </div>
              )}

              {artwork.isForSale ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isInCart}
                  data-testid="button-detail-add-cart"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {isInCart ? "Already in Cart" : "Add to Cart"}
                </Button>
              ) : (
                <Button className="w-full" size="lg" disabled>
                  Sold Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
