import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

export default function SetPassword() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const setPasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/set-password", { password });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password set!", description: "Your account is ready." });
      setTimeout(() => { window.location.href = "/"; }, 1500);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        {setPasswordMutation.isSuccess ? (
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="font-serif text-2xl">You're all set!</CardTitle>
            <CardDescription>Redirecting to Vernis9...</CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Set your password</CardTitle>
              <CardDescription>
                Your email is verified. Choose a password to complete your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password !== confirmPassword) {
                    toast({
                      title: "Error",
                      description: "Passwords don't match",
                      variant: "destructive",
                    });
                    return;
                  }
                  setPasswordMutation.mutate(password);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={setPasswordMutation.isPending}
                >
                  {setPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Set password
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
