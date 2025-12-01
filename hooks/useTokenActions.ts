// FILE: hooks/useTokenActions.ts

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  createMintToInstruction,
  getMint,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// REMOVED: import { triggerMobileWalletRedirect } from "@/lib/wallet-utils";

export function useTokenActions() {
  const { connection } = useConnection();
  // Destructure sendTransaction
  const { publicKey, sendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // --- TRANSFER ---
  const transferToken = useCallback(
    async (
      mintAddress: string,
      destinationAddress: string,
      amount: number,
      decimals: number,
      programId: string
    ) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setIsProcessing(true);

      try {
        const mint = new PublicKey(mintAddress);
        const dest = new PublicKey(destinationAddress);
        const progId = new PublicKey(programId);

        const transaction = new Transaction();

        // 1. Get Source Account
        const sourceATA = getAssociatedTokenAddressSync(
          mint,
          publicKey,
          false,
          progId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // 2. Get Destination Account Address
        const destATA = getAssociatedTokenAddressSync(
          mint,
          dest,
          false,
          progId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // 3. Check if Destination ATA exists
        const destAccountInfo = await connection.getAccountInfo(destATA);

        if (!destAccountInfo) {
          console.log(
            "Destination ATA missing. Adding creation instruction..."
          );
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // Payer
              destATA, // Account to create
              dest, // Owner
              mint, // Mint
              progId, // Program
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // 4. Add Transfer Instruction
        const amountBigInt = BigInt(Math.floor(amount * 10 ** decimals));

        transaction.add(
          createTransferInstruction(
            sourceATA,
            destATA,
            publicKey,
            amountBigInt,
            [],
            progId
          )
        );

        // 5. Setup Transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // REMOVED: triggerMobileWalletRedirect(wallet);

        // 6. Send (Adapter handles Deep Link automatically)
        const signature = await sendTransaction(transaction, connection);

        // 7. Confirm
        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        return signature;
      } catch (error) {
        console.error("Transfer failed", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [connection, publicKey, sendTransaction]
  );

  // --- MINT MORE ---
  const mintMoreToken = useCallback(
    async (
      mintAddress: string,
      amount: number,
      decimals: number,
      programId: string
    ) => {
      if (!publicKey) throw new Error("Wallet not connected");
      setIsProcessing(true);

      try {
        const mint = new PublicKey(mintAddress);
        const progId = new PublicKey(programId);

        // 1. Verify Authority
        const mintInfo = await getMint(connection, mint, undefined, progId);
        if (
          !mintInfo.mintAuthority ||
          !mintInfo.mintAuthority.equals(publicKey)
        ) {
          throw new Error("You are not the mint authority for this token.");
        }

        const transaction = new Transaction();

        // 2. Get User ATA
        const userATA = getAssociatedTokenAddressSync(
          mint,
          publicKey,
          false,
          progId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // 3. Create ATA if needed
        const userAccountInfo = await connection.getAccountInfo(userATA);
        if (!userAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              userATA,
              publicKey,
              mint,
              progId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // 4. Add Mint Instruction
        const amountBigInt = BigInt(Math.floor(amount * 10 ** decimals));
        transaction.add(
          createMintToInstruction(
            mint,
            userATA,
            publicKey,
            amountBigInt,
            [],
            progId
          )
        );

        // 5. Send & Confirm
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // REMOVED: triggerMobileWalletRedirect(wallet);

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        return signature;
      } catch (error) {
        console.error("Minting failed", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [connection, publicKey, sendTransaction]
  );

  return { transferToken, mintMoreToken, isProcessing };
}
