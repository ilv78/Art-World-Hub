import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Gavel, Clock, TrendingUp, Users, Loader2, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import type { AuctionWithArtwork, Bid } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

const bidSchema = z.object({
  bidderName: z.string().min(2, "Name must be at least 2 characters"),
  amount: z.coerce.number().positive("Bid amount must be positive"),
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

function AuctionCard({
  auction,
  onBid,
}: {
  auction: AuctionWithArtwork;
  onBid: () => void;
}) {
  const status = getAuctionStatus(auction);
  const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
  const startingPrice = parseFloat(auction.startingPrice);
  const endTime = new Date(auction.endTime);
  const startTime = new Date(auction.startTime);

  const progressPercent = Math.min(
    ((currentBid - startingPrice) / startingPrice) * 100 + 50,
    100
  );

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-auction-${auction.id}`}>
      <div className="relative aspect-4/3 overflow-hidden">
        <img
          src={auction.artwork.imageUrl}
          alt={auction.artwork.title}
          loading="lazy"
          className="w-full h-full object-cover"
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

      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-serif font-bold text-lg truncate">{auction.artwork.title}</h3>
          <p className="text-sm text-muted-foreground">{auction.artwork.artist.name}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {status === "active" ? "Current Bid" : status === "upcoming" ? "Starting Price" : "Final Bid"}
            </span>
            <span className="font-bold text-primary" data-testid={`text-bid-${auction.id}`}>
              {formatPrice(currentBid)}
            </span>
          </div>
          {status === "active" && (
            <Progress value={progressPercent} className="h-2" />
          )}
        </div>

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

        {status === "active" && (
          <Button className="w-full" onClick={onBid} data-testid={`button-bid-${auction.id}`}>
            <Gavel className="h-4 w-4 mr-2" />
            Place Bid
          </Button>
        )}

        {status === "upcoming" && (
          <Button className="w-full" variant="outline" disabled>
            <Clock className="h-4 w-4 mr-2" />
            Coming Soon
          </Button>
        )}

        {status === "ended" && (
          <Button className="w-full" variant="secondary" disabled>
            <CheckCircle className="h-4 w-4 mr-2" />
            Auction Ended
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Auctions() {
  const [selectedAuction, setSelectedAuction] = useState<AuctionWithArtwork | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const { toast } = useToast();

  const { data: auctions, isLoading } = useQuery<AuctionWithArtwork[]>({
    queryKey: ["/api/auctions"],
  });

  const { data: bids, isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: [`/api/auctions/${selectedAuction?.id}/bids`],
    enabled: !!selectedAuction,
  });

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      bidderName: "",
      amount: 0,
    },
  });

  const placeBidMutation = useMutation({
    mutationFn: async (data: BidFormValues) => {
      if (!selectedAuction) throw new Error("No auction selected");
      return apiRequest("POST", `/api/auctions/${selectedAuction.id}/bids`, {
        bidderName: data.bidderName,
        amount: data.amount.toString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Bid placed successfully!",
        description: "Your bid has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions", selectedAuction?.id, "bids"] });
      setSelectedAuction(null);
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
    if (!selectedAuction) return;
    const currentBid = parseFloat(selectedAuction.currentBid || selectedAuction.startingPrice);
    const minIncrement = parseFloat(selectedAuction.minimumIncrement);

    if (data.amount < currentBid + minIncrement) {
      form.setError("amount", {
        message: `Minimum bid is ${formatPrice(currentBid + minIncrement)}`,
      });
      return;
    }

    placeBidMutation.mutate(data);
  };

  const categorizedAuctions = {
    active: auctions?.filter((a) => getAuctionStatus(a) === "active") || [],
    upcoming: auctions?.filter((a) => getAuctionStatus(a) === "upcoming") || [],
    ended: auctions?.filter((a) => getAuctionStatus(a) === "ended") || [],
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <Helmet><title>Auctions — Vernis9</title></Helmet>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Live Auctions</h1>
          <p className="text-muted-foreground">
            Bid on exclusive artworks from renowned artists
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>{categorizedAuctions.active.length} Live</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>{categorizedAuctions.upcoming.length} Upcoming</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{auctions?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Auctions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categorizedAuctions.active.length}</p>
              <p className="text-sm text-muted-foreground">Active Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatPrice(auctions
                  ?.reduce(
                    (sum, a) => sum + parseFloat(a.currentBid || a.startingPrice),
                    0
                  ) ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auction Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({categorizedAuctions.active.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            Upcoming ({categorizedAuctions.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ended" data-testid="tab-ended">
            Ended ({categorizedAuctions.ended.length})
          </TabsTrigger>
        </TabsList>

        {["active", "upcoming", "ended"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-4/3" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categorizedAuctions[tab as keyof typeof categorizedAuctions].length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Gavel className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2">
                  No {tab} auctions
                </h3>
                <p className="text-muted-foreground">
                  {tab === "active"
                    ? "Check back soon for live auctions!"
                    : tab === "upcoming"
                    ? "New auctions will be announced soon."
                    : "No auctions have ended yet."}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorizedAuctions[tab as keyof typeof categorizedAuctions].map(
                  (auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      onBid={() => {
                        setSelectedAuction(auction);
                        const currentBid = parseFloat(
                          auction.currentBid || auction.startingPrice
                        );
                        const minIncrement = parseFloat(auction.minimumIncrement);
                        form.setValue("amount", currentBid + minIncrement);
                      }}
                    />
                  )
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bid Dialog */}
      <Dialog
        open={!!selectedAuction}
        onOpenChange={(open) => !open && setSelectedAuction(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          {selectedAuction && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">Place Your Bid</DialogTitle>
                <DialogDescription>
                  Bidding on "{selectedAuction.artwork.title}" by{" "}
                  {selectedAuction.artwork.artist.name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-md overflow-hidden shrink-0">
                    <img
                      src={selectedAuction.artwork.imageUrl}
                      alt={selectedAuction.artwork.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Bid</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(selectedAuction.currentBid || selectedAuction.startingPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Minimum increment: {formatPrice(selectedAuction.minimumIncrement)}
                      </p>
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="bidderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              {...field}
                              data-testid="input-bidder-name"
                            />
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
                              {...field}
                              data-testid="input-bid-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedAuction(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={placeBidMutation.isPending}
                        data-testid="button-submit-bid"
                      >
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

                {/* Recent Bids */}
                {bids && bids.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Recent Bids</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {bids.slice(0, 5).map((bid) => (
                          <div
                            key={bid.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {bid.bidderName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{bid.bidderName}</span>
                            </div>
                            <span className="font-medium">
                              {formatPrice(bid.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
