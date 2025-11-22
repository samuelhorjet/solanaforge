"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenCreationForm } from "@/components/token-creation-form";
import { TokenSwapInterface } from "@/components/token-swap-interface";
import { SwapHistory } from "@/components/swap-history";
import { TransactionHistory } from "@/components/transaction-history";
import { SettingsPanel } from "@/components/settings-panel";
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  Wallet,
  Coins,
  ArrowLeftRight,
} from "lucide-react";
import { TokenList } from "./token-list";
import { Token } from "@/types/token"; // <-- FIX: Import the central Token type
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

interface DashboardContentProps {
  activeSection: string;
  walletAddress: string;
  onSectionChange: (section: string) => void;
}

export function DashboardContent({
  activeSection,
  walletAddress,
  onSectionChange,
}: DashboardContentProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [showTokenForm, setShowTokenForm] = useState(false);

  // Fetch wallet SOL balance and SPL tokens
  useEffect(() => {
    if (!publicKey) return;

    const fetchWalletData = async () => {
      try {
        // 1️⃣ Get SOL balance
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);

        // 2️⃣ Fetch all SPL tokens for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );

        const fetchedTokens: Token[] = tokenAccounts.value // This now uses the imported type
          .filter((t) => t.account.data.parsed.info.tokenAmount.uiAmount > 0)
          .map((t) => {
            const info = t.account.data.parsed.info;
            return {
              id: t.pubkey.toBase58(),
              name: "Unknown Token", // We'll fetch this properly later
              symbol: "UNKNOWN", // We'll fetch this properly later
              supply: info.tokenAmount.uiAmount, // This is actually balance, not supply
              balance: info.tokenAmount.uiAmount,
              decimals: info.tokenAmount.decimals,
              mintAddress: info.mint,
              createdAt: new Date().toISOString(), // This is a placeholder
              status: "active",
            };
          });

        setTokens(fetchedTokens);

        // 3️⃣ Portfolio value placeholder (replace with price oracle later)
        const totalValue = fetchedTokens.reduce(
          (sum, t) => sum + t.balance * 5,
          0
        ); // assuming $5 each
        setPortfolioValue(totalValue);
      } catch (err) {
        console.error("Error fetching wallet data:", err);
      }
    };

    fetchWalletData();
  }, [publicKey, connection]);

  const handleTokenCreated = (newToken: Token) => {
    setTokens((prev) => [...prev, newToken]);
    setShowTokenForm(false);
    onSectionChange("tokens");
  };

  const handleTokenAction = (action: string, token: Token) => {
    if (action === "view" && token.mintAddress) {
      const url = `https://solscan.io/token/${token.mintAddress}?cluster=devnet`;
      window.open(url, "_blank");
    }
  };

  const handleSwapComplete = (swapData: any) => {
    setSwaps((prev) => [swapData, ...prev]);
  };

  // --- Render sections ---
  const renderDashboardOverview = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold font-serif">Dashboard Overview</h2>
        <Button
          className="btn-fintech gap-2"
          onClick={() => onSectionChange("tokens")}
        >
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wallet Balance */}
        <Card className="card-fintech">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Wallet Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance !== null ? `${balance.toFixed(2)} SOL` : "-.-- SOL"}
            </div>
            <p className="text-xs text-muted-foreground">Updated from wallet</p>
          </CardContent>
        </Card>

        {/* Created Tokens */}
        <Card className="card-fintech">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Created Tokens
            </CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokens.length}</div>
            <p className="text-xs text-muted-foreground">
              {tokens.length === 0
                ? "No tokens created yet"
                : `${tokens.length} active`}
            </p>
          </CardContent>
        </Card>

        {/* Swaps */}
        <Card className="card-fintech">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{swaps.length}</div>
            <p className="text-xs text-muted-foreground">
              {swaps.length === 0
                ? "No swaps yet"
                : `${swaps.length} completed`}
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Value */}
        <Card className="card-fintech">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Portfolio Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Based on tokens</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-fintech">
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
            <CardDescription>
              Your latest transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokens.length > 0 || swaps.length > 0 ? (
                <div className="space-y-3">
                  {swaps.slice(0, 2).map((swap) => (
                    <div
                      key={swap.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors duration-200"
                    >
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Swapped {swap.fromAmount} {swap.fromToken} →{" "}
                          {swap.toAmount.toFixed(2)} {swap.toToken}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(swap.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {tokens.slice(0, 3 - swaps.length).map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors duration-200"
                    >
                      <Coins className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Created {token.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {token.symbol} •{" "}
                          {new Date(token.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-fintech">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              onClick={() => onSectionChange("tokens")}
            >
              <Plus className="h-4 w-4" />
              Create New Token
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              onClick={() => onSectionChange("swaps")}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap Tokens
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
              onClick={() => {
                const url = `https://solscan.io/account/${walletAddress}?cluster=devnet`;
                window.open(url, "_blank");
              }}
            >
              <ArrowUpRight className="h-4 w-4" />
              View on Solscan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTokenManagement = () =>
    showTokenForm ? (
      <div className="space-y-6 animate-slide-up">
        <TokenCreationForm
          onTokenCreated={handleTokenCreated}
          onCancel={() => setShowTokenForm(false)}
        />
      </div>
    ) : (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif">Token Management</h2>
          <Button
            className="btn-fintech gap-2"
            onClick={() => setShowTokenForm(true)}
          >
            <Plus className="h-4 w-4" />
            Create Token
          </Button>
        </div>
        <TokenList tokens={tokens} onTokenAction={handleTokenAction} />
      </div>
    );

  switch (activeSection) {
    case "tokens":
      return renderTokenManagement();
    case "locker":
      return (
         <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold font-serif mb-2">Locking Coming Soon</h2>
                <p className="text-muted-foreground">We are integrating the Locking Proxy instructions next.</p>
            </div>
         </div>
      );

    case "burner":
        return (
           <div className="flex h-[50vh] items-center justify-center">
              <div className="text-center">
                  <h2 className="text-2xl font-bold font-serif mb-2">Burning Coming Soon</h2>
                  <p className="text-muted-foreground">We are integrating the Burning Proxy instructions next.</p>
              </div>
           </div>
        );
    case "history":
      return <TransactionHistory tokens={tokens} swaps={[]} />;
    case "settings":
      return <SettingsPanel walletAddress={walletAddress} />;
    default:
      return renderDashboardOverview();
  }
}
