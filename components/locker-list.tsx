// FILE: components/locker-list.tsx

"use client";

import { LockRecord } from "@/hooks/useLocker";
import { Token } from "@/types/token";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "./ui/countdown-timer";
import { Lock, Unlock, Flame, Copy, Loader2, Plus, Coins } from "lucide-react";
import Image from "next/image";

interface LockerListProps {
  locks: LockRecord[];
  knownTokens: Token[];
  isLoading: boolean;
  isProcessing: boolean;
  onWithdraw: (lock: LockRecord) => void;
  onBurn: (lock: LockRecord) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export function LockerList({
  locks,
  knownTokens,
  isLoading,
  isProcessing,
  onWithdraw,
  onBurn,
  onCreateNew,
  onRefresh,
}: LockerListProps) {
  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  // UPDATED: Check lock.image first
  const getTokenImage = (lock: LockRecord) => {
    if (lock.image) return lock.image;
    const t = knownTokens.find((token) => token.mintAddress === lock.tokenMint);
    return t?.image || null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (locks.length === 0) {
    return (
      <Card className="animate-slide-up border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-primary/5 p-4 rounded-full mb-4">
            <Lock className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold">No active locks</h3>
          <p className="text-muted-foreground mb-4">
            Secure your liquidity or team tokens today.
          </p>
          <Button onClick={onCreateNew} className="btn-fintech">
            Create your first Lock
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif text-2xl">
            Liquidity Vaults
          </CardTitle>
          <CardDescription>Manage your locked assets</CardDescription>
        </div>
        <Button onClick={onCreateNew} className="btn-fintech gap-2">
          <Plus className="h-4 w-4" /> New Lock
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] pl-8">Asset</TableHead>
                <TableHead className="text-center">Locked Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Lock ID</TableHead>
                <TableHead className="min-w-40 text-center">
                  Unlock Time / Withdraw
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locks.map((lock) => {
                const img = getTokenImage(lock); // Use new helper
                const isTimeUp = Date.now() > lock.unlockDate.getTime();

                return (
                  <TableRow key={lock.pubkey}>
                    {/* ASSET */}
                    <TableCell>
                      <div className="flex items-center justify-start gap-3 pl-4">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border shrink-0">
                          {img ? (
                            <Image
                              src={img}
                              alt="token"
                              layout="fill"
                              objectFit="cover"
                              //   unoptimized // Removed to match working TokenList, re-add if needed
                            />
                          ) : (
                            <Coins className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            {lock.tokenName || "Unknown"}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{lock.tokenSymbol}</span>
                            <Copy
                              className="h-3 w-3 cursor-pointer hover:text-primary"
                              onClick={() => copyToClipboard(lock.tokenMint)}
                            />
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* AMOUNT */}
                    <TableCell className="font-mono text-base pl-4 font-medium">
                      {lock.amount.toLocaleString()}
                    </TableCell>

                    {/* STATUS */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {isTimeUp ? (
                          <Badge className="bg-green-500 hover:bg-green-600 border-none text-white gap-1 px-3 py-1 text-xs font-medium w-28 justify-center">
                            <Unlock className="h-3.5 w-3.5" /> Unlocked
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-600 hover:bg-blue-700 border-none text-white gap-1 px-3 py-1 text-xs font-medium w-28 justify-center">
                            <Lock className="h-3.5 w-3.5" /> Locked
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* LOCK ID */}
                    <TableCell className="text-center">
                      <div
                        className="flex items-center justify-center gap-1 cursor-pointer pl-4 hover:text-primary group"
                        onClick={() => copyToClipboard(lock.lockId)}
                      >
                        <code className="bg-muted px-2 py-1 rounded text-xs group-hover:bg-primary/10 transition-colors font-mono">
                          {lock.lockId}
                        </code>
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="text-center">
                      {isTimeUp ? (
                        <div className="flex justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all font-semibold"
                            onClick={() => onWithdraw(lock)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4 mr-2" />
                            )}
                            Withdraw
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm flex flex-col items-center">
                          <CountdownTimer
                            targetDate={lock.unlockDate}
                            onExpire={onRefresh}
                          />
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Until {lock.unlockDate.toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => onBurn(lock)}
                          title="Burn Tokens"
                        >
                          <Flame className="h-4 w-4 mr-2" />
                          Burn
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
