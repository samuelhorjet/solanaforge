"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeftRight, ExternalLink, Copy } from "lucide-react"

interface SwapHistoryProps {
  swaps: any[]
}

export function SwapHistory({ swaps }: SwapHistoryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (swaps.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-lg font-medium">No swaps yet</p>
              <p className="text-sm text-muted-foreground">Your swap history will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Swap History</CardTitle>
        <CardDescription>Your recent token swaps and transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Swap</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swaps.map((swap) => (
                <TableRow key={swap.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{swap.fromToken}</span>
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{swap.toToken}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {swap.fromAmount} {swap.fromToken}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        → {swap.toAmount.toFixed(6)} {swap.toToken}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      1 {swap.fromToken} = {swap.rate.toFixed(6)} {swap.toToken}
                    </p>
                  </TableCell>
                  <TableCell>{formatDate(swap.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant={swap.status === "completed" ? "default" : "secondary"}>{swap.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(swap.txHash)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
