"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ArrowLeftRight, ArrowUpDown, Settings, AlertTriangle, Zap, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TokenSwapInterfaceProps {
  tokens: any[]
  onSwapComplete: (swapData: any) => void
}

const mockTokenPairs = [
  { symbol: "SOL", name: "Solana", balance: 2.45, price: 21.34 },
  { symbol: "USDC", name: "USD Coin", balance: 150.0, price: 1.0 },
  { symbol: "RAY", name: "Raydium", balance: 25.5, price: 0.85 },
  { symbol: "SRM", name: "Serum", balance: 100.0, price: 0.32 },
]

export function TokenSwapInterface({  onSwapComplete }: TokenSwapInterfaceProps) {
  const [fromToken, setFromToken] = useState("SOL")
  const [toToken, setToToken] = useState("USDC")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState([0.5])
  const [showSettings, setShowSettings] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [swapRate, setSwapRate] = useState(0)

  // Calculate swap rate and to amount
  useEffect(() => {
    if (fromAmount && fromToken && toToken) {
      const fromTokenData = mockTokenPairs.find((t) => t.symbol === fromToken)
      const toTokenData = mockTokenPairs.find((t) => t.symbol === toToken)

      if (fromTokenData && toTokenData) {
        const rate = fromTokenData.price / toTokenData.price
        const calculatedToAmount = Number.parseFloat(fromAmount) * rate
        setSwapRate(rate)
        setToAmount(calculatedToAmount.toFixed(6))
      }
    } else {
      setToAmount("")
      setSwapRate(0)
    }
  }, [fromAmount, fromToken, toToken])

  const handleSwapTokens = () => {
    const tempToken = fromToken
    const tempAmount = fromAmount
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
  }

  const handleMaxAmount = () => {
    const tokenData = mockTokenPairs.find((t) => t.symbol === fromToken)
    if (tokenData) {
      setFromAmount(tokenData.balance.toString())
    }
  }

  const handleSwap = async () => {
    if (!fromAmount || !toAmount) return

    setIsSwapping(true)

    try {
      // Simulate swap transaction
      await new Promise((resolve) => setTimeout(resolve, 2500))

      const swapData = {
        id: `swap_${Date.now()}`,
        fromToken,
        toToken,
        fromAmount: Number.parseFloat(fromAmount),
        toAmount: Number.parseFloat(toAmount),
        rate: swapRate,
        slippage: slippage[0],
        timestamp: new Date().toISOString(),
        status: "completed",
        txHash: `${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 8)}`,
      }

      onSwapComplete(swapData)

      // Reset form
      setFromAmount("")
      setToAmount("")
    } catch (error) {
      console.error("Swap failed:", error)
    } finally {
      setIsSwapping(false)
    }
  }

  const getTokenBalance = (symbol: string) => {
    const tokenData = mockTokenPairs.find((t) => t.symbol === symbol)
    return tokenData?.balance || 0
  }

  const isInsufficientBalance = fromAmount && Number.parseFloat(fromAmount) > getTokenBalance(fromToken)

  return (
    <div className="space-y-6 animate-slide-up">
      <Card className="card-fintech w-full max-w-md mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Token Swap</CardTitle>
                <CardDescription>Swap tokens with best rates</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 w-10 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showSettings && (
            <Card className="card-fintech bg-muted/30 animate-fade-in">
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Slippage Tolerance: {slippage[0]}%</Label>
                  <Slider
                    value={slippage}
                    onValueChange={setSlippage}
                    max={5}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0].map((value) => (
                      <Button
                        key={value}
                        variant={slippage[0] === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSlippage([value])}
                        className={
                          slippage[0] === value
                            ? "btn-fintech text-xs h-8"
                            : "text-xs h-8 bg-transparent hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                        }
                      >
                        {value}%
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* From Token */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">From</Label>
            <Card className="card-fintech p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-32 h-10 bg-background hover:bg-muted/50 transition-colors duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTokenPairs.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Balance: {getTokenBalance(fromToken)}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleMaxAmount}
                    className="h-auto p-0 text-xs text-primary hover:text-primary/80 transition-colors duration-200"
                  >
                    MAX
                  </Button>
                </div>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className={`text-lg font-medium h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 ${
                  isInsufficientBalance ? "border-destructive focus:border-destructive" : "focus:border-primary"
                }`}
              />
              {isInsufficientBalance && (
                <p className="text-sm text-destructive mt-2 animate-fade-in">Insufficient balance</p>
              )}
            </Card>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapTokens}
              className="rounded-full p-3 h-12 w-12 hover:bg-primary/10 hover:text-primary hover:scale-110 transition-all duration-300 border border-border hover:border-primary/30"
            >
              <ArrowUpDown className="h-5 w-5" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">To</Label>
            <Card className="card-fintech p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="w-32 h-10 bg-background hover:bg-muted/50 transition-colors duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTokenPairs.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Balance: {getTokenBalance(toToken)}</p>
                </div>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={toAmount}
                readOnly
                className="text-lg font-medium h-12 bg-muted/50"
              />
            </Card>
          </div>

          {/* Swap Info */}
          {swapRate > 0 && (
            <Card className="card-fintech bg-gradient-to-r from-muted/30 to-muted/10 animate-fade-in">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />1 {fromToken} = {swapRate.toFixed(6)} {toToken}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Slippage Tolerance</span>
                  <span className="font-medium">{slippage[0]}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Received</span>
                  <span className="font-medium">
                    {(Number.parseFloat(toAmount) * (1 - slippage[0] / 100)).toFixed(6)} {toToken}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!fromAmount || !toAmount || isInsufficientBalance || isSwapping}
            className="btn-fintech w-full h-14 text-base font-medium"
            size="lg"
          >
            {isSwapping ? (
              <>
                <Zap className="h-5 w-5 mr-2 animate-pulse" />
                Swapping...
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-5 w-5 mr-2" />
                Swap Tokens
              </>
            )}
          </Button>

          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
              This is a demo interface. Actual swaps would be executed through Jupiter or Serum DEX on Solana.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
