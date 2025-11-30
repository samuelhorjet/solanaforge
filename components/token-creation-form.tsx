// FILE: components/token-creation-form.tsx

"use client";

import React, { useRef, useState } from "react";
import { useTokenFactory } from "@/hooks/useTokenFactory";
import { Token } from "@/types/token";
import { useConnection } from "@solana/wallet-adapter-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Keypair } from "@solana/web3.js";
import {
  Coins,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  UploadCloud,
  X,
  Sparkles,
  ChevronDown,
  Check,
  Zap,
  LockOpen,
  Lock,
  Rocket,
  FileJson,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface TokenCreationFormProps {
  onTokenCreated: (token: Token) => void;
  onCancel: () => void;
}

export function TokenCreationForm({
  onTokenCreated,
  onCancel,
}: TokenCreationFormProps) {
  const { connection } = useConnection();
  const {
    step,
    setStep,
    addressMethod,
    setAddressMethod,
    formData,
    handleInputChange,
    tokenStandard,
    setTokenStandard,
    handleKeypairUpload,
    uploadedKeypair,
    keypairFileError,
    setUploadedKeypair,
    vanityPrefix,
    setVanityPrefix,
    vanityResults,
    isGrinding,
    grindVanityAddress,
    stopGrinding,
    stats,
    selectedVanityKey,
    setSelectedVanityKey,
    tokenImage,
    tokenImagePreview,
    handleImageSelect,
    isCreating,
    statusMessage,
    errors,
    setErrors,
    signature,
    createToken,
  } = useTokenFactory(onTokenCreated);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [showExtensions, setShowExtensions] = useState(true);

  // State for manual input
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isCheckingManual, setIsCheckingManual] = useState(false);

  // Helper to check if Step 1 is valid to proceed
  const canProceedToStep2 = () => {
    if (addressMethod === "random") return true;
    if (addressMethod === "custom") {
      // Must have either an uploaded/pasted keypair OR a selected vanity key
      return uploadedKeypair !== null || selectedVanityKey !== null;
    }
    return false;
  };

  // Logic to validate pasted private key AND check on-chain availability
  const handleManualKeyInput = async (value: string) => {
    setManualInput(value);
    setManualError(null);
    setUploadedKeypair(null); // Reset global state until fully valid

    if (!value.trim()) return;

    try {
      // 1. Try parsing JSON
      let parsed: number[];
      try {
        parsed = JSON.parse(value);
      } catch (e) {
        throw new Error(
          "Invalid format. Please paste a valid JSON array (e.g. [123, 45, ...])"
        );
      }

      // 2. Validate Array structure
      if (!Array.isArray(parsed)) {
        throw new Error("Input is not an array.");
      }
      if (parsed.length !== 64) {
        throw new Error(
          `Invalid length (${parsed.length}). Private keys must be 64 numbers.`
        );
      }

      // 3. Attempt to generate Keypair (Client-side validation)
      const array = Uint8Array.from(parsed);
      const kp = Keypair.fromSecretKey(array);

      // 4. Check if address is used on-chain (Async)
      setIsCheckingManual(true);
      try {
        const accountInfo = await connection.getAccountInfo(kp.publicKey);
        if (accountInfo !== null) {
          setManualError(
            "This address is already in use on-chain. Please use a fresh keypair."
          );
        } else {
          // Success: Valid format AND Unused address
          setUploadedKeypair(kp);
        }
      } catch (err) {
        console.error("RPC Error:", err);
        setManualError("Failed to verify address availability. Network error.");
      } finally {
        setIsCheckingManual(false);
      }
    } catch (err: any) {
      setManualError(err.message);
      setIsCheckingManual(false);
    }
  };

  return (
    <Card className="card-fintech w-full max-w-2xl mx-auto border-border/60 shadow-xl pb-6">
      <CardHeader className="pb-6 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
            {step === 1 ? (
              <Rocket className="h-6 w-6" />
            ) : (
              <Coins className="h-6 w-6" />
            )}
          </div>
          <div>
            <CardTitle className="font-serif text-2xl">
              {step === 1 ? "Token Configuration" : "Token Metadata"}
            </CardTitle>
            <CardDescription>
              Step {step} of 2 •{" "}
              {step === 1
                ? "Choose your token standard"
                : "Fill in asset details"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createToken();
          }}
          className="space-y-6"
        >
          {/* ======================= STEP 1: CONFIGURATION ======================= */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* 1. Token Standard Selection */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  1. Choose Program
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setTokenStandard("token")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      tokenStandard === "token"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Standard (Legacy)</span>
                      {tokenStandard === "token" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Best for broad compatibility. No extensions supported.
                    </p>
                  </div>

                  <div
                    onClick={() => setTokenStandard("token-2022")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      tokenStandard === "token-2022"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Token-2022</span>
                      {tokenStandard === "token-2022" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports Taxes, Interest, Non-Transferable & more.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Address Generation Method */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">2. Mint Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => {
                      setAddressMethod("random");
                      setUploadedKeypair(null);
                      setManualInput("");
                      setManualError(null);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      addressMethod === "random"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" /> Random
                        (Fast)
                      </span>
                      {addressMethod === "random" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Instantly generate a random address. Easiest option.
                    </p>
                  </div>

                  <div
                    onClick={() => setAddressMethod("custom")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      addressMethod === "custom"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" /> Custom
                        Address
                      </span>
                      {addressMethod === "custom" && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload keypair file, paste private key, or grind vanity.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Custom Address Logic (Conditional) */}
              <AnimatePresence>
                {addressMethod === "custom" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden border-t pt-4"
                  >
                    <Tabs defaultValue="paste" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-4 h-auto p-1">
                        <TabsTrigger
                          value="paste"
                          className="text-xs sm:text-sm"
                        >
                          Paste Key
                        </TabsTrigger>
                        <TabsTrigger
                          value="upload"
                          className="text-xs sm:text-sm"
                        >
                          Upload File
                        </TabsTrigger>
                        <TabsTrigger
                          value="grind"
                          className="text-xs sm:text-sm"
                        >
                          Vanity Gen
                        </TabsTrigger>
                      </TabsList>

                      {/* A. PASTE KEY TAB */}
                      <TabsContent value="paste" className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            Paste Private Key JSON Array
                          </Label>
                          <div className="relative">
                            <Textarea
                              placeholder="Example: [173, 21, 99, 44, ...]"
                              className={`font-mono text-xs bg-muted/30 pr-10 ${
                                manualError
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : ""
                              }`}
                              rows={4}
                              value={manualInput}
                              onChange={(e) =>
                                handleManualKeyInput(e.target.value)
                              }
                            />
                            {isCheckingManual && (
                              <div className="absolute top-2 right-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                          </div>

                          {manualError ? (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {manualError}
                            </p>
                          ) : uploadedKeypair && manualInput ? (
                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold text-green-700">
                                  Valid & Unused
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground break-all font-mono bg-background/50 p-2 rounded">
                                {uploadedKeypair.publicKey.toBase58()}
                              </div>
                              <p className="text-[10px] text-green-700/70 mt-2">
                                We verified this address is not currently in use
                                on-chain.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Paste the raw JSON array from your keypair file.
                              We verify the format and check availability.
                            </p>
                          )}
                        </div>
                      </TabsContent>

                      {/* B. UPLOAD TAB */}
                      <TabsContent value="upload" className="space-y-4">
                        <div className="p-4 border border-dashed rounded-xl bg-muted/20 text-center">
                          <input
                            type="file"
                            accept=".json"
                            ref={jsonInputRef}
                            onChange={handleKeypairUpload}
                            className="hidden"
                          />
                          {!uploadedKeypair || manualInput ? (
                            <div className="flex flex-col items-center gap-2">
                              <FileJson className="h-10 w-10 text-muted-foreground" />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setManualInput("");
                                  setManualError(null);
                                  jsonInputRef.current?.click();
                                }}
                              >
                                Select .JSON File
                              </Button>
                              <p className="text-xs text-muted-foreground max-w-xs">
                                Upload a Solana Keypair JSON file.
                                <br />
                                <span className="text-orange-500">
                                  File is processed in memory and never sent to
                                  a server.
                                </span>
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle className="h-10 w-10 text-green-500" />
                              <div className="text-sm font-mono bg-background p-2 rounded border">
                                {uploadedKeypair.publicKey.toBase58()}
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setUploadedKeypair(null);
                                  if (jsonInputRef.current)
                                    jsonInputRef.current.value = "";
                                }}
                              >
                                Remove File
                              </Button>
                            </div>
                          )}
                          {keypairFileError && (
                            <p className="text-xs text-destructive mt-2">
                              {keypairFileError}
                            </p>
                          )}
                        </div>
                      </TabsContent>

                      {/* C. GRIND TAB */}
                      <TabsContent value="grind" className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Prefix (e.g. ABC)"
                            className="font-mono uppercase"
                            value={vanityPrefix}
                            onChange={(e) => setVanityPrefix(e.target.value)}
                            maxLength={5}
                            disabled={isGrinding}
                          />
                          <Button
                            type="button"
                            onClick={() =>
                              isGrinding
                                ? stopGrinding()
                                : grindVanityAddress(false)
                            }
                          >
                            {isGrinding ? <X className="h-4 w-4" /> : "Start"}
                          </Button>
                        </div>

                        {isGrinding && (
                          <p className="text-xs animate-pulse text-primary font-mono text-center">
                            Scanning: {stats.speed}/s
                          </p>
                        )}

                        {/* Vanity Results List */}
                        {vanityResults.length > 0 && (
                          <ScrollArea className="h-32 rounded border bg-background/50 p-2">
                            {vanityResults.map((kp, idx) => {
                              const addr = kp.publicKey.toBase58();
                              const sel = selectedVanityKey === addr;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedVanityKey(addr)}
                                  className={`flex justify-between items-center p-2 rounded text-xs font-mono cursor-pointer ${
                                    sel
                                      ? "bg-primary/10 border-primary border"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  <span>
                                    <span className="text-primary font-bold">
                                      {vanityPrefix}
                                    </span>
                                    {addr.slice(vanityPrefix.length, 16)}...
                                  </span>
                                  {sel && (
                                    <Check className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                              );
                            })}
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ======================= STEP 2: METADATA ======================= */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* 1. Image Upload */}
              <div className="space-y-2">
                <Label>Token Icon *</Label>
                <div
                  onClick={() => !isCreating && fileInputRef.current?.click()}
                  className={`relative h-24 w-full border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
                    !isCreating
                      ? "cursor-pointer hover:bg-muted/50 border-border hover:border-primary/50"
                      : "opacity-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                    disabled={isCreating}
                  />
                  {tokenImagePreview ? (
                    <Image
                      src={tokenImagePreview}
                      alt="Preview"
                      layout="fill"
                      objectFit="contain"
                      className="p-2"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UploadCloud className="h-5 w-5" />{" "}
                      <span className="text-sm">Upload Image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. SolanaForge"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Symbol *</Label>
                  <Input
                    placeholder="e.g. FORGE"
                    value={formData.symbol}
                    onChange={(e) =>
                      handleInputChange("symbol", e.target.value.toUpperCase())
                    }
                    maxLength={10}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Decimals *</Label>
                  <Input
                    type="number"
                    placeholder="9"
                    value={formData.decimals}
                    onChange={(e) =>
                      handleInputChange("decimals", e.target.value)
                    }
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Supply *</Label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={formData.initialSupply}
                    onChange={(e) =>
                      handleInputChange("initialSupply", e.target.value)
                    }
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* 3. Description & Socials (Optional) */}
              <div className="space-y-3 pt-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Additional Info (Optional)
                </Label>
                <Textarea
                  placeholder="Description of your project..."
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="bg-background/50 h-20"
                />

                {/* --- UPDATED SOCIAL INPUTS WITH VALIDATION DISPLAY --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Input
                      placeholder="Website (e.g. site.com)"
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      className={`text-xs ${
                        errors.website ? "border-red-500" : ""
                      }`}
                    />
                    {errors.website && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Invalid URL
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Input
                      placeholder="Twitter (e.g. x.com/user)"
                      value={formData.twitter}
                      onChange={(e) =>
                        handleInputChange("twitter", e.target.value)
                      }
                      className={`text-xs ${
                        errors.twitter ? "border-red-500" : ""
                      }`}
                    />
                    {errors.twitter && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Invalid X/Twitter
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Input
                      placeholder="Telegram (e.g. t.me/user)"
                      value={formData.telegram}
                      onChange={(e) =>
                        handleInputChange("telegram", e.target.value)
                      }
                      className={`text-xs ${
                        errors.telegram ? "border-red-500" : ""
                      }`}
                    />
                    {errors.telegram && (
                      <span className="text-[10px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Invalid Telegram
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Mint Authority */}
              <div className="p-3 border rounded-lg bg-background/50 flex items-center gap-3">
                {formData.isMintable ? (
                  <LockOpen className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-orange-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="isMintable"
                      className="font-semibold text-sm"
                    >
                      Enable Future Minting
                    </Label>
                    <Checkbox
                      id="isMintable"
                      checked={formData.isMintable}
                      onCheckedChange={(c) =>
                        handleInputChange("isMintable", c)
                      }
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Extensions (Token-2022 Only) */}
              {tokenStandard === "token-2022" && (
                <div className="border rounded-xl bg-muted/20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowExtensions(!showExtensions)}
                    className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Zap className="h-4 w-4 text-yellow-500" /> Token-2022
                      Extensions
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showExtensions ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {showExtensions && (
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Transfer Fee (%)</Label>
                          <Input
                            type="number"
                            value={formData.transferFee}
                            onChange={(e) =>
                              handleInputChange("transferFee", e.target.value)
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Interest Rate (%)</Label>
                          <Input
                            type="number"
                            value={formData.interestRate}
                            onChange={(e) =>
                              handleInputChange("interestRate", e.target.value)
                            }
                            className="bg-background"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        {[
                          {
                            id: "enablePermanentDelegate",
                            label: "Permanent Delegate",
                            sub: "God Mode (Burn/Transfer any)",
                          },
                          {
                            id: "defaultAccountStateFrozen",
                            label: "Default Frozen",
                            sub: "KYC Mode (Must Thaw)",
                          },
                          {
                            id: "revokeUpdateAuthority",
                            label: "Immutable Metadata",
                            sub: "Cannot change info later",
                          },
                          {
                            id: "nonTransferable",
                            label: "Soulbound",
                            sub: "Cannot be transferred",
                          },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={item.id}
                              checked={
                                formData[
                                  item.id as keyof typeof formData
                                ] as boolean
                              }
                              onCheckedChange={(c) =>
                                handleInputChange(item.id, c)
                              }
                              disabled={isCreating}
                            />
                            <div>
                              <Label
                                htmlFor={item.id}
                                className="font-medium cursor-pointer text-xs"
                              >
                                {item.label}
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ======================= FOOTER / NAVIGATION ======================= */}
          {errors.form && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}
          {errors.address && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.address}</AlertDescription>
            </Alert>
          )}

          {signature && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>Token Created Successfully!</span>
                <a
                  href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  className="hover:underline flex items-center gap-1 text-xs"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isCreating}
                className="w-24"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}

            {step === 1 ? (
              <Button
                type="button"
                className="flex-1 btn-fintech"
                onClick={() =>
                  canProceedToStep2()
                    ? setStep(2)
                    : setErrors({
                        address: "Please complete the address generation step.",
                      })
                }
              >
                Next Step <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1 btn-fintech shadow-lg shadow-primary/20"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    {statusMessage}
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" /> Mint Token
                  </>
                )}
              </Button>
            )}

            {step === 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className=""
                disabled={isCreating}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}