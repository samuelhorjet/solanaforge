// FILE: components/InitializeGate.tsx

"use client";

import { useState } from "react";
import { useProgram } from "@/components/solana-provider";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export function InitializeGate({ children }: { children: React.ReactNode }) {
  const { isInitialized, initializeUserAccount } = useProgram();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await initializeUserAccount();
    } catch (err: any) {
      setError(err.message || "An unknown error occurred during initialization.");
    } finally {
      setIsLoading(false);
    }
  };

  // State 1: Still checking the account
  if (isInitialized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Connecting to your Account</h2>
          <p className="text-muted-foreground">Please wait while we check your on-chain status...</p>
        </div>
      </div>
    );
  }

  // State 2: Account does not exist, gate the UI
  if (isInitialized === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-lg border bg-card p-8 text-center shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Account Initialization</h1>
            <p className="text-muted-foreground">
              To use SolanaForge, you need to create an on-chain account. This is a one-time setup that costs a tiny amount of SOL for rent.
            </p>
          </div>
          <Button onClick={handleInitialize} disabled={isLoading} className="w-full text-lg h-12">
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              "Initialize Account"
            )}
          </Button>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // State 3: User is initialized, show the app
  return <>{children}</>;
}