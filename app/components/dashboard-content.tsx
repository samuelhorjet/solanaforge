"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TokenCreationForm } from "@/components/token-creation-form"
import { TokenList } from "@/components/token-list"
import { TokenSwapInterface } from "@/components/token-swap-interface"
import { SwapHistory } from "@/components/swap-history"
import { TransactionHistory } from "@/components/transaction-history"
import { TrendingUp, TrendingDown, Plus, ArrowUpRight, Wallet, Coins, ArrowLeftRight } from "lucide-react"

interface DashboardContentProps {
  activeSection: string
  walletAddress: string
  onSectionChange: (section: string) => void;
}

export function DashboardContent({ activeSection, walletAddress, onSectionChange }: DashboardContentProps) {
  const { disconnect } = useWallet();
  const [tokens, setTokens] = useState<any[]>([])
  const [swaps, setSwaps] = useState<any[]>([])
  const [showTokenForm, setShowTokenForm] = useState(false)

  const handleTokenCreated = (newToken: any) => {
    setTokens((prev) => [...prev, newToken])
    setShowTokenForm(false)
    // Switch to the token list view after creation
    onSectionChange("tokens");
  }

  const handleTokenAction = (action: string, token: any) => {
    if (action === 'view' && token.mintAddress) {
      // Open Solscan in a new tab to view token details
      const url = `https://solscan.io/token/${token.mintAddress}?cluster=devnet`;
      window.open(url, '_blank');
    }
  }

  const handleSwapComplete = (swapData: any) => {
    setSwaps((prev) => [swapData, ...prev])
  }

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold font-serif">Dashboard Overview</h2>
        <Button className="gap-2" onClick={() => onSectionChange('tokens')}>
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-.-- SOL</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Loading...
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created Tokens</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokens.length}</div>
            <p className="text-xs text-muted-foreground">
              {tokens.length === 0
                ? "No tokens created yet"
                : `${tokens.length} token${tokens.length !== 1 ? "s" : ""} active`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{swaps.length}</div>
            <p className="text-xs text-muted-foreground">
              {swaps.length === 0
                ? "No swaps performed"
                : `${swaps.length} swap${swaps.length !== 1 ? "s" : ""} completed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Loading...
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
            <CardDescription>Your latest transactions and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tokens.length > 0 || swaps.length > 0 ? (
                <div className="space-y-3">
                  {swaps.slice(0, 2).map((swap) => (
                    <div key={swap.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Swapped {swap.fromAmount} {swap.fromToken} → {swap.toAmount.toFixed(2)} {swap.toToken}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(swap.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {tokens.slice(0, 3 - swaps.length).map((token) => (
                    <div key={token.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Coins className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Created {token.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {token.symbol} • {new Date(token.createdAt).toLocaleDateString()}
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

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => onSectionChange('tokens')}
            >
              <Plus className="h-4 w-4" />
              Create New Token
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => onSectionChange('swaps')}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap Tokens
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 bg-transparent"
              onClick={() => {
                const url = `https://solscan.io/account/${walletAddress}?cluster=devnet`;
                window.open(url, '_blank');
              }}
            >
              <ArrowUpRight className="h-4 w-4" />
              View on Solscan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTokenManagement = () => {
    if (showTokenForm) {
      return (
        <div className="space-y-6">
          <TokenCreationForm onTokenCreated={handleTokenCreated} onCancel={() => setShowTokenForm(false)} />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif">Token Management</h2>
          <Button className="gap-2" onClick={() => setShowTokenForm(true)}>
            <Plus className="h-4 w-4" />
            Create Token
          </Button>
        </div>
        <TokenList tokens={tokens} onTokenAction={handleTokenAction} />
      </div>
    )
  }

  const renderTokenSwaps = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold font-serif">Token Swaps</h2>
        <Badge variant="default" className="bg-primary text-primary-foreground">
          Live
        </Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TokenSwapInterface tokens={tokens} onSwapComplete={handleSwapComplete} />
        <div className="space-y-6">
          <SwapHistory swaps={swaps} />
        </div>
      </div>
    </div>
  )

  const renderTransactionHistory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold font-serif">Transaction History</h2>
        <Badge variant="default" className="bg-primary text-primary-foreground">
          {tokens.length + swaps.length + 2} Total
        </Badge>
      </div>
      <TransactionHistory tokens={tokens} swaps={swaps} />
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold font-serif">Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Network Settings</CardTitle>
            <CardDescription>Configure your Solana network preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Network</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Devnet
              </Badge>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Switch to Mainnet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Wallet Settings</CardTitle>
            <CardDescription>Manage your wallet connection and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Connected Wallet</span>
              <div className="p-2 bg-muted rounded text-xs font-mono truncate">{walletAddress}</div>
            </div>
            <Button variant="outline" className="w-full bg-transparent" onClick={disconnect}>
              Disconnect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  switch (activeSection) {
    case "tokens":
      return renderTokenManagement()
    case "swaps":
      return renderTokenSwaps()
    case "history":
      return renderTransactionHistory()
    case "settings":
      return renderSettings()
    default:
      return renderDashboardOverview()
  }
}
