"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Coins, Search, MoreHorizontal, Copy, ExternalLink, Send, Settings, CheckCircle } from "lucide-react"

// Ensure the Token interface includes all necessary fields
interface Token {
  id: string
  name: string
  symbol: string
  supply: number
  decimals: number
  mintAddress: string
  createdAt: string
  status: string
}

interface TokenListProps {
  tokens: Token[]
  onTokenAction: (action: string, token: Token) => void
}

export function TokenList({ tokens, onTokenAction }: TokenListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.mintAddress.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatSupply = (supply: number) => {
    return new Intl.NumberFormat().format(supply)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  if (tokens.length === 0) {
    return (
      <Card className="card-fintech animate-slide-up">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 mx-auto">
              <Coins className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold font-serif">No tokens created yet</p>
              <p className="text-muted-foreground mt-2">Create your first SPL token to get started with SolanaForge</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="animate-slide-up">
      <Card className="card-fintech">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="font-serif text-2xl">Your Tokens</CardTitle>
                <CardDescription className="text-base">Manage your created SPL tokens</CardDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-gradient-to-r from-primary/10 to-blue-500/10 text-primary border-primary/20 px-3 py-1"
            >
              {tokens.length} token{tokens.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead className="font-semibold">Token</TableHead>
                  <TableHead className="font-semibold">Supply</TableHead>
                  <TableHead className="font-semibold">Mint Address</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTokens.map((token, index) => (
                  <TableRow
                    key={token.id}
                    className="hover:bg-muted/20 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20">
                            <Coins className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-base">{token.name}</p>
                            <p className="text-sm text-muted-foreground font-medium">{token.symbol}</p>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-base">{formatSupply(token.supply)}</p>
                        <p className="text-sm text-muted-foreground">{token.decimals} decimals</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted/50 px-3 py-2 rounded-lg font-mono truncate border border-border/50">
                          {token.mintAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyAddress(token.mintAddress)}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                        >
                          {copiedAddress === token.mintAddress ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatDate(token.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={token.status === "active" ? "default" : "secondary"}
                        className={
                          token.status === "active"
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {token.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onTokenAction("view", token)}
                            className="hover:bg-primary/5 hover:text-primary transition-colors duration-200 cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Solscan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onTokenAction("transfer", token)}
                            className="hover:bg-primary/5 hover:text-primary transition-colors duration-200 cursor-pointer"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Transfer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onTokenAction("manage", token)}
                            className="hover:bg-primary/5 hover:text-primary transition-colors duration-200 cursor-pointer"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
