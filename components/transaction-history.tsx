"use client"

import { Label } from "@/components/ui/label"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  History,
  Search,
  Download,
  ExternalLink,
  Copy,
  Coins,
  ArrowLeftRight,
  Send,
  Receipt as Receive,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"

interface Transaction {
  id: string
  type: "token_creation" | "swap" | "transfer_in" | "transfer_out" | "mint"
  timestamp: string
  status: "completed" | "pending" | "failed"
  txHash: string
  amount?: number
  token?: string
  fromToken?: string
  toToken?: string
  fromAmount?: number
  toAmount?: number
  recipient?: string
  sender?: string
  fee: number
  description: string
}

interface TransactionHistoryProps {
  tokens: any[]
  swaps: any[]
}

export function TransactionHistory({ tokens, swaps }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Generate comprehensive transaction history from tokens and swaps
  const allTransactions = useMemo(() => {
    const transactions: Transaction[] = []

    // Add token creation transactions
    tokens.forEach((token) => {
      transactions.push({
        id: `token_${token.id}`,
        type: "token_creation",
        timestamp: token.createdAt,
        status: "completed",
        txHash: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 8)}`,
        token: token.symbol,
        amount: token.supply,
        fee: 0.001,
        description: `Created ${token.name} (${token.symbol}) token`,
      })
    })

    // Add swap transactions
    swaps.forEach((swap) => {
      transactions.push({
        id: `swap_${swap.id}`,
        type: "swap",
        timestamp: swap.timestamp,
        status: swap.status,
        txHash: swap.txHash,
        fromToken: swap.fromToken,
        toToken: swap.toToken,
        fromAmount: swap.fromAmount,
        toAmount: swap.toAmount,
        fee: 0.0025,
        description: `Swapped ${swap.fromAmount} ${swap.fromToken} for ${swap.toAmount.toFixed(6)} ${swap.toToken}`,
      })
    })

    // Sort by timestamp (newest first)
    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [tokens, swaps])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.token?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.fromToken?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.toToken?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = typeFilter === "all" || tx.type === typeFilter
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [allTransactions, searchTerm, typeFilter, statusFilter])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "token_creation":
        return <Coins className="h-4 w-4" />
      case "swap":
        return <ArrowLeftRight className="h-4 w-4" />
      case "transfer_out":
        return <Send className="h-4 w-4" />
      case "transfer_in":
        return <Receive className="h-4 w-4" />
      default:
        return <History className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "token_creation":
        return "Token Creation"
      case "swap":
        return "Token Swap"
      case "transfer_out":
        return "Transfer Out"
      case "transfer_in":
        return "Transfer In"
      case "mint":
        return "Token Mint"
      default:
        return "Unknown"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportTransactions = () => {
    const csvContent = [
      ["Date", "Type", "Description", "Amount", "Token", "Status", "Fee", "Transaction Hash"].join(","),
      ...filteredTransactions.map((tx) =>
        [
          formatDate(tx.timestamp),
          getTypeLabel(tx.type),
          tx.description,
          tx.amount || tx.fromAmount || "",
          tx.token || tx.fromToken || "",
          tx.status,
          tx.fee,
          tx.txHash,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "solanaforge_transactions.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (allTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-lg font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Your transaction history will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-serif">Transaction History</CardTitle>
              <CardDescription>Complete history of your Solana transactions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportTransactions} className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="token_creation">Token Creation</SelectItem>
                <SelectItem value="swap">Token Swaps</SelectItem>
                <SelectItem value="transfer_in">Transfers In</SelectItem>
                <SelectItem value="transfer_out">Transfers Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{allTransactions.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {allTransactions.filter((tx) => tx.status === "completed").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{allTransactions.filter((tx) => tx.type === "swap").length}</p>
              <p className="text-sm text-muted-foreground">Swaps</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {allTransactions.filter((tx) => tx.type === "token_creation").length}
              </p>
              <p className="text-sm text-muted-foreground">Tokens Created</p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{tx.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{tx.txHash}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(tx.txHash)}
                              className="h-4 w-4 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTypeLabel(tx.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {tx.type === "swap" ? (
                          <div>
                            <p className="font-medium">
                              {tx.fromAmount} {tx.fromToken}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              → {tx.toAmount?.toFixed(6)} {tx.toToken}
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium">
                            {tx.amount} {tx.token}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Fee: {tx.fee} SOL</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(tx.timestamp)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(tx.status)}
                        <Badge
                          variant={
                            tx.status === "completed"
                              ? "default"
                              : tx.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTransaction(tx)}
                              className="h-6 w-6 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>Complete information about this transaction</DialogDescription>
                            </DialogHeader>
                            {selectedTransaction && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Transaction Hash</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1">
                                        {selectedTransaction.txHash}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(selectedTransaction.txHash)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getStatusIcon(selectedTransaction.status)}
                                      <Badge
                                        variant={selectedTransaction.status === "completed" ? "default" : "secondary"}
                                      >
                                        {selectedTransaction.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Description</Label>
                                  <p className="mt-1 text-sm">{selectedTransaction.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Date</Label>
                                    <p className="mt-1 text-sm">{formatDate(selectedTransaction.timestamp)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Network Fee</Label>
                                    <p className="mt-1 text-sm">{selectedTransaction.fee} SOL</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions match your current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
