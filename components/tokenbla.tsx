"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  UploadCloud,
  X,
  Sparkles,
  Info,
  ChevronDown,
  Search,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Token } from "@/types/token";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";

type TokenStandard = "token" | "token-2022";

interface TokenCreationFormProps {
  onTokenCreated: (token: Token) => void;
  onCancel: () => void;
}

export function TokenCreationForm({
  onTokenCreated,
  onCancel,
}: TokenCreationFormProps) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { program, provider } = useProgram();

  // --- STATE ---
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>("token-2022");
  const [showExtensions, setShowExtensions] = useState(false);
  
  // Vanity Address State
  const [vanityPrefix, setVanityPrefix] = useState("");
  const [vanityKeypair, setVanityKeypair] = useState<Keypair | null>(null);
  const [isGrinding, setIsGrinding] = useState(false);
  const [grindAttempts, setGrindAttempts] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: "9",
    initialSupply: "",
    // Extensions
    transferFee: "0",
    interestRate: "0",
    nonTransferable: false,
    enablePermanentDelegate: false, // God Mode
    defaultAccountStateFrozen: false, // KYC Mode
    revokeUpdateAuthority: false, // Immutable Metadata
  });

  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [tokenImagePreview, setTokenImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);

  // --- VANITY ADDRESS GENERATOR (Non-Blocking) ---
  const grindVanityAddress = () => {
    if (!vanityPrefix) return;
    
    // Validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(vanityPrefix)) {
        setErrors({ vanity: "Invalid characters. Base58 only (No 0, O, I, l)" });
        return;
    }
    if (vanityPrefix.length > 4) {
        setErrors({ vanity: "Max 4 characters for browser performance." });
        return;
    }

    setIsGrinding(true);
    setVanityKeypair(null);
    setGrindAttempts(0);
    setErrors(prev => ({ ...prev, vanity: "" }));

    let attempts = 0;
    const startTime = Date.now();

    const findMatch = () => {
        // Run in bursts of 50ms to keep UI responsive
        const burstStart = Date.now();
        
        while (Date.now() - burstStart < 50) {
            attempts++;
            const kp = Keypair.generate();
            if (kp.publicKey.toBase58().startsWith(vanityPrefix)) {
                setVanityKeypair(kp);
                setIsGrinding(false);
                return;
            }
        }

        setGrindAttempts(attempts);

        // Stop if taking too long (30 seconds)
        if (Date.now() - startTime > 30000) {
            setIsGrinding(false);
            setErrors({ vanity: "Search timed out. Try a shorter prefix." });
            return;
        }

        // Schedule next burst
        if (!vanityKeypair) {
            requestAnimationFrame(findMatch);
        }
    };

    findMatch();
  };

  // --- VALIDATION ---
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Token name is required.";
    if (!formData.symbol.trim()) newErrors.symbol = "Symbol is required.";
    if (!tokenImage) newErrors.tokenImage = "A token image is required.";
    
    const decimals = Number(formData.decimals);
    if (isNaN(decimals) || decimals < 0 || decimals > 18)
      newErrors.decimals = "Decimals must be between 0 and 18.";
      
    const initialSupply = Number(formData.initialSupply);
    if (isNaN(initialSupply) || initialSupply <= 0)
      newErrors.initialSupply = "Initial supply must be a positive number.";

    if (tokenStandard === "token-2022") {
      const transferFee = Number(formData.transferFee);
      if (isNaN(transferFee) || transferFee < 0 || transferFee > 100)
        newErrors.transferFee = "Fee must be between 0 and 100.";
        
      const interestRate = Number(formData.interestRate);
      if (isNaN(interestRate) || interestRate < 0)
        newErrors.interestRate = "Interest rate must be positive.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, tokenImage: "Please select a valid image file." }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, tokenImage: "Image size should not exceed 5MB." }));
        return;
      }
      setTokenImage(file);
      setTokenImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, tokenImage: "" }));
    }
  };

  const uploadToIpfs = async (file: File | Blob, isJson = false): Promise<string> => {
    const formData = new FormData();
    if (isJson && file instanceof Blob) {
        formData.append("file", file, "metadata.json");
    } else {
        formData.append("file", file);
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !publicKey || !program || !provider) return;

    setIsCreating(true);
    setSignature(null);
    setErrors({});
    setStatusMessage("Initializing...");

    try {
      // 1. Upload Assets to IPFS
      setStatusMessage("Uploading image to IPFS (Pinata)...");
      const imageUri = await uploadToIpfs(tokenImage!);

      setStatusMessage("Uploading metadata...");
      const metadataJson = JSON.stringify({
        name: formData.name,
        symbol: formData.symbol,
        description: "Created with SolanaForge",
        image: imageUri,
      });
      const metadataBlob = new Blob([metadataJson], { type: "application/json" });
      const metadataUri = await uploadToIpfs(metadataBlob, true);

      // 2. Prepare Transaction
      setStatusMessage("Preparing transaction...");
      
      // Use Vanity Keypair if found, otherwise generate random
      const mintKeypair = vanityKeypair || Keypair.generate();
      
      const decimals = Number(formData.decimals);
      const supply = new anchor.BN(formData.initialSupply);
      const multiplier = new anchor.BN(10).pow(new anchor.BN(decimals));
      const adjustedSupply = supply.mul(multiplier);

      const selectedProgramId = tokenStandard === "token-2022" 
        ? TOKEN_2022_PROGRAM_ID 
        : TOKEN_PROGRAM_ID;

      // Extensions Arguments
      const feeBasisPoints = formData.transferFee ? Math.floor(Number(formData.transferFee) * 100) : 0;
      const interestRateNum = formData.interestRate ? Math.floor(Number(formData.interestRate)) : 0;

      // Explicitly convert Metaplex ID
      const TOKEN_METADATA_PROGRAM_ID = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID.toString());

      const [userAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );

      const [metadataPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"), 
            TOKEN_METADATA_PROGRAM_ID.toBuffer(), 
            mintKeypair.publicKey.toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const tokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        publicKey,
        false,
        selectedProgramId
      );

      const standardArg = tokenStandard === "token-2022" 
        ? { fungible2022: {} } 
        : { fungible: {} };

      // 3. Send Transaction
      setStatusMessage("Please sign the transaction...");

      const tx = await program.methods
        .createToken(
            formData.name,
            formData.symbol,
            metadataUri,
            decimals,
            adjustedSupply,
            standardArg as any,
            // EXTENSIONS ARGS (Must match Rust order):
            feeBasisPoints,                     // u16
            interestRateNum,                    // i16
            formData.nonTransferable,           // bool
            formData.enablePermanentDelegate,   // bool
            formData.defaultAccountStateFrozen, // bool
            formData.revokeUpdateAuthority      // bool
        )
        .accountsPartial({
            userAccount: userAccountPda,
            authority: publicKey,
            mint: mintKeypair.publicKey,
            tokenAccount: tokenAccount,
            metadata: metadataPda,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            tokenProgram: selectedProgramId,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            instructions: SYSVAR_INSTRUCTIONS_PUBKEY
        })
        .signers([mintKeypair])
        .rpc();

      setSignature(tx);
      setStatusMessage("Success!");

      const newToken: Token = {
        id: mintKeypair.publicKey.toBase58(),
        name: formData.name,
        symbol: formData.symbol,
        decimals: decimals,
        supply: Number(formData.initialSupply),
        balance: Number(formData.initialSupply),
        mintAddress: mintKeypair.publicKey.toBase58(),
        createdAt: new Date().toISOString(),
        status: "active",
      };
      
      onTokenCreated(newToken);

    } catch (error: any) {
      console.error("Creation Error:", error);
      const message = error.message || "Transaction failed";
      setErrors({ form: message });
    } finally {
      setIsCreating(false);
      if (!signature) setStatusMessage("");
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <Card className="card-fintech w-full max-w-2xl mx-auto border-border/60">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="font-serif text-2xl">Create New Token</CardTitle>
            <CardDescription className="text-base">
              Mint a new SPL Token with advanced features.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Token Standard Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-sm font-medium">Token Program</Label>
                <Select
                value={tokenStandard}
                onValueChange={(value: TokenStandard) => setTokenStandard(value)}
                disabled={isCreating}
                >
                <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Standard" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="token">Standard (Legacy)</SelectItem>
                    <SelectItem value="token-2022">Token-2022 (Advanced)</SelectItem>
                </SelectContent>
                </Select>
            </div>
            {/* Vanity Address Input */}
            <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-primary" /> Vanity Prefix
                </Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="ABC" 
                        className="h-12 font-mono uppercase"
                        value={vanityPrefix}
                        onChange={(e) => setVanityPrefix(e.target.value)}
                        maxLength={4}
                        disabled={isCreating || isGrinding}
                    />
                    <Button 
                        type="button" 
                        variant="secondary" 
                        className="h-12 w-12 p-0"
                        onClick={grindVanityAddress}
                        disabled={isGrinding || !vanityPrefix}
                    >
                        {isGrinding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
          </div>

          {/* Vanity Result */}
          {vanityKeypair && (
             <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">Mint Address Found:</p>
                    <code className="text-sm font-bold text-green-700 dark:text-green-400 font-mono">
                        {vanityKeypair.publicKey.toBase58()}
                    </code>
                </div>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setVanityKeypair(null)}
                >
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
             </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Token Icon</Label>
            <div
              className={`relative flex justify-center items-center w-full h-40 border-2 border-dashed border-border rounded-lg ${
                !isCreating ? "cursor-pointer hover:bg-muted/50" : ""
              } transition-colors`}
              onClick={() => !isCreating && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/png, image/jpeg, image/gif"
                className="hidden"
                disabled={isCreating}
              />
              {tokenImagePreview ? (
                <>
                  <Image
                    src={tokenImagePreview}
                    alt="Preview"
                    layout="fill"
                    objectFit="contain"
                    className="rounded-lg p-2"
                  />
                  {!isCreating && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/50 backdrop-blur-sm rounded-full h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTokenImage(null);
                        setTokenImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Upload Icon</p>
                  <p className="text-xs">Max 5MB</p>
                </div>
              )}
            </div>
            {errors.tokenImage && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.tokenImage}
              </p>
            )}
          </div>

          {/* Text Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Token Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="My Token"
                className="h-12"
                disabled={isCreating}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Symbol</Label>
              <Input
                value={formData.symbol}
                onChange={(e) => handleInputChange("symbol", e.target.value.toUpperCase())}
                placeholder="TKN"
                className="h-12"
                maxLength={10}
                disabled={isCreating}
              />
              {errors.symbol && (
                <p className="text-sm text-destructive">{errors.symbol}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Decimals</Label>
              <Input
                type="number"
                value={formData.decimals}
                onChange={(e) => handleInputChange("decimals", e.target.value)}
                className="h-12"
                min="0"
                max="18"
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Initial Supply</Label>
              <Input
                type="number"
                value={formData.initialSupply}
                onChange={(e) => handleInputChange("initialSupply", e.target.value)}
                className="h-12"
                min="1"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* EXTENSIONS */}
          <AnimatePresence>
            {tokenStandard === "token-2022" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setShowExtensions(!showExtensions)}
                    className="flex items-center justify-between w-full"
                    disabled={isCreating}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-serif text-lg font-medium">
                        Token-2022 Extensions
                      </h3>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        showExtensions ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {showExtensions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Transfer Fee (%)
                              </Label>
                              <Input
                                type="number"
                                value={formData.transferFee}
                                onChange={(e) => handleInputChange("transferFee", e.target.value)}
                                placeholder="e.g., 1 for 1%"
                                min="0"
                                max="100"
                                step="0.01"
                                className="h-12"
                                disabled={isCreating}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                Interest Rate (%)
                              </Label>
                              <Input
                                type="number"
                                value={formData.interestRate}
                                onChange={(e) => handleInputChange("interestRate", e.target.value)}
                                placeholder="e.g., 5"
                                min="0"
                                step="0.01"
                                className="h-12"
                                disabled={isCreating}
                              />
                            </div>
                          </div>

                          <div className="space-y-4 pt-2">
                            {/* Permanent Delegate */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="permDelegate"
                                    checked={formData.enablePermanentDelegate}
                                    onCheckedChange={(c) => handleInputChange("enablePermanentDelegate", c as boolean)}
                                    disabled={isCreating}
                                />
                                <div>
                                    <Label htmlFor="permDelegate" className="font-medium cursor-pointer">
                                        Permanent Delegate (God Mode)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allows you to burn or transfer tokens from any wallet.
                                    </p>
                                </div>
                            </div>

                            {/* Default Account State */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="frozenState"
                                    checked={formData.defaultAccountStateFrozen}
                                    onCheckedChange={(c) => handleInputChange("defaultAccountStateFrozen", c as boolean)}
                                    disabled={isCreating}
                                />
                                <div>
                                    <Label htmlFor="frozenState" className="font-medium cursor-pointer">
                                        Default Frozen State (KYC Mode)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Users receive frozen tokens and must be thawed to trade.
                                    </p>
                                </div>
                            </div>

                            {/* Immutable Metadata */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="revokeUpdate"
                                    checked={formData.revokeUpdateAuthority}
                                    onCheckedChange={(c) => handleInputChange("revokeUpdateAuthority", c as boolean)}
                                    disabled={isCreating}
                                />
                                <div>
                                    <Label htmlFor="revokeUpdate" className="font-medium cursor-pointer">
                                        Immutable Metadata
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Permanently lock the Name, Symbol, and Image.
                                    </p>
                                </div>
                            </div>
                            
                            {/* Soulbound */}
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="nonTransferable"
                                    checked={formData.nonTransferable}
                                    onCheckedChange={(c) => handleInputChange("nonTransferable", c as boolean)}
                                    disabled={isCreating}
                                />
                                <Label htmlFor="nonTransferable" className="font-medium cursor-pointer">
                                    Soulbound (Non-Transferable)
                                </Label>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status & Errors */}
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {signature && (
            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300 font-medium">Token Created Successfully!</span>
                  <a
                    href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isCreating || isGrinding}
              className="btn-fintech flex-1 h-12 text-base"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {statusMessage}
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" /> Create Token
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-12 text-base"
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}