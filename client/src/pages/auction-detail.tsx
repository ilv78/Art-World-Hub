import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Gavel, Clock, CheckCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow, isPast, isFuture } from "date-fns";
import type { AuctionWithArtwork, Bid } from "@shared/schema";
import { ShareButtons } from "@/components/share-buttons";
import { getCanonicalShareUrl } from "@/lib/share-urls";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

const bidSchema = z.object({
  bidderName: z.string().min(2, "Name must be at least 2 characters"),
  amount: z.number().positive("Bid amount must be positive"),
});

type BidFormValues = z.infer<typeof bidSchema>;

function getAuctionStatus(auction: AuctionWithArtwork) {
  const now = new Date();
  const startTime = new Date(auction.startTime);
  const endTime = new Date(auction.endTime);

  if (isFuture(startTime)) return "upcoming";
  if (isPast(endTime)) return "ended";
  return "active";
}

// The canonical, SEO-indexable auction detail page (#509) — backed by
// /api/public/auctions/:slug and server/meta.ts's /auctions/:slug Event+Offer
// branch. Bidding reuses the same /api/auctions/:id/bids flow as the
// /auctions listing page's dialog.
export default function AuctionDetail({
  params,
}: {
  params: { slug: string };
}) {
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: auction, isLoading, isError } = useQuery<AuctionWithArtwork>({
    queryKey: [`/api/public/auctions/${params.slug}`],
  });

  const { data: bids } = useQuery<Bid[]>({
    queryKey: [`/api/auctions/${auction?.id}/bids`],
    enabled: !!auction,
  });

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: { bidderName: "", amount: 0 },
  });

  const placeBidMutation = useMutation({
    mutationFn: async (data: BidFormValues) => {
      if (!auction) throw new Error("No auction loaded");
      return apiRequest("POST", `/api/auctions/${auction.id}/bids`, {
        bidderName: data.bidderName,
        amount: data.amount.toString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Bid placed successfully!",
        description: "Your bid has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/public/auctions/${params.slug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/auctions/${auction?.id}/bids`] });
      setBidDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to place bid",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormValues) => {
    if (!auction) return;
    const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
    const minIncrement = parseFloat(auction.minimumIncrement);

    if (data.amount < currentBid + minIncrement) {
      form.setError("amount", {
        message: `Minimum bid is ${formatPrice(currentBid + minIncrement)}`,
      });
      return;
    }

    placeBidMutation.mutate(data);
  };

  const openBidDialog = () => {
    if (!auction) return;
    const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
    const minIncrement = parseFloat(auction.minimumIncrement);
    form.setValue("amount", currentBid + minIncrement);
    setBidDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="aspect-4/3 w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !auction) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl font-semibold mb-2">Auction not found</h1>
        <p className="text-muted-foreground mb-4">
          This auction doesn't exist or is no longer available.
        </p>
        <Button asChild variant="outline">
          <Link href="/auctions">Browse Auctions</Link>
        </Button>
      </div>
    );
  }

  const status = getAuctionStatus(auction);
  const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
  const startingPrice = parseFloat(auction.startingPrice);
  const endTime = new Date(auction.endTime);
  const startTime = new Date(auction.startTime);
  const progressPercent = Math.min(
    ((currentBid - startingPrice) / startingPrice) * 100 + 50,
    100
  );
  const artistUrl = `/artists/${auction.artwork.artist.slug}`;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{`${auction.artwork.title} — Live Auction — Vernis9`}</title>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/auctions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Link>
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-lg bg-muted">
            <img
              src={auction.artwork.imageUrl}
              alt={auction.artwork.title}
              width={600}
              height={450}
              className="w-full h-auto object-contain max-h-[70vh]"
            />
            <Badge
              className={`absolute top-3 right-3 ${
                status === "active"
                  ? "bg-green-500"
                  : status === "upcoming"
                  ? "bg-blue-500"
                  : "bg-gray-500"
              }`}
            >
              {status === "active" ? "Live" : status === "upcoming" ? "Upcoming" : "Ended"}
            </Badge>
          </div>

          <div className="flex flex-col space-y-6">
            <header className="space-y-2">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                {auction.artwork.title}
              </h1>
              <Link href={artistUrl} className="text-muted-foreground hover:text-primary transition-colors">
                by {auction.artwork.artist.name}
              </Link>
            </header>

            {auction.artwork.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {auction.artwork.description}
              </p>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status === "active" ? "Current Bid" : status === "upcoming" ? "Starting Price" : "Final Bid"}
                  </span>
                  <span className="font-bold text-primary text-lg" data-testid={`text-bid-${auction.id}`}>
                    {formatPrice(currentBid)}
                  </span>
                </div>
                {status === "active" && <Progress value={progressPercent} className="h-2" />}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {status === "active" ? (
                    <span>Ends {formatDistanceToNow(endTime, { addSuffix: true })}</span>
                  ) : status === "upcoming" ? (
                    <span>Starts {formatDistanceToNow(startTime, { addSuffix: true })}</span>
                  ) : (
                    <span>Ended {formatDistanceToNow(endTime, { addSuffix: true })}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {status === "active" && (
              <Button
                className="w-full"
                size="lg"
                onClick={openBidDialog}
                data-testid={`button-bid-${auction.id}`}
              >
                <Gavel className="h-5 w-5 mr-2" />
                Place Bid
              </Button>
            )}
            {status === "upcoming" && (
              <Button className="w-full" size="lg" variant="outline" disabled>
                <Clock className="h-5 w-5 mr-2" />
                Coming Soon
              </Button>
            )}
            {status === "ended" && (
              <Button className="w-full" size="lg" variant="secondary" disabled>
                <CheckCircle className="h-5 w-5 mr-2" />
                Auction Ended
              </Button>
            )}

            <div className="border-t pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Share this auction
              </p>
              <ShareButtons
                url={getCanonicalShareUrl()}
                itemType="auction"
                itemId={auction.id}
                title={`${auction.artwork.title} — Live Auction on Vernis9`}
                description={auction.artwork.description || undefined}
                imageUrl={auction.artwork.imageUrl}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Place Your Bid</DialogTitle>
            <DialogDescription>
              Bidding on "{auction.artwork.title}" by {auction.artwork.artist.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bidderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-bidder-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Bid (&euro;)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          data-testid="input-bid-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setBidDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={placeBidMutation.isPending} data-testid="button-submit-bid">
                    {placeBidMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Placing Bid...
                      </>
                    ) : (
                      <>
                        <Gavel className="h-4 w-4 mr-2" />
                        Place Bid
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {bids && bids.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Recent Bids</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {bids.slice(0, 5).map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {bid.bidderName.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span>{bid.bidderName}</span>
                        </div>
                        <span className="font-medium">{formatPrice(bid.amount)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
