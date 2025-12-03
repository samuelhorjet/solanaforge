// FILE: components/dashboard-content.tsx

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenCreationForm } from "@/components/token-creation-form";
import { TransactionHistory } from "@/components/transaction-history";
import { SettingsPanel } from "@/components/settings-panel";
import { TokenList } from "./token-list";
import { TokenDetails } from "./token-details"; // Imported
import { TokenLocker } from "@/components/token-locker";
import { TokenBurner } from "@/components/token-burner";
import { TokenActionModal } from "@/components/token-action-modal";
import {
  TrendingUp,
  Plus,
  Wallet,
  Coins,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Lock,
  Flame,
  ArrowUpRight,
  Activity,
  History,
  Send,
  Copy,
  Eye, // Added Icon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Token } from "@/types/token";
import { useCreatedTokens } from "@/hooks/useCreatedTokens";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";

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
  // Hooks
  const {
    holdings,
    balance,
    isLoading: isLoadingHoldings,
    refreshHoldings,
  } = useWalletHoldings();
  const { createdTokens, isLoadingCreated, refreshCreatedTokens, addToken } =
    useCreatedTokens();

  // State
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [navParams, setNavParams] = useState<{
    lockId?: string;
    mint?: string;
  }>({});

  // MODAL STATE
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [modalAction, setModalAction] = useState<"transfer" | "mint" | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // DETAIL VIEW STATE
  const [selectedDetailToken, setSelectedDetailToken] = useState<Token | null>(
    null
  );

  // Sync Data
  const synchronizedTokens = useMemo(() => {
    return createdTokens.map((createdToken) => {
      const holding = holdings.find(
        (h) => h.mintAddress === createdToken.mintAddress
      );
      return {
        ...createdToken,
        balance: holding ? holding.balance : 0,
        image: createdToken.image || holding?.image || "",
        isMintable: holding ? holding.isMintable : createdToken.isMintable,
        extensions: holding?.extensions || createdToken.extensions, // Sync extensions
      };
    });
  }, [createdTokens, holdings]);

  // Calculate Portfolio
  useEffect(() => {
    if (balance === null) return;
    const solValue = balance * 145;
    const tokensValue = holdings.reduce(
      (acc, token) => acc + token.balance * 0.5,
      0
    );
    setPortfolioValue(solValue + tokensValue);
  }, [balance, holdings]);

  // Handlers
  const handleTokenCreated = (newToken: Token) => {
    setShowTokenForm(false);
    onSectionChange("tokens");
    addToken(newToken);
    setTimeout(() => {
      refreshCreatedTokens();
      refreshHoldings();
    }, 2000);
  };

  const handleTokenAction = (
    action:
      | "view"
      | "details"
      | "refresh"
      | "lock"
      | "burn"
      | "mint"
      | "transfer",
    token?: Token
  ) => {
    if (action === "refresh") {
      refreshCreatedTokens();
      refreshHoldings();
      return;
    }

    if (!token) return;

    if (action === "view") {
      window.open(
        `https://solscan.io/token/${token.mintAddress}?cluster=devnet`,
        "_blank"
      );
    } else if (action === "details") {
      // Set detail token to open details view
      setSelectedDetailToken(token);
    } else if (action === "lock") {
      setNavParams({ mint: token.mintAddress });
      onSectionChange("locker");
    } else if (action === "burn") {
      setNavParams({ mint: token.mintAddress });
      onSectionChange("burner");
    } else if (action === "mint") {
      if (!token.isMintable) return;
      setActiveToken(token);
      setModalAction("mint");
      setIsModalOpen(true);
    } else if (action === "transfer") {
      setActiveToken(token);
      setModalAction("transfer");
      setIsModalOpen(true);
    }
  };

  const handleNavigateToBurner = (lockId: string, mint: string) => {
    setNavParams({ lockId, mint });
    onSectionChange("burner");
  };

  const handleModalSuccess = () => {
    refreshHoldings();
    refreshCreatedTokens();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- RENDERERS ---

  const renderDashboardOverview = () => {
    // If details are selected, show details view instead of overview
    if (selectedDetailToken) {
      return (
        <TokenDetails
          token={selectedDetailToken}
          onBack={() => setSelectedDetailToken(null)}
        />
      );
    }

    return (
      <div className="space-y-6 animate-slide-up pb-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif">Dashboard Overview</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refreshHoldings();
                refreshCreatedTokens();
              }}
              disabled={isLoadingHoldings || isLoadingCreated}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingHoldings ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              className="btn-fintech gap-2"
              onClick={() => onSectionChange("tokens")}
            >
              <Plus className="h-4 w-4" /> Create Token
            </Button>
          </div>
        </div>

        {/* STATS CARDS (Unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Wallet Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance !== null ? (
                  `${balance.toFixed(2)} SOL`
                ) : (
                  <Loader2 className="animate-spin" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Updated from wallet
              </p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {portfolioValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">Est. Value (Demo)</p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tokens Held</CardTitle>
              <Coins className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingHoldings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  holdings.length
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                In connected wallet
              </p>
            </CardContent>
          </Card>

          <Card className="card-fintech">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Created Tokens
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingCreated ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  createdTokens.length
                )}
              </div>
              <p className="text-xs text-muted-foreground">Minted by you</p>
            </CardContent>
          </Card>
        </div>

        {/* SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COL: TOKENS IN WALLET */}
          <Card className="card-fintech h-full">
            <CardHeader>
              <CardTitle className="font-serif">Tokens in Wallet</CardTitle>
              <CardDescription>
                Assets currently held in your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-3">
                  {isLoadingHoldings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  ) : holdings.length > 0 ? (
                    holdings.map((token) => (
                      <div
                        key={token.id}
                        // Added click handler for details
                        onClick={() => handleTokenAction("details", token)}
                        className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border hover:bg-muted/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-background border shrink-0">
                            {token.image ? (
                              <img
                                src={token.image}
                                alt={token.symbol}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors">
                              {token.name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{token.symbol}</span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(token.mintAddress);
                                }}
                              >
                                <Copy className="h-3 w-3 cursor-pointer hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BALANCE (Right Side) */}
                        <div className="flex flex-1 justify-end items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-mono font-bold">
                              {token.balance.toLocaleString()}
                            </p>
                          </div>

                          {/* MENU */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {/* Added View Details Option */}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("details", token)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("transfer", token)
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" /> Transfer
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("view", token)
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" /> View
                                  Explorer
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("lock", token)
                                  }
                                >
                                  <Lock className="mr-2 h-4 w-4 text-blue-500" />{" "}
                                  Lock Liquidity
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTokenAction("burn", token)
                                  }
                                >
                                  <Flame className="mr-2 h-4 w-4 text-orange-500" />{" "}
                                  Burn Tokens
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {token.isMintable ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTokenAction("mint", token)
                                    }
                                  >
                                    <Plus className="mr-2 h-4 w-4 text-green-500" />{" "}
                                    Mint More
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Lock className="mr-2 h-4 w-4 text-muted-foreground" />{" "}
                                    Mint (Fixed)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No tokens found in wallet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* RIGHT COL: RECENT ACTIVITY */}
          <Card className="card-fintech h-full">
            <CardHeader>
              <CardTitle className="font-serif">Recent Activity</CardTitle>
              <CardDescription>
                Latest changes to your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {createdTokens.length > 0 || holdings.length > 0 ? (
                    <>
                      {createdTokens.slice(0, 3).map((t, idx) => (
                        <div
                          key={`created-${idx}`}
                          className="flex items-start gap-3 pb-3 border-b last:border-0"
                        >
                          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full mt-1">
                            <Plus className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Created Token: {t.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Minted {t.supply} {t.symbol} on Devnet
                            </p>
                          </div>
                        </div>
                      ))}
                      {holdings.slice(0, 3).map((t, idx) => (
                        <div
                          key={`held-${idx}`}
                          className="flex items-start gap-3 pb-3 border-b last:border-0"
                        >
                          <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full mt-1">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Balance Updated: {t.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Current Balance: {t.balance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mb-2 opacity-20" />
                      <p>No recent activity recorded</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ROW 3: QUICK ACTIONS */}
        <Card className="card-fintech w-full">
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("tokens")}
              >
                <div className="bg-primary/10 p-1.5 rounded mr-3">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Create New Token
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("locker")}
              >
                <div className="bg-blue-500/10 p-1.5 rounded mr-3">
                  <Lock className="h-4 w-4 text-blue-600" />
                </div>
                Lock Liquidity
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() => onSectionChange("burner")}
              >
                <div className="bg-orange-500/10 p-1.5 rounded mr-3">
                  <Flame className="h-4 w-4 text-orange-600" />
                </div>
                Burn Tokens
              </Button>

              <Button
                variant="outline"
                className="justify-start h-12 text-base px-4"
                onClick={() =>
                  window.open(
                    `https://solscan.io/account/${walletAddress}?cluster=devnet`,
                    "_blank"
                  )
                }
              >
                <div className="bg-muted p-1.5 rounded mr-3">
                  <ArrowUpRight className="h-4 w-4 text-foreground" />
                </div>
                View Wallet on Solscan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* REUSABLE TOKEN ACTION MODAL */}
        <TokenActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          token={activeToken}
          action={modalAction}
          onSuccess={handleModalSuccess}
        />
      </div>
    );
  };

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refreshCreatedTokens();
                refreshHoldings();
              }}
              disabled={isLoadingCreated}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoadingCreated ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              className="btn-fintech gap-2"
              onClick={() => setShowTokenForm(true)}
            >
              <Plus className="h-4 w-4" /> Create Token
            </Button>
          </div>
        </div>
        <TokenList
          tokens={synchronizedTokens}
          isLoading={isLoadingCreated}
          onTokenAction={handleTokenAction}
        />
      </div>
    );

  switch (activeSection) {
    case "tokens":
      return renderTokenManagement();
    case "locker":
      return (
        <TokenLocker
          tokens={holdings}
          onNavigateToBurner={handleNavigateToBurner}
          prefillMint={navParams.mint}
        />
      );
    case "burner":
      return (
        <TokenBurner
          tokens={holdings}
          prefillLockId={navParams.lockId}
          prefillMint={navParams.mint}
        />
      );
    case "history":
      return <TransactionHistory tokens={createdTokens} swaps={[]} />;
    case "settings":
      return <SettingsPanel walletAddress={walletAddress} />;
    default:
      return renderDashboardOverview();
  }
}
