"use client";

import type React from "react";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@project-serum/anchor";
import { SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Coins, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TokenCreationFormProps {
  onTokenCreated: (token: any) => void;
  onCancel: () => void;
}

export function TokenCreationForm({
  onTokenCreated,
  onCancel,
}: TokenCreationFormProps) {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    decimals: "9",
    initialSupply: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Token name is required";
    if (!formData.symbol.trim()) newErrors.symbol = "Token symbol is required";
    if (formData.symbol.length > 10)
      newErrors.symbol = "Symbol must be 10 characters or less";
    if (
      !formData.initialSupply ||
      Number.parseFloat(formData.initialSupply) <= 0
    ) {
      newErrors.initialSupply = "Initial supply must be greater than 0";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !publicKey || !program) return;

    setIsCreating(true);
    setSignature(null);
    setErrors({});

    try {
      const connection = program.provider.connection;

      // ✅ Ensure wallet has SOL on Devnet
      const balance = await connection.getBalance(publicKey);
      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log("Requesting airdrop of 2 SOL on Devnet...");
        const sig = await connection.requestAirdrop(
          publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(sig, "confirmed");
        console.log("Airdrop complete!");
      }

      // 🔑 1. Derive mint PDA
      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), publicKey.toBuffer()],
        program.programId
      );

      // 🔑 2. Derive token account PDA
      const constantSeed = Buffer.from([
        6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121,
        172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0,
        169,
      ]);

      const programBytes = new Uint8Array([
        140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131,
        11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89,
      ]);
      const pdaProgramId = new PublicKey(programBytes);

      const [tokenAccountPda] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), constantSeed, mintPda.toBuffer()],
        pdaProgramId
      );

      // 🔑 3. Call program
      const sig = await program.methods
        .createToken(
          Number(formData.decimals),
          new anchor.BN(formData.initialSupply)
        )
        .accounts({
          mint: mintPda,
          token_account: tokenAccountPda,
          payer: publicKey,
          system_program: SystemProgram.programId,
          token_program: TOKEN_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })

        .rpc();

      setSignature(sig);

      const newToken = {
        id: crypto.randomUUID(),
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        decimals: Number(formData.decimals),
        supply: Number(formData.initialSupply),
        mintAddress: mintPda.toBase58(),
        createdAt: new Date().toISOString(),
        status: "active",
      };
      onTokenCreated(newToken);
    } catch (error: any) {
      console.error("Failed to create token:", error);
      setErrors({ form: error.message || "An unknown error occurred" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="animate-slide-up">
      <Card className="card-fintech w-full max-w-2xl mx-auto">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl">
                Create New Token
              </CardTitle>
              <CardDescription className="text-base">
                Deploy a new SPL token on Solana blockchain
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Token Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., My Awesome Token"
                  className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive animate-fade-in flex items-center gap-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Symbol</Label>
                <Input
                  value={formData.symbol}
                  onChange={(e) =>
                    handleInputChange("symbol", e.target.value.toUpperCase())
                  }
                  placeholder="e.g., MAT"
                  className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={10}
                  required
                />
                {errors.symbol && (
                  <p className="text-sm text-destructive animate-fade-in flex items-center gap-1">
                    {errors.symbol}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Describe your token's purpose and utility..."
                className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Decimals</Label>
                <Input
                  type="number"
                  value={formData.decimals}
                  onChange={(e) =>
                    handleInputChange("decimals", e.target.value)
                  }
                  min="0"
                  max="18"
                  className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Initial Supply</Label>
                <Input
                  type="number"
                  value={formData.initialSupply}
                  onChange={(e) =>
                    handleInputChange("initialSupply", e.target.value)
                  }
                  placeholder="1000000"
                  min="1"
                  className="h-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                {errors.initialSupply && (
                  <p className="text-sm text-destructive animate-fade-in flex items-center gap-1">
                    {errors.initialSupply}
                  </p>
                )}
              </div>
            </div>

            {errors.form && (
              <Alert
                variant="destructive"
                className="animate-fade-in border-destructive/50 bg-destructive/5"
              >
                <AlertDescription className="text-sm">
                  {errors.form}
                </AlertDescription>
              </Alert>
            )}

            {signature && (
              <Alert className="animate-fade-in border-green-500/50 bg-green-500/5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      Token created successfully!
                    </span>
                    <a
                      href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors duration-200"
                    >
                      View Transaction
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isCreating}
                className="btn-fintech flex-1 h-12 text-base font-medium"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Token...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Create Token
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="px-8 h-12 text-base font-medium hover:bg-muted/50 transition-all duration-200 bg-transparent"
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
