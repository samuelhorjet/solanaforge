// FILE: components/mobile-debug.tsx
"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { 
  Keypair, 
  SystemProgram, 
  TransactionMessage, 
  VersionedTransaction 
} from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import bs58 from "bs58";

export function MobileDebug() {
  const { connection } = useConnection();
  // We use sendTransaction for Versioned TXs
  const { publicKey, signMessage, sendTransaction, wallet } = useWallet();
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
      const signature = await signMessage(message);
      addLog("Success! Wallet opened and signed.");
      addLog(`Sig: ${bs58.encode(signature).slice(0, 10)}...`);
    } catch (e: any) {
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- TEST 3: MULTI-SIG (VERSIONED TX FIX) ---
  const testMultiSigTx = async () => {
    if (!publicKey) return;
    setLoading(true);
    addLog("--- TEST 3: Multi-Sig (Versioned TX) ---");
    
    try {
      // 1. Setup Dummy Signer
      const dummyKeypair = Keypair.generate();
      addLog(`Dummy Signer: ${dummyKeypair.publicKey.toBase58().slice(0, 6)}...`);

      // 2. Create Instructions
      // Instruction A: User Pays (User Sig Required)
      const ix1 = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: dummyKeypair.publicKey,
        lamports: 1000, 
      });
      // Instruction B: Dummy Signs (Dummy Sig Required)
      const ix2 = SystemProgram.transfer({
        fromPubkey: dummyKeypair.publicKey,
        toPubkey: publicKey,
        lamports: 0, 
      });

      // 3. Get Blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // 4. Create V0 Message (The Modern Way)
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [ix1, ix2],
      }).compileToV0Message();

      // 5. Create Versioned Transaction
      const transaction = new VersionedTransaction(messageV0);

      // 6. Sign with Dummy Keypair LOCALLY
      transaction.sign([dummyKeypair]);

      addLog("1. Sending Versioned Transaction...");

      // 7. Send via Adapter
      // Note: We do NOT pass 'signers' array here for VersionedTransactions usually.
      // We signed it explicitly above using transaction.sign()
      const sig = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 5
      });

      addLog(`2. Broadcasted! Sig: ${sig.slice(0, 10)}...`);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      addLog("3. Confirmed on-chain.");

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
        <Button onClick={testMultiSigTx} disabled={loading || !publicKey} className="btn-fintech">
          {loading ? <Loader2 className="animate-spin mr-2" /> : "3. Test Multi-Sig (Versioned FIX)"}
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