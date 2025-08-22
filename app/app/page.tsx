"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"; // Use the library's button
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, Zap, Shield } from "lucide-react"

export default function HomePage() {
  // Use the publicKey from the wallet adapter to determine connection status
  const { publicKey } = useWallet();
  const [activeSection, setActiveSection] = useState("dashboard")

  const features = [
    {
      icon: Coins,
      title: "Token Creation",
      description: "Mint and deploy your own SPL tokens directly from the dashboard",
    },
    {
      icon: TrendingUp,
      title: "Token Swaps",
      description: "Swap SPL tokens with integrated DEX functionality",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Live balance updates and transaction monitoring",
    },
    {
      icon: Shield,
      title: "Secure & Decentralized",
      description: "Built on Solana smart contracts for transparency and security",
    },
  ]

  // If there's no publicKey, the wallet is not connected. Show the landing page.
  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-serif">SolanaForge</h1>
                  <p className="text-sm text-muted-foreground">Decentralized Token Management</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Devnet
              </Badge>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center space-y-4 max-w-2xl">
              <h2 className="text-4xl font-bold font-serif">Welcome to SolanaForge</h2>
              <p className="text-xl text-muted-foreground">
                A professional Solana DApp for wallet integration, token creation, and decentralized swaps
              </p>
            </div>

            {/* The WalletMultiButton handles connect/disconnect UI automatically */}
            <WalletMultiButton />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-12">
              {features.map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader className="pb-3">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-serif">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // If a publicKey exists, show the dashboard.
  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        walletAddress={publicKey.toBase58()}
      />
      <div className="flex-1 flex flex-col min-h-screen md:ml-0">
        <main className="flex-1 p-6 md:p-8">
          <DashboardContent
            activeSection={activeSection}
            walletAddress={publicKey.toBase58()}
            onSectionChange={setActiveSection}
          />
        </main>
      </div>
    </div>
  )
}
