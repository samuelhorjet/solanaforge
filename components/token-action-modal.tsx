// FILE: components/token-action-modal.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Send,
  Plus,
  History,
  UserCheck,
  Ban,
  Lock,
} from "lucide-react";
import { Token } from "@/types/token";
import { useTokenActions } from "@/hooks/useTokenActions";
import { PublicKey } from "@solana/web3.js";
import Image from "next/image";

interface TokenActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  action: "transfer" | "mint" | null;
  onSuccess: () => void;
}

export function TokenActionModal({
  isOpen,
  onClose,
  token,
  action,
  onSuccess,
}: TokenActionModalProps) {
  const { transferToken, mintMoreToken, isProcessing } = useTokenActions();

  // Form State
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Validation State
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);

  // Token Extension Flags
  const isNonTransferable = token?.extensions?.nonTransferable || false;

  // Load Saved Addresses
  useEffect(() => {
    const saved = localStorage.getItem("solana_forge_contacts");
    if (saved) setSavedAddresses(JSON.parse(saved));
  }, []);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setRecipient("");
      setMsg(null);
      setIsInsufficientBalance(false);
      setIsAddressValid(true);
    }
  }, [isOpen, token]);

  const validateAddress = (addr: string) => {
    setRecipient(addr);
    if (!addr) {
      setIsAddressValid(true);
      return;
    }
    try {
      const pubKey = new PublicKey(addr);
      setIsAddressValid(PublicKey.isOnCurve(pubKey));
    } catch (e) {
      setIsAddressValid(false);
    }
  };

  const validateAmount = (val: string) => {
    setAmount(val);
    if (!token) return;

    if (action === "transfer") {
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > token.balance) {
        setIsInsufficientBalance(true);
      } else {
        setIsInsufficientBalance(false);
      }
    } else {
      setIsInsufficientBalance(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !amount || !action) return;
    setMsg(null);

    try {
      if (action === "transfer") {
        if (isNonTransferable) return; // double check

        if (!recipient || !isAddressValid) {
          setMsg({ type: "error", text: "Invalid Recipient Address" });
          return;
        }
        if (isInsufficientBalance) return;

        await transferToken(
          token.mintAddress,
          recipient,
          parseFloat(amount),
          token.decimals,
          token.programId
        );

        // Save contact
        if (!savedAddresses.includes(recipient)) {
          const newCtx = [recipient, ...savedAddresses].slice(0, 5);
          setSavedAddresses(newCtx);
          localStorage.setItem("solana_forge_contacts", JSON.stringify(newCtx));
        }
        setMsg({ type: "success", text: "Transfer Successful!" });
      } else if (action === "mint") {
        await mintMoreToken(
          token.mintAddress,
          parseFloat(amount),
          token.decimals,
          token.programId
        );
        setMsg({ type: "success", text: "Supply Updated!" });
      }

      onSuccess();
      setTimeout(onClose, 2000);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Transaction Failed" });
    }
  };

  if (!token) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "transfer" ? (
              <Send className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {action === "transfer" ? "Transfer Assets" : "Mint Supply"}
          </DialogTitle>
          <DialogDescription>
            {action === "transfer"
              ? `Sending ${token.symbol} to another wallet.`
              : `Increase the total supply of ${token.symbol}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Extension Warning for Soulbound */}
          {action === "transfer" && isNonTransferable && (
            <Alert
              variant="destructive"
              className="bg-destructive/10 text-destructive border-destructive/20"
            >
              <Lock className="h-4 w-4" />
              <AlertDescription className="font-semibold">
                This token is Soulbound (Non-Transferable). Transfers are
                disabled.
              </AlertDescription>
            </Alert>
          )}

          {/* Token Header */}
          <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-background border">
                {token.image ? (
                  <Image src={token.image} layout="fill" alt="icon" />
                ) : (
                  <div className="bg-muted h-full w-full" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm">{token.name}</p>
                <p className="text-xs text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-mono font-medium">
                {token.balance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recipient (Transfer Only) */}
          {action === "transfer" && (
            <div
              className={`space-y-3 ${
                isNonTransferable ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <Label>Recipient Address</Label>
                {savedAddresses.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                      >
                        <History className="h-3 w-3" /> Recent
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Recent Contacts</DropdownMenuLabel>
                      {savedAddresses.map((addr) => (
                        <DropdownMenuItem
                          key={addr}
                          onClick={() => validateAddress(addr)}
                        >
                          <UserCheck className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span className="font-mono text-xs">
                            {addr.slice(0, 4)}...{addr.slice(-4)}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="relative">
                <Input
                  placeholder="Paste Solana address..."
                  value={recipient}
                  onChange={(e) => validateAddress(e.target.value)}
                  disabled={isNonTransferable}
                  className={`font-mono text-xs ${
                    !isAddressValid && recipient
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
                {recipient && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isAddressValid ? (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Ban className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount */}
          <div
            className={`space-y-2 ${
              action === "transfer" && isNonTransferable
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
          >
            <div className="flex justify-between">
              <Label>Amount</Label>
              {action === "transfer" && (
                <span
                  className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={() => validateAmount(token.balance.toString())}
                >
                  Max: {token.balance}
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => validateAmount(e.target.value)}
              disabled={action === "transfer" && isNonTransferable}
              className={
                isInsufficientBalance
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {isInsufficientBalance && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <Ban className="h-3 w-3" /> Insufficient Balance
              </p>
            )}
          </div>

          {/* Messages */}
          {msg && (
            <Alert
              variant={msg.type === "error" ? "destructive" : "default"}
              className={
                msg.type === "success"
                  ? "bg-green-500/10 text-green-600 border-green-200"
                  : ""
              }
            >
              <AlertDescription>{msg.text}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              !amount ||
              (action === "transfer" &&
                (isNonTransferable || !isAddressValid || isInsufficientBalance))
            }
          >
            {isProcessing ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : action === "transfer" ? (
              <Send className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {action === "transfer" ? "Transfer" : "Mint"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
