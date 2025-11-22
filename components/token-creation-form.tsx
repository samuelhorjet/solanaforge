"use client";

import React, { useRef, useState } from "react";
import { useTokenFactory } from "@/hooks/useTokenFactory";
import { Token } from "@/types/token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { 
    Coins, Loader2, CheckCircle, ExternalLink, AlertCircle, 
    UploadCloud, X, Sparkles, ChevronDown, Search, RefreshCw, Plus, Check, Zap 
} from "lucide-react";

interface TokenCreationFormProps {
  onTokenCreated: (token: Token) => void;
  onCancel: () => void;
}

export function TokenCreationForm({ onTokenCreated, onCancel }: TokenCreationFormProps) {
  const {
    formData, handleInputChange, tokenStandard, setTokenStandard,
    vanityPrefix, setVanityPrefix, vanityResults, isGrinding, grindVanityAddress, stopGrinding, stats,
    selectedVanityKey, setSelectedVanityKey,
    tokenImage, tokenImagePreview, handleImageSelect,
    isCreating, statusMessage, errors, signature, createToken
  } = useTokenFactory(onTokenCreated);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExtensions, setShowExtensions] = useState(true); // Default open for visibility

  return (
    <Card className="card-fintech w-full max-w-2xl mx-auto border-border/60 shadow-xl">
      <CardHeader className="pb-6 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="font-serif text-2xl">Create New Token</CardTitle>
            <CardDescription>Mint professional assets on Solana</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={(e) => { e.preventDefault(); createToken(); }} className="space-y-6">
          
          {/* --- PROGRAM & VANITY --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>Token Program</Label>
                <Select value={tokenStandard} onValueChange={(value: tokenStandard) => setTokenStandard(value)} disabled={isCreating}>
                    <SelectTrigger className="h-12 bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="token">Standard (Legacy)</SelectItem>
                        <SelectItem value="token-2022">Token-2022 (Features)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="flex justify-between">
                    <span className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-purple-500" /> Vanity Address</span>
                    {isGrinding && <span className="text-xs font-mono text-primary animate-pulse">{stats.speed}/s</span>}
                </Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="ABC" 
                        className="h-12 font-mono uppercase bg-background/50"
                        value={vanityPrefix}
                        onChange={(e) => setVanityPrefix(e.target.value)}
                        maxLength={5}
                        disabled={isCreating || isGrinding}
                    />
                    <Button type="button" variant={isGrinding ? "destructive" : "secondary"} className="h-12 w-12" onClick={() => isGrinding ? stopGrinding() : grindVanityAddress(false)}>
                        {isGrinding ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
          </div>

          {/* VANITY RESULTS */}
          <AnimatePresence>
          {(vanityResults.length > 0 || isGrinding) && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                 <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{isGrinding ? `Scanning... (${stats.scanned.toLocaleString()})` : `${vanityResults.length} found`}</span>
                        {!isGrinding && <span onClick={() => grindVanityAddress(true)} className="cursor-pointer hover:text-primary flex items-center"><Plus className="h-3 w-3 mr-1"/> More</span>}
                    </div>
                    <ScrollArea className="h-32 rounded border bg-background/80">
                        <div className="p-2 space-y-1">
                            {vanityResults.map((kp, idx) => {
                                const addr = kp.publicKey.toBase58();
                                const sel = selectedVanityKey === addr;
                                return (
                                    <div key={idx} onClick={() => setSelectedVanityKey(addr)} className={`flex justify-between items-center p-2 rounded text-xs font-mono cursor-pointer ${sel ? "bg-primary/10 border-primary/30 border" : "hover:bg-muted"}`}>
                                        <span><span className="text-primary font-bold">{vanityPrefix}</span>{addr.slice(vanityPrefix.length, 12)}...</span>
                                        {sel && <Check className="h-3 w-3 text-primary" />}
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                 </div>
             </motion.div>
          )}
          </AnimatePresence>

          {/* --- IMAGE UPLOAD --- */}
          <div className="space-y-2">
            <Label>Token Icon</Label>
            <div 
                onClick={() => !isCreating && fileInputRef.current?.click()}
                className={`relative h-32 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${!isCreating ? "cursor-pointer hover:bg-muted/50 border-border hover:border-primary/50" : "opacity-50"}`}
            >
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" disabled={isCreating} />
                {tokenImagePreview ? (
                    <Image src={tokenImagePreview} alt="Preview" layout="fill" objectFit="contain" className="p-2" />
                ) : (
                    <>
                        <div className="bg-primary/10 p-3 rounded-full mb-2"><UploadCloud className="h-6 w-6 text-primary" /></div>
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                    </>
                )}
            </div>
            {errors.tokenImage && <p className="text-xs text-destructive">{errors.tokenImage}</p>}
          </div>

          {/* --- DETAILS (Restored Blur) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>Token Name</Label>
                <Input placeholder="e.g. SolanaForge" value={formData.name} onChange={e => handleInputChange("name", e.target.value)} className="h-12 bg-background/50" disabled={isCreating} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
                <Label>Symbol</Label>
                <Input placeholder="e.g. FORGE" value={formData.symbol} onChange={e => handleInputChange("symbol", e.target.value.toUpperCase())} maxLength={10} className="h-12 bg-background/50" disabled={isCreating} />
                {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label>Decimals</Label>
                <Input type="number" placeholder="9" value={formData.decimals} onChange={e => handleInputChange("decimals", e.target.value)} className="h-12 bg-background/50" disabled={isCreating} />
             </div>
             <div className="space-y-2">
                <Label>Supply</Label>
                <Input type="number" placeholder="1000000" value={formData.initialSupply} onChange={e => handleInputChange("initialSupply", e.target.value)} className="h-12 bg-background/50" disabled={isCreating} />
             </div>
          </div>

          {/* --- EXTENSIONS ACCORDION (Restored) --- */}
          <AnimatePresence>
            {tokenStandard === "token-2022" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="border rounded-xl bg-muted/20 overflow-hidden mt-2">
                        <button type="button" onClick={() => setShowExtensions(!showExtensions)} className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 font-medium"><Zap className="h-4 w-4 text-yellow-500" /> Token-2022 Extensions</div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showExtensions ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                            {showExtensions && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><Label className="text-xs">Transfer Fee (%)</Label><Input type="number" value={formData.transferFee} onChange={e => handleInputChange("transferFee", e.target.value)} className="bg-background" /></div>
                                            <div className="space-y-1"><Label className="text-xs">Interest Rate (%)</Label><Input type="number" value={formData.interestRate} onChange={e => handleInputChange("interestRate", e.target.value)} className="bg-background" /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                            {[
                                                { id: "enablePermanentDelegate", label: "Permanent Delegate", sub: "God Mode (Burn/Transfer any)" },
                                                { id: "defaultAccountStateFrozen", label: "Default Frozen", sub: "KYC Mode (Must Thaw)" },
                                                { id: "revokeUpdateAuthority", label: "Immutable Metadata", sub: "Cannot change info later" },
                                                { id: "nonTransferable", label: "Soulbound", sub: "Cannot be transferred" },
                                            ].map((item) => (
                                                <div key={item.id} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                                    <Checkbox id={item.id} checked={formData[item.id as keyof typeof formData] as boolean} onCheckedChange={c => handleInputChange(item.id, c)} disabled={isCreating} />
                                                    <div>
                                                        <Label htmlFor={item.id} className="font-medium cursor-pointer text-sm">{item.label}</Label>
                                                        <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* --- FOOTER --- */}
          {errors.form && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{errors.form}</AlertDescription></Alert>}
          
          {signature && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="flex justify-between items-center">
                    <span>Token Created Successfully!</span>
                    <a href={`https://solscan.io/tx/${signature}?cluster=devnet`} target="_blank" className="hover:underline flex items-center gap-1 text-xs">View <ExternalLink className="h-3 w-3" /></a>
                </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isCreating || isGrinding} className="btn-fintech flex-1 h-12 text-base shadow-lg shadow-primary/20">
                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {statusMessage}</> : <><Coins className="mr-2 h-4 w-4" /> Create Token</>}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-8" disabled={isCreating}>Cancel</Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}