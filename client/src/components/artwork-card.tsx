import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye } from "lucide-react";
import type { ArtworkWithArtist } from "@shared/schema";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

interface ArtworkCardProps {
  artwork: ArtworkWithArtist;
  onViewDetails?: () => void;
  showAddToCart?: boolean;
}

export function ArtworkCard({ artwork, onViewDetails, showAddToCart = true }: ArtworkCardProps) {
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  const isInCart = items.some((item) => item.artwork.id === artwork.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isInCart && artwork.isForSale) {
      addItem(artwork);
      toast({
        title: "Added to cart",
        description: `"${artwork.title}" has been added to your cart.`,
      });
    }
  };

  const artworkUrl = `/artworks/${artwork.slug}`;

  return (
    <Card
      className="group overflow-visible hover-elevate cursor-pointer transition-transform duration-300"
      onClick={onViewDetails}
      data-testid={`card-artwork-${artwork.id}`}
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-t-md">
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
            data-testid={`button-view-${artwork.id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          {showAddToCart && artwork.isForSale && (
            <Button
              size="sm"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isInCart}
              data-testid={`button-add-cart-${artwork.id}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isInCart ? "In Cart" : "Add"}
            </Button>
          )}
        </div>
        {!artwork.isForSale && (
          <Badge className="absolute top-3 right-3" variant="secondary">
            Sold
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={artworkUrl}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 hover:text-primary transition-colors"
            >
              <h3 className="font-serif font-semibold text-base leading-tight line-clamp-1">
                {artwork.title}
              </h3>
            </Link>
            {artwork.year && (
              <span className="text-xs text-muted-foreground shrink-0">
                {artwork.year}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {artwork.artist.name}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1 min-w-0">
            <Badge variant="outline" className="text-xs">
              {artwork.medium}
            </Badge>
            {artwork.isForSale && (
              <span className="font-semibold text-primary text-sm truncate" data-testid={`text-price-${artwork.id}`}>
                {formatPrice(artwork.price)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
