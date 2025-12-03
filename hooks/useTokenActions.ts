// FILE: hooks/useTokenActions.ts

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  createMintToInstruction,
  getMint,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export function useTokenActions() {
  const { connection } = useConnection();
  // Destructure signTransaction
  const { publicKey, sendTransaction, signTransaction } = useWallet();
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

        const instructions: TransactionInstruction[] = [];

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
          instructions.push(
            createAssociatedTokenAccountInstruction(
              publicKey,
              destATA,
              dest,
              mint,
              progId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        // 4. Add Transfer Instruction
        const amountBigInt = BigInt(Math.floor(amount * 10 ** decimals));

        instructions.push(
          createTransferInstruction(
            sourceATA,
            destATA,
            publicKey,
            amountBigInt,
            [],
            progId
          )
        );

        // 5. Build Versioned Transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        let signature: string;

        // 6. Send Strategy (Mobile Fix)
        if (signTransaction) {
          const signedTx = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            {
              skipPreflight: true,
              maxRetries: 5,
            }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            maxRetries: 5,
          });
        }

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
    [connection, publicKey, sendTransaction, signTransaction]
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

        const instructions: TransactionInstruction[] = [];

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
          instructions.push(
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
        instructions.push(
          createMintToInstruction(
            mint,
            userATA,
            publicKey,
            amountBigInt,
            [],
            progId
          )
        );

        // 5. Build Versioned Transaction
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        let signature: string;

        // 6. Send Strategy (Mobile Fix)
        if (signTransaction) {
          const signedTx = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(
            signedTx.serialize(),
            {
              skipPreflight: true,
              maxRetries: 5,
            }
          );
        } else {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: true,
            maxRetries: 5,
          });
        }

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
    [connection, publicKey, sendTransaction, signTransaction]
  );

  return { transferToken, mintMoreToken, isProcessing };
}
