"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Coins, ArrowLeftRight, History, Settings, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  walletAddress: string
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tokens", label: "Token Management", icon: Coins },
  { id: "swaps", label: "Token Swaps", icon: ArrowLeftRight },
  { id: "history", label: "Transaction History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar({ activeSection, onSectionChange, walletAddress }: DashboardSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif">SolanaForge</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Devnet
            </Badge>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="p-6 border-b">
        <div className="space-y-2">
          <p className="text-sm font-medium">Connected Wallet</p>
          <div className="p-3 bg-muted rounded-lg">
            <code className="text-xs font-mono truncate block">{walletAddress}</code>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                activeSection === item.id && "bg-primary text-primary-foreground",
              )}
              onClick={() => {
                onSectionChange(item.id)
                setIsMobileMenuOpen(false)
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Card
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-80 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </Card>
    </>
  )
}
