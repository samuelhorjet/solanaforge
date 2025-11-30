// FILE: hooks/useTokenOperations.ts

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey("AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD");

export function useTokenOperations() {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. UPDATED DERIVATION LOGIC TO MATCH SMART CONTRACT ---
  const deriveLockerPDAs = useCallback((lockId: BN, owner: PublicKey, tokenMint: PublicKey) => {
    
    // A. Derive Lock Record
    // Contract: seeds = [b"lock_record", owner, token_mint, lock_id]
    // Program: DLOOM_LOCKER_PROGRAM_ID (The CPI target owns the account)
    const [lockRecord] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock_record"), 
        owner.toBuffer(), 
        tokenMint.toBuffer(),
        lockId.toArrayLike(Buffer, "le", 8)
      ],
      DLOOM_LOCKER_PROGRAM_ID 
    );

    // B. Derive Vault
    // Contract: seeds = [b"vault", lock_record]
    const [vault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"), 
        lockRecord.toBuffer() // The seed is the Lock Record PDA itself
      ],
      DLOOM_LOCKER_PROGRAM_ID
    );

    return { lockRecord, vault };
  }, []);

  const lockTokens = async (
    mintAddress: string,
    amount: number,
    decimals: number,
    unlockDate: Date,
    tokenProgramId: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);
    
    try {
      const mint = new PublicKey(mintAddress);
      const tokenProgram = new PublicKey(tokenProgramId);
      
      const lockIdBN = new BN(Date.now()); 
      const amountBN = new BN(amount * (10 ** decimals));
      const unlockTimestamp = new BN(Math.floor(unlockDate.getTime() / 1000));

      // FIX: Pass mint to derivation
      const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);
      
      const userTokenAccount = getAssociatedTokenAddressSync(
          mint, 
          publicKey, 
          false, 
          tokenProgram
      );

      const tx = await program.methods
        .proxyLockTokens(amountBN, unlockTimestamp, lockIdBN)
        .accounts({
          owner: publicKey,
          tokenMint: mint,
          lockRecord: lockRecord,
          vault: vault,
          userTokenAccount: userTokenAccount,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgram,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      return { signature: tx, lockId: lockIdBN.toString() };
    } catch (error) {
      console.error("Lock Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawTokens = async (mintAddress: string, lockIdStr: string) => {
     if (!program || !publicKey) throw new Error("Wallet not connected");
     setIsLoading(true);
     try {
        const lockIdBN = new BN(lockIdStr);
        const mint = new PublicKey(mintAddress);
        
        // FIX: Pass mint to derivation logic
        const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);
        
        // Assuming Token-2022 if not stored in DB, otherwise pass it in
        const tokenProgramId = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"); 
        
        const userTokenAccount = getAssociatedTokenAddressSync(
            mint, 
            publicKey, 
            false, 
            tokenProgramId
        ); 

        const tx = await program.methods
            .proxyWithdrawTokens(lockIdBN)
            .accounts({
                owner: publicKey,
                lockRecord,
                vault,
                userTokenAccount, 
                tokenMint: mint,
                tokenProgram: tokenProgramId, 
                lockerProgram: DLOOM_LOCKER_PROGRAM_ID
            })
            .rpc();
        return tx;
     } catch (error) {
        console.error(error);
        throw error;
     } finally {
        setIsLoading(false);
     }
  };

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
      
      const userTokenAccount = getAssociatedTokenAddressSync(
          mint, 
          publicKey, 
          false, 
          tokenProgram
      );

      const tx = await program.methods
        .proxyBurnFromWallet(amountBN)
        .accounts({
            burner: publicKey,
            tokenMint: mint,
            userTokenAccount: userTokenAccount,
            lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
            tokenProgram: tokenProgram
        })
        .rpc();
        
      return tx;
    } catch (error) {
        console.error("Burn Wallet Error:", error);
        throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const burnFromLock = async (mintAddress: string, lockIdStr: string, amount: number, decimals: number) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsLoading(true);

    try {
        const lockIdBN = new BN(lockIdStr);
        const amountBN = new BN(amount * (10 ** decimals));
        const mint = new PublicKey(mintAddress);
        
        // FIX: Pass mint to derivation
        const { lockRecord, vault } = deriveLockerPDAs(lockIdBN, publicKey, mint);

        const tx = await program.methods
            .proxyBurnFromLock(amountBN, lockIdBN)
            .accounts({
                owner: publicKey,
                tokenMint: mint,
                lockRecord: lockRecord,
                vault: vault,
                tokenProgram: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
                lockerProgram: DLOOM_LOCKER_PROGRAM_ID
            })
            .rpc();

        return tx;
    } catch (error) {
        console.error("Burn Lock Error", error);
        throw error;
    } finally {
        setIsLoading(false);
    }
  };

  return {
    lockTokens,
    withdrawTokens,
    burnFromWallet,
    burnFromLock,
    isLoading
  };
}