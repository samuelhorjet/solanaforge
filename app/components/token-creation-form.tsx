"use client"

import React, { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "@/components/solana-provider"
import * as anchor from "@project-serum/anchor"
import {
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Coins } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TokenCreationFormProps {
  onTokenCreated: (token: any) => void
  onCancel: () => void
}

export function TokenCreationForm({
  onTokenCreated,
  onCancel,
}: TokenCreationFormProps) {
  const { publicKey } = useWallet()
  const { program } = useProgram()
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    decimals: "9",
    initialSupply: "",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [signature, setSignature] = useState<string | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Token name is required"
    if (!formData.symbol.trim()) newErrors.symbol = "Token symbol is required"
    if (formData.symbol.length > 10)
      newErrors.symbol = "Symbol must be 10 characters or less"
    if (!formData.initialSupply || Number.parseFloat(formData.initialSupply) <= 0) {
      newErrors.initialSupply = "Initial supply must be greater than 0"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !publicKey || !program) return

    setIsCreating(true)
    setSignature(null)
    setErrors({})

    try {
      const connection = program.provider.connection

      // ✅ Ensure wallet has SOL on Devnet
      const balance = await connection.getBalance(publicKey)
      if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log("Requesting airdrop of 2 SOL on Devnet...")
        const sig = await connection.requestAirdrop(
          publicKey,
          2 * LAMPORTS_PER_SOL
        )
        await connection.confirmTransaction(sig, "confirmed")
        console.log("Airdrop complete!")
      }

      // 1. Generate mint
      const mintKeypair = Keypair.generate()
      const mint = mintKeypair.publicKey

      // 2. Derive PDA for token_account
      const constantSeed = Buffer.from([
        6, 221, 246, 225, 215, 101, 161, 147,
        217, 203, 225, 70, 206, 235, 121, 172,
        28, 180, 133, 237, 95, 91, 55, 145,
        58, 140, 245, 133, 126, 255, 0, 169,
      ])

      const programBytes = new Uint8Array([
        140, 151, 37, 143, 78, 36, 137, 241,
        187, 61, 16, 41, 20, 142, 13, 131,
        11, 90, 19, 153, 218, 255, 16, 132,
        4, 142, 123, 216, 219, 233, 248, 89,
      ])
      const pdaProgramId = new PublicKey(programBytes)

      const [tokenAccountPda] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), constantSeed, mint.toBuffer()],
        pdaProgramId
      )

      // 3. Call program with rpc()
      const sig = await program.methods
        .createToken(
          Number(formData.decimals), // u8
          new anchor.BN(formData.initialSupply) // u64
        )
        .accounts({
          mint,
          token_account: tokenAccountPda,
          payer: publicKey,
          token_program: TOKEN_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        })
        .signers([mintKeypair]) // ✅ Anchor handles this now
        .rpc()

      setSignature(sig)

      // 4. Pass back to parent
      const newToken = {
        id: crypto.randomUUID(), // avoids hydration mismatch
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        decimals: Number(formData.decimals),
        supply: Number(formData.initialSupply),
        mintAddress: mint.toBase58(),
        createdAt: new Date().toISOString(),
        status: "active",
      }
      onTokenCreated(newToken)
    } catch (error: any) {
      console.error("Failed to create token:", error)
      setErrors({ form: error.message || "An unknown error occurred" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-serif">Create New Token</CardTitle>
            <CardDescription>Deploy a new SPL token on Solana</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          <div>
            <Label>Symbol</Label>
            <Input
              value={formData.symbol}
              onChange={(e) => handleInputChange("symbol", e.target.value)}
              required
            />
            {errors.symbol && (
              <p className="text-sm text-red-500">{errors.symbol}</p>
            )}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                handleInputChange("description", e.target.value)
              }
            />
          </div>
          <div>
            <Label>Decimals</Label>
            <Input
              type="number"
              value={formData.decimals}
              onChange={(e) => handleInputChange("decimals", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Initial Supply</Label>
            <Input
              type="number"
              value={formData.initialSupply}
              onChange={(e) =>
                handleInputChange("initialSupply", e.target.value)
              }
              required
            />
            {errors.initialSupply && (
              <p className="text-sm text-red-500">{errors.initialSupply}</p>
            )}
          </div>

          {errors.form && (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {signature && (
            <Alert>
              <AlertDescription>
                ✅ Token created! Transaction:{" "}
                <a
                  href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-500"
                >
                  View on Explorer
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Token"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
