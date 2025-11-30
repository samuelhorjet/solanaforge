// FILE: components/token-burner.tsx

"use client";

import { useState, useEffect } from "react";
import { Token } from "@/types/token";
import { useBurner, BurnQueueItem } from "@/hooks/useBurner";
import { BurnerList } from "./burner-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Flame,
  Wallet,
  Lock,
  Layers,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenBurnerProps {
  tokens: Token[];
  prefillLockId?: string;
  prefillMint?: string;
}

type BurnMode = "single" | "batch" | "vault" | null;

export function TokenBurner({
  tokens,
  prefillLockId,
  prefillMint,
}: TokenBurnerProps) {
  const {
    burnFromWallet,
    burnFromLock,
    burnBatch,
    burnHistory,
    addToHistory,
    isLoading,
  } = useBurner();

  const [view, setView] = useState<"history" | "form">("history");
  const [step, setStep] = useState<number>(1);
  const [mode, setMode] = useState<BurnMode>(null);

  // --- SINGLE FORM STATE ---
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // --- VAULT FORM STATE ---
  const [lockId, setLockId] = useState<string>("");
  const [selectedLockMint, setSelectedLockMint] = useState<string>("");
  const [lockBurnAmount, setLockBurnAmount] = useState<string>("");

  // --- BATCH FORM STATE ---
  const [queue, setQueue] = useState<BurnQueueItem[]>([]);
  const [batchSelectedToken, setBatchSelectedToken] = useState<string>("");
  const [batchAmount, setBatchAmount] = useState<string>("");

  // Handle Deep Links
  useEffect(() => {
    if (prefillLockId) {
      setView("form");
      setMode("vault");
      setStep(2);
      setLockId(prefillLockId);
      if (prefillMint) setSelectedLockMint(prefillMint);
    }
  }, [prefillLockId, prefillMint]);

  // --- HANDLERS ---

  const handleSingleBurn = async () => {
    const t = tokens.find((x) => x.mintAddress === selectedToken);
    if (!t) return;
    try {
      const tx = await burnFromWallet(
        selectedToken,
        parseFloat(amount),
        t.decimals,
        t.programId
      );
      addToHistory({
        id: tx,
        type: "Wallet Burn",
        token: t.symbol,
        amount: amount,
        date: new Date(),
      });
      resetAndClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVaultBurn = async () => {
    const t = tokens.find((x) => x.mintAddress === selectedLockMint);
    if (!t) return;
    try {
      const tx = await burnFromLock(
        selectedLockMint,
        lockId,
        parseFloat(lockBurnAmount),
        t.decimals
      );
      addToHistory({
        id: tx,
        type: "Vault Burn",
        token: t.symbol,
        amount: lockBurnAmount,
        date: new Date(),
        lockId,
      });
      resetAndClose();
    } catch (e) {
      console.error(e);
    }
  };

  const addToQueue = () => {
    if (!batchSelectedToken || !batchAmount) return;
    const t = tokens.find((x) => x.mintAddress === batchSelectedToken);
    if (!t) return;

    setQueue((prev) => [
      ...prev,
      {
        mint: t.mintAddress,
        symbol: t.symbol,
        amount: batchAmount,
        decimals: t.decimals,
        balance: t.balance,
        programId: t.programId,
      },
    ]);
    setBatchSelectedToken("");
    setBatchAmount("");
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchExecute = async () => {
    await burnBatch(queue);
    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount("");
    setLockBurnAmount("");
    setQueue([]);
    setStep(1);
    setMode(null);
    setView("history");
  };

  // --- RENDERERS ---

  // STEP 1: CHOOSE MODE
  const renderStep1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
      <div
        onClick={() => {
          setMode("single");
          setStep(2);
        }}
        className="cursor-pointer p-6 rounded-xl border-2 hover:border-orange-500 hover:bg-orange-50 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-orange-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Wallet className="text-orange-600" />
        </div>
        <h3 className="font-bold">Single Token</h3>
        <p className="text-xs text-muted-foreground">
          Burn one specific token from your wallet.
        </p>
      </div>
      <div
        onClick={() => {
          setMode("batch");
          setStep(2);
        }}
        className="cursor-pointer p-6 rounded-xl border-2 hover:border-orange-500 hover:bg-orange-50 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-red-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Layers className="text-red-600" />
        </div>
        <h3 className="font-bold">Batch Burn</h3>
        <p className="text-xs text-muted-foreground">
          Queue multiple tokens and burn them sequentially.
        </p>
      </div>
      <div
        onClick={() => {
          setMode("vault");
          setStep(2);
        }}
        className="cursor-pointer p-6 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all text-center space-y-3"
      >
        <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center">
          <Lock className="text-blue-600" />
        </div>
        <h3 className="font-bold">From Vault</h3>
        <p className="text-xs text-muted-foreground">
          Burn tokens locked in a liquidity vault.
        </p>
      </div>
    </div>
  );

  // STEP 2: CONFIGURATION
  const renderStep2 = () => {
    if (mode === "single") {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="space-y-2">
            <Label>Select Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Choose Asset" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem key={t.id} value={t.mintAddress}>
                    {t.symbol} ({t.balance})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-lg pr-16"
                placeholder="0.00"
              />
              <Button
                variant="ghost"
                className="absolute right-2 top-2.5 text-xs"
                onClick={() => {
                  const t = tokens.find((x) => x.mintAddress === selectedToken);
                  if (t) setAmount(t.balance.toString());
                }}
              >
                MAX
              </Button>
            </div>
          </div>
          <Button
            className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold"
            disabled={!selectedToken || !amount || isLoading}
            onClick={handleSingleBurn}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Flame className="mr-2" />
            )}{" "}
            INCINERATE
          </Button>
        </div>
      );
    }

    if (mode === "vault") {
      return (
        <div className="space-y-6 animate-slide-up">
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <Lock className="h-4 w-4" />{" "}
            <AlertDescription>Requires Lock ID</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label>Lock ID</Label>
            <Input
              value={lockId}
              onChange={(e) => setLockId(e.target.value)}
              className="h-12 font-mono"
              placeholder="Enter Lock ID"
            />
          </div>
          <div className="space-y-2">
            <Label>Select Token</Label>
            <Select
              value={selectedLockMint}
              onValueChange={setSelectedLockMint}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose Asset" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem key={t.id} value={t.mintAddress}>
                    {t.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={lockBurnAmount}
              onChange={(e) => setLockBurnAmount(e.target.value)}
              className="h-12"
              placeholder="0.00"
            />
          </div>
          <Button
            className="w-full h-14 bg-slate-900 text-white"
            disabled={
              !lockId || !selectedLockMint || !lockBurnAmount || isLoading
            }
            onClick={handleVaultBurn}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Flame className="mr-2" />
            )}{" "}
            Burn from Vault
          </Button>
        </div>
      );
    }

    if (mode === "batch") {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end p-4 bg-muted/20 rounded-lg border">
            <div className="space-y-2 w-full">
              <Label>Add Token to Queue</Label>
              <Select
                value={batchSelectedToken}
                onValueChange={setBatchSelectedToken}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((t) => (
                    <SelectItem key={t.id} value={t.mintAddress}>
                      {t.symbol} ({t.balance})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  placeholder="0.00"
                />
                <div
                  className="absolute right-1 top-1 text-[10px] cursor-pointer bg-primary/10 px-1 rounded text-primary"
                  onClick={() => {
                    const t = tokens.find(
                      (x) => x.mintAddress === batchSelectedToken
                    );
                    if (t) setBatchAmount(t.balance.toString());
                  }}
                >
                  MAX
                </div>
              </div>
            </div>
            <Button
              onClick={addToQueue}
              disabled={!batchSelectedToken || !batchAmount}
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-xs font-bold text-muted-foreground">
                Burn Queue ({queue.length})
              </div>
              <ScrollArea className="h-40">
                {queue.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/10"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="font-bold">
                        {item.amount} {item.symbol}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(idx)}
                      className="text-red-500 h-6 w-6 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          <Button
            className="w-full h-14 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold"
            disabled={queue.length === 0 || isLoading}
            onClick={handleBatchExecute}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Flame className="mr-2" />
            )}{" "}
            INCINERATE BATCH ({queue.length})
          </Button>
        </div>
      );
    }
  };

  if (view === "history") {
    return (
      <BurnerList history={burnHistory} onStartBurn={() => setView("form")} />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-slide-up">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === 2) {
              setStep(1);
              setMode(null);
            } else setView("history");
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />{" "}
          {step === 1 ? "Back to History" : "Change Mode"}
        </Button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold flex items-center justify-center gap-2">
          <Flame className="text-orange-600 h-8 w-8" /> Token Incinerator
        </h2>
        <p className="text-muted-foreground">Permanently destroy assets.</p>
      </div>

      <Card className="card-fintech border-orange-200/20 shadow-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>
            Step {step}: {step === 1 ? "Select Method" : "Configure Burn"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 ? renderStep1() : renderStep2()}
        </CardContent>
      </Card>
    </div>
  );
}
