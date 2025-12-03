// FILE: components/mobile-debug.tsx
"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import bs58 from "bs58";

export function MobileDebug() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signMessage, wallet } = useWallet();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    console.log(msg);
  };

  // --- TEST 1: SIGN MESSAGE ---
  // Simplest test. If this fails, Deep Linking is totally broken or blocked.
  const testSignMessage = async () => {
    if (!publicKey || !signMessage) return;
    setLoading(true);
    addLog("--- TEST 1: Sign Message ---");
    try {
      const message = new TextEncoder().encode("Verify Mobile Connection");
      addLog("Requesting wallet signature...");
      
      const signature = await signMessage(message);
      
      addLog("Success! Wallet opened and signed.");
      addLog(`Sig: ${bs58.encode(signature).slice(0, 10)}...`);
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- TEST 2: SIMPLE TRANSFER ---
  // Standard 1-signer TX. If this works, the Adapter is set up correctly.
  const testSimpleTx = async () => {
    if (!publicKey) return;
    setLoading(true);
    addLog("--- TEST 2: Simple Transfer (Self) ---");
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Send to self
          lamports: 100, // Tiny amount
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      addLog("Sending TX (Normal)...");
      // Note: We use skipPreflight: true here to be safe on mobile
      const sig = await sendTransaction(tx, connection, { skipPreflight: true });
      
      addLog("TX Broadcasted!");
      addLog(`Sig: ${sig.slice(0, 10)}...`);
      
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      addLog("TX Confirmed on-chain.");
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- TEST 3: MULTI-SIG (THE TOKEN FACTORY SCENARIO) ---
  // This mimics your Create Token flow. It has 2 signers: User + Dummy Keypair.
  // REPLACE ONLY THE testMultiSigTx FUNCTION in components/mobile-debug.tsx

  // --- TEST 3: MULTI-SIG (THE TOKEN FACTORY SCENARIO) ---
  const testMultiSigTx = async () => {
    if (!publicKey) return;
    setLoading(true);
    addLog("--- TEST 3: Multi-Sig (Mint Scenario) ---");
    try {
      // 1. Generate a dummy keypair (acts like your Mint)
      const dummyKeypair = Keypair.generate();
      addLog(`Generated Dummy Signer: ${dummyKeypair.publicKey.toBase58().slice(0, 6)}...`);

      const tx = new Transaction();

      // Instruction A: You pay (Requires Your Signature)
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: dummyKeypair.publicKey,
          lamports: 1000, 
        })
      );

      // Instruction B: Dummy signs (Requires Dummy Signature)
      // We add this solely to force the transaction to REQUIRE the dummy keypair.
      // Since it sends 0 lamports, it's harmless but makes the signature mandatory.
      tx.add(
        SystemProgram.transfer({
          fromPubkey: dummyKeypair.publicKey,
          toPubkey: publicKey,
          lamports: 0, 
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // 3. IMPORTANT: The Adapter logic
      addLog("Calling sendTransaction with extra signers...");
      
      const sig = await sendTransaction(tx, connection, { 
        signers: [dummyKeypair], // Now the wallet will accept this because Instruction B needs it
        skipPreflight: true      
      });

      addLog("TX Broadcasted!");
      addLog(`Sig: ${sig.slice(0, 10)}...`);
      
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      addLog("TX Confirmed.");
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* STATUS CARD */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>Adapter:</span>
              <span className="font-bold text-primary">
                {wallet?.adapter.name || "None"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mobile?:</span>
              <span>
                {/* Heuristic to check if it's likely MWA */}
                {wallet?.adapter.name === "Solana Mobile Wallet Adapter" || 
                 wallet?.adapter.name === "Mobile Wallet Adapter" 
                 ? <CheckCircle className="h-4 w-4 text-green-500 inline" /> 
                 : <span className="text-orange-500">Standard/Ext</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Connected:</span>
              <span>{publicKey ? "Yes" : "No"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <div className="grid gap-3">
        <Button 
          onClick={testSignMessage} 
          disabled={loading || !publicKey}
          variant="outline"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : "1. Test Sign Message"}
        </Button>

        <Button 
          onClick={testSimpleTx} 
          disabled={loading || !publicKey}
          variant="secondary"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : "2. Test Simple TX (1 Signer)"}
        </Button>

        <Button 
          onClick={testMultiSigTx} 
          disabled={loading || !publicKey}
          className="btn-fintech"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : "3. Test Multi-Sig (2 Signers)"}
        </Button>
      </div>

      {/* LOGS CONSOLE */}
      <div className="bg-black/90 text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
        {logs.length === 0 && <span className="text-gray-500">Logs will appear here...</span>}
        {logs.map((log, i) => (
          <div key={i} className="border-b border-gray-800 pb-1 mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}