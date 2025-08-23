"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Coins, TrendingUp, Zap, Shield, ArrowRight, Sparkles } from "lucide-react"

export default function HomePage() {
  const { publicKey } = useWallet()
  const [activeSection, setActiveSection] = useState("dashboard")

  const features = [
    {
      icon: Coins,
      title: "Token Creation",
      description: "Mint and deploy your own SPL tokens directly from the dashboard",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      title: "Token Swaps",
      description: "Swap SPL tokens with integrated DEX functionality",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Live balance updates and transaction monitoring",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Shield,
      title: "Secure & Decentralized",
      description: "Built on Solana smart contracts for transparency and security",
      gradient: "from-purple-500 to-pink-500",
    },
  ]

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

        <header className="border-b bg-background backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
                  <Coins className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-serif bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    SolanaForge
                  </h1>
                  <p className="text-sm text-muted-foreground">Professional Token Management</p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-primary/10 to-blue-500/10 text-primary border-primary/20"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Devnet
              </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12">
            <div className="text-center space-y-6 max-w-4xl animate-slide-up">
              <h2 className="text-5xl md:text-6xl font-bold font-serif bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight">
                Welcome to SolanaForge
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                The most advanced Solana DApp for professional token creation, portfolio management, and decentralized
                trading
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Audited Smart Contracts</span>
                <span className="mx-2">•</span>
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Lightning Fast</span>
                <span className="mx-2">•</span>
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Professional Grade</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 animate-fade-in">
              <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-blue-600 !text-white !font-medium !px-8 !py-4 !rounded-xl !text-lg !transition-all !duration-300 hover:!scale-105 hover:!shadow-lg hover:!shadow-primary/25" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Connect your wallet to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mt-16">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="card-fintech text-center group hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className="pb-4">
                    <div
                      className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    >
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl font-serif group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 pointer-events-none" />

      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        walletAddress={publicKey.toBase58()}
      />
      <div className="flex-1 flex flex-col min-h-screen md:ml-0 relative z-10">
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
