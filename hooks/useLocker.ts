// FILE: hooks/useLocker.ts

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useProgram } from "@/components/solana-provider";
import { fetchTokenMetadata } from "@/hooks/useTokenMetadata";

const DLOOM_LOCKER_PROGRAM_ID = new PublicKey(
  "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
);

export interface LockRecord {
  pubkey: string;
  lockId: string;
  amount: number;
  tokenMint: string;
  owner: string;
  unlockDate: Date;
  isUnlocked: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  decimals: number;
  image?: string;
}

export function useLocker() {
  const { connection } = useConnection();
  // Destructure signTransaction
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { program } = useProgram();

  const [locks, setLocks] = useState<LockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HELPER: Decode Lock Record (Unchanged) ---
  const decodeLockRecord = (buffer: Buffer, pubkey: PublicKey) => {
    try {
      let offset = 8;
      offset += 1;
      const owner = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const tokenMint = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const vault = new PublicKey(buffer.subarray(offset, offset + 32));
      offset += 32;
      const amount = buffer.readBigUInt64LE(offset);
      offset += 8;
      const unlockTimestamp = buffer.readBigInt64LE(offset);
      offset += 8;
      const lockId = buffer.readBigUInt64LE(offset);

      return {
        owner,
        tokenMint,
        lockId: lockId.toString(),
        amount: Number(amount),
        unlockTimestamp: Number(unlockTimestamp),
      };
    } catch (e) {
      console.error("Failed to decode account", pubkey.toBase58(), e);
      return null;
    }
  };

  // --- FETCH LOCKS (Unchanged) ---
  const fetchUserLocks = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    try {
      const accounts = await connection.getProgramAccounts(
        DLOOM_LOCKER_PROGRAM_ID,
        {
          filters: [
            {
              memcmp: {
                offset: 9,
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      );
      const formattedLocks: LockRecord[] = [];
      for (const acc of accounts) {
        const decoded = decodeLockRecord(acc.account.data, acc.pubkey);
        if (!decoded) continue;
        const mint = decoded.tokenMint.toBase58();
        const meta = await fetchTokenMetadata(connection, mint);
        let imageUrl = "";
        if (meta.uri) {
          try {
            const cleanUri = meta.uri.replace(/\0/g, "").trim();
            if (cleanUri) {
              const response = await fetch(cleanUri);
              if (response.ok) {
                const json = await response.json();
                imageUrl = json.image || "";
              }
            }
          } catch (e) {
            console.warn("Failed to fetch JSON for lock:", mint);
          }
        }
        let decimals = 9;
        try {
          const mintInfo = await connection.getParsedAccountInfo(
            decoded.tokenMint
          );
          if ((mintInfo.value?.data as any)?.parsed) {
            decimals = (mintInfo.value?.data as any).parsed.info.decimals;
          }
        } catch (e) {
          console.log("decimals fetch failed", e);
        }

        const amountUi = decoded.amount / 10 ** decimals;
        const unlockTime = new Date(decoded.unlockTimestamp * 1000);

        formattedLocks.push({
          pubkey: acc.pubkey.toBase58(),
          lockId: decoded.lockId,
          amount: amountUi,
          tokenMint: mint,
          owner: decoded.owner.toBase58(),
          unlockDate: unlockTime,
          isUnlocked: Date.now() > unlockTime.getTime(),
          tokenName: meta.name,
          tokenSymbol: meta.symbol,
          decimals,
          image: imageUrl,
        });
      }
      setLocks(
        formattedLocks.sort(
          (a, b) => a.unlockDate.getTime() - b.unlockDate.getTime()
        )
      );
    } catch (error) {
      console.error("Error fetching locks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection]);

  // --- 3. CREATE LOCK (Fixed for Mobile) ---
  const createLock = async (
    mintAddress: string,
    amount: string,
    duration: string,
    timeUnit: "minutes" | "hours" | "days" | "years",
    decimals: number,
    tokenProgramIdString: string
  ) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsProcessing(true);

    try {
      const durVal = parseFloat(duration);
      let multiplier = 1000 * 60;
      if (timeUnit === "minutes") multiplier = 1000 * 60;
      if (timeUnit === "hours") multiplier = 1000 * 60 * 60;
      if (timeUnit === "days") multiplier = 1000 * 60 * 60 * 24;
      if (timeUnit === "years") multiplier = 1000 * 60 * 60 * 24 * 365;

      const unlockDate = new Date(Date.now() + durVal * multiplier);
      const unlockTimestamp = new BN(Math.floor(unlockDate.getTime() / 1000));

      const mint = new PublicKey(mintAddress);
      const tokenProgramId = new PublicKey(tokenProgramIdString);
      const lockIdBN = new BN(Date.now());
      const amountBN = new BN(Math.floor(parseFloat(amount) * 10 ** decimals));

      const [lockRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lock_record"),
          publicKey.toBuffer(),
          mint.toBuffer(),
          lockIdBN.toArrayLike(Buffer, "le", 8),
        ],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), lockRecord.toBuffer()],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgramId
      );

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyLockTokens(amountBN, unlockTimestamp, lockIdBN)
        .accountsPartial({
          owner: publicKey,
          tokenMint: mint,
          lockRecord: lockRecord,
          vault: vault,
          userTokenAccount: userTokenAccount,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgram: tokenProgramId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      let tx: string;

      // 3. Send (Mobile Fix)
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 5,
        });
      } else {
        tx = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      await connection.confirmTransaction(
        { signature: tx, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setTimeout(() => fetchUserLocks(), 2000);
      return tx;
    } catch (error) {
      console.error("Lock Creation Error:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 4. WITHDRAW (Fixed for Mobile) ---
  const withdrawTokens = async (lock: LockRecord) => {
    if (!program || !publicKey) throw new Error("Wallet not connected");
    setIsProcessing(true);
    try {
      const lockIdBN = new BN(lock.lockId);
      const mint = new PublicKey(lock.tokenMint);

      const [lockRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lock_record"),
          publicKey.toBuffer(),
          mint.toBuffer(),
          lockIdBN.toArrayLike(Buffer, "le", 8),
        ],
        DLOOM_LOCKER_PROGRAM_ID
      );
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), lockRecord.toBuffer()],
        DLOOM_LOCKER_PROGRAM_ID
      );

      const mintInfo = await connection.getAccountInfo(mint);
      const tokenProgramId = mintInfo ? mintInfo.owner : TOKEN_PROGRAM_ID;

      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        tokenProgramId
      );

      // 1. Get Instruction
      const instruction = await program.methods
        .proxyWithdrawTokens(lockIdBN)
        .accountsPartial({
          owner: publicKey,
          lockRecord,
          vault,
          userTokenAccount,
          tokenMint: mint,
          tokenProgram: tokenProgramId,
          lockerProgram: DLOOM_LOCKER_PROGRAM_ID,
        })
        .instruction();

      // 2. Build V0 Transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      let tx: string;

      // 3. Send (Mobile Fix)
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        tx = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 5,
        });
      } else {
        tx = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      await connection.confirmTransaction(
        { signature: tx, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      await fetchUserLocks();
      return tx;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const getWalletBalance = async (
    mintAddress: string,
    programIdString: string
  ) => {
    if (!publicKey) return 0;
    try {
      const progId = new PublicKey(programIdString);
      const ata = getAssociatedTokenAddressSync(
        new PublicKey(mintAddress),
        publicKey,
        false,
        progId
      );
      const info = await connection.getTokenAccountBalance(ata);
      return info.value.uiAmount || 0;
    } catch (e) {
      return 0;
    }
  };

  return {
    locks,
    fetchUserLocks,
    createLock,
    withdrawTokens,
    getWalletBalance,
    isLoading,
    isProcessing,
  };
}
