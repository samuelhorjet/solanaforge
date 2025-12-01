// FILE: hooks/useBurner.ts

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey("AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD");

export interface BurnHistoryItem {
    id: string;
    type: "Wallet Burn" | "Vault Burn" | "Batch Burn";
    token: string;
    amount: string;
    date: Date;
    lockId?: string;
}

export interface BurnQueueItem {
    mint: string;
    symbol: string;
    amount: string;
    decimals: number;
    balance: number;
    programId: string;
}

export function useBurner() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program } = useProgram();
  const [isLoading, setIsLoading] = useState(false);
  const [burnHistory, setBurnHistory] = useState<BurnHistoryItem[]>([]);

  // --- 1. SINGLE BURN ---
  const burnFromWallet = async (
    mintAddress: string, 
    amount: number, 
    decimals: number, 
    tokenProgramId: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
      const mint = new PublicKey(mintAddress);
      const tokenProgram = new PublicKey(tokenProgramId);
      const amountBN = new BN(amount * (10 ** decimals));
      
      const userTokenAccount = getAssociatedTokenAddressSync(mint, publicKey, false, tokenProgram);

      // 1. Build Transaction Instruction
      const transaction = await program.methods
        .proxyBurnFromWallet(amountBN)
        .accountsPartial({
            burner: publicKey,
            tokenMint: mint,
            userTokenAccount: userTokenAccount,
            lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
            tokenProgram: tokenProgram
        })
        .transaction();

      // 2. Set Fee Payer & Blockhash
      transaction.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // 3. Send via Wallet Adapter (Handles Mobile Deep Linking)
      const signature = await sendTransaction(transaction, connection);

      // 4. Confirm
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed");
        
      return signature;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. BATCH BURN (Sequential for Safety) ---
  const burnBatch = async (queue: BurnQueueItem[]) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);
    const results = [];

    try {
        for (const item of queue) {
            try {
                // Execute individual burns
                const tx = await burnFromWallet(
                    item.mint,
                    parseFloat(item.amount),
                    item.decimals,
                    item.programId
                );
                
                // Add to history
                setBurnHistory(prev => [{
                    id: tx,
                    type: "Batch Burn",
                    token: item.symbol,
                    amount: item.amount,
                    date: new Date()
                }, ...prev]);

                results.push({ success: true, mint: item.mint, tx });
            } catch (err) {
                console.error(`Failed to burn ${item.symbol}`, err);
                results.push({ success: false, mint: item.mint, error: err });
            }
        }
        return results;
    } finally {
        setIsLoading(false);
    }
  };

  // --- 3. BURN FROM VAULT ---
  const burnFromLock = async (mintAddress: string, lockIdStr: string, amount: number, decimals: number) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
        const lockIdBN = new BN(lockIdStr);
        const amountBN = new BN(amount * (10 ** decimals));
        const mint = new PublicKey(mintAddress);
        
        const [lockRecord] = PublicKey.findProgramAddressSync(
            [Buffer.from("lock_record"), publicKey.toBuffer(), mint.toBuffer(), lockIdBN.toArrayLike(Buffer, "le", 8)],
            DLOOM_LOCKER_PROGRAM_ID 
        );
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), lockRecord.toBuffer()],
            DLOOM_LOCKER_PROGRAM_ID
        );
        
        const transaction = await program.methods
            .proxyBurnFromLock(amountBN, lockIdBN)
            .accountsPartial({
                owner: publicKey,
                tokenMint: mint,
                lockRecord: lockRecord,
                vault: vault,
                tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"), // Or Legacy
                lockerProgram: DLOOM_LOCKER_PROGRAM_ID
            })
            .transaction();

        transaction.feePayer = publicKey;
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, "confirmed");

        return signature;
    } finally {
        setIsLoading(false);
    }
  };

  const addToHistory = (item: BurnHistoryItem) => {
      setBurnHistory(prev => [item, ...prev]);
  };

  return {
    burnFromWallet,
    burnFromLock,
    burnBatch,
    burnHistory,
    addToHistory,
    isLoading
  };
}