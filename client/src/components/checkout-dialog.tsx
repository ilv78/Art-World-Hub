import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ArtworkWithArtist } from "@shared/schema";
import { CheckCircle, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  artwork: ArtworkWithArtist;
  quantity: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  total: number;
  onSuccess: () => void;
}

const checkoutSchema = z.object({
  buyerName: z.string().min(2, "Name must be at least 2 characters"),
  buyerEmail: z.string().email("Please enter a valid email address"),
  shippingAddress: z.string().min(10, "Please enter a complete shipping address"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  total,
  onSuccess,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const [isComplete, setIsComplete] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      buyerName: "",
      buyerEmail: "",
      shippingAddress: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormValues) => {
      const orderPromises = items.map((item) =>
        apiRequest("POST", "/api/orders", {
          artworkId: item.artwork.id,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          shippingAddress: data.shippingAddress,
          totalAmount: item.artwork.price,
          status: "pending",
        })
      );
      return Promise.all(orderPromises);
    },
    onSuccess: () => {
      setIsComplete(true);
      toast({
        title: "Order placed successfully!",
        description: "You will receive a confirmation email shortly.",
      });
      setTimeout(() => {
        setIsComplete(false);
        form.reset();
        onSuccess();
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Failed to place order",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckoutFormValues) => {
    createOrderMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {isComplete ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <DialogTitle className="font-serif text-2xl mb-2">
              Order Confirmed!
            </DialogTitle>
            <DialogDescription>
              Thank you for your purchase. Your order is being processed.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Checkout</DialogTitle>
              <DialogDescription>
                Complete your order for {items.length} item
                {items.length > 1 ? "s" : ""} - Total: {formatPrice(total)}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="buyerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          data-testid="input-buyer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                          data-testid="input-buyer-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Art Street, Gallery City, AC 12345"
                          className="resize-none"
                          {...field}
                          data-testid="input-shipping-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-checkout"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createOrderMutation.isPending}
                    data-testid="button-place-order"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
