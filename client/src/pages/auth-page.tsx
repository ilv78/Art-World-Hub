import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

type AuthMode = "login" | "signup" | "check-email";

const errorMessages: Record<string, string> = {
  invalid_token: "Invalid verification link.",
  expired_token: "This link has expired. Please sign up again.",
  login_failed: "Login failed. Please try again.",
  google_failed: "Google login failed. Please try again.",
  verification_failed: "Email verification failed. Please try again.",
};

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get("error");

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: authConfig } = useQuery<{ googleEnabled: boolean }>({
    queryKey: ["/api/auth/config"],
  });
  const googleEnabled = authConfig?.googleEnabled ?? false;

  const signupMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/signup", { email });
      return res.json();
    },
    onSuccess: () => setMode("check-email"),
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Redirect if already authenticated
  if (!authLoading && isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const errorBanner = errorParam && (
    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
      {errorMessages[errorParam] || "Something went wrong."}
    </div>
  );

  const googleLoginSection = googleEnabled && (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => { window.location.href = "/api/login/google"; }}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>
    </>
  );

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        {mode === "check-email" ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification link to <strong>{email}</strong>. Click the link to create your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setMode("login"); setEmail(""); }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </CardContent>
          </>
        ) : mode === "signup" ? (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Create an account</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a verification link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorBanner}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  signupMutation.mutate(email);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="artist@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signupMutation.isPending}
                >
                  {signupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send verification link
                </Button>
              </form>

              {googleLoginSection}

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Sign in</CardTitle>
              <CardDescription>
                Welcome back to ArtVerse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorBanner}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loginMutation.mutate({ email, password });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="artist@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>

              {googleLoginSection}

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
