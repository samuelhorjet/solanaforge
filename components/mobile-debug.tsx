// FILE: components/mobile-debug.tsx
"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import bs58 from "bs58";

export function MobileDebug() {
  const { connection } = useConnection();
  // We grab signTransaction here
  const { publicKey, signMessage, signTransaction, wallet } = useWallet();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    console.log(msg);
  };

  // --- TEST 1: SIGN MESSAGE ---
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

  // --- TEST 2: SIMPLE TRANSFER (MANUAL FLOW) ---
  const testSimpleTx = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    addLog("--- TEST 2: Simple Transfer (Manual Flow) ---");
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 100,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      addLog("1. Opening Wallet to Sign...");
      
      // FORCE WALLET OPEN
      const signedTx = await signTransaction(tx);
      addLog("2. Wallet Signed! Broadcasting...");

      // SEND RAW
      const rawTx = signedTx.serialize();
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: true,
        maxRetries: 5
      });
      
      addLog(`3. Broadcasted! Sig: ${sig.slice(0, 10)}...`);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      addLog("4. Confirmed on-chain.");
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- TEST 3: MULTI-SIG (MANUAL FLOW) ---
  const testMultiSigTx = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    addLog("--- TEST 3: Multi-Sig (Manual Flow) ---");
    try {
      const dummyKeypair = Keypair.generate();
      addLog(`Dummy Signer: ${dummyKeypair.publicKey.toBase58().slice(0, 6)}...`);

      const tx = new Transaction();
      // Instruction A: User Pays
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: dummyKeypair.publicKey,
          lamports: 1000, 
        })
      );
      // Instruction B: Dummy Signs (Forces 2nd signature)
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

      // STEP A: Sign locally with Dummy
      tx.partialSign(dummyKeypair);

      addLog("1. Opening Wallet to Sign...");

      // STEP B: Force Wallet Open for User Signature
      const signedTx = await signTransaction(tx);
      
      addLog("2. Wallet Signed! Re-applying Dummy sig...");

      // STEP C: RE-SIGN with Dummy (Fixes 'Missing Signature' if mobile stripped it)
      // This is safe to do again.
      signedTx.partialSign(dummyKeypair);

      // STEP D: Broadcast
      const rawTx = signedTx.serialize();
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: true,
        maxRetries: 5
      });

      addLog(`3. Broadcasted! Sig: ${sig.slice(0, 10)}...`);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      addLog("4. Confirmed on-chain.");
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
                {wallet?.adapter.name === "Mobile Wallet Adapter" 
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

      <div className="grid gap-3">
        <Button onClick={testSignMessage} disabled={loading || !publicKey} variant="outline">
          {loading ? <Loader2 className="animate-spin mr-2" /> : "1. Test Sign Message"}
        </Button>
        <Button onClick={testSimpleTx} disabled={loading || !publicKey} variant="secondary">
          {loading ? <Loader2 className="animate-spin mr-2" /> : "2. Test Simple TX (Manual)"}
        </Button>
        <Button onClick={testMultiSigTx} disabled={loading || !publicKey} className="btn-fintech">
          {loading ? <Loader2 className="animate-spin mr-2" /> : "3. Test Multi-Sig (Manual)"}
        </Button>
      </div>

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