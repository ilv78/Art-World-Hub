import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import type { ArtworkWithArtist } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EnquiryDialogProps {
  artwork: ArtworkWithArtist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnquiryDialog({ artwork, open, onOpenChange }: EnquiryDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Reset the form each time the dialog opens for a (possibly different) artwork.
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setMessage(`Hi ${artwork.artist.name}, I'm interested in "${artwork.title}". Could you share the price and availability?`);
    }
  }, [open, artwork.title, artwork.artist.name]);

  const enquiryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/artworks/${artwork.id}/enquire`, { name, email, message });
    },
    onSuccess: () => {
      toast({
        title: "Enquiry sent",
        description: `Your message about "${artwork.title}" has been sent to ${artwork.artist.name}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not send enquiry",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const canSubmit = name.trim() && email.trim() && message.trim() && !enquiryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Enquire about this artwork</DialogTitle>
          <DialogDescription>
            Send a message to {artwork.artist.name} about "{artwork.title}". They'll reply to your email directly.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) enquiryMutation.mutate();
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="enquiry-name">Your name</Label>
            <Input
              id="enquiry-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              data-testid="input-enquiry-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enquiry-email">Your email</Label>
            <Input
              id="enquiry-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              data-testid="input-enquiry-email"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enquiry-message">Message</Label>
            <Textarea
              id="enquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              data-testid="input-enquiry-message"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit} data-testid="button-send-enquiry">
              <Mail className="h-4 w-4 mr-2" />
              {enquiryMutation.isPending ? "Sending…" : "Send enquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
