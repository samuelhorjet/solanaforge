// FILE: components/ClientWalletProvider.tsx
"use client";

import { useMemo, ReactNode, useState, useEffect, useCallback } from "react";
import {
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler
} from "@solana-mobile/wallet-adapter-mobile";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import rawIdl from "../idl/solana_forge.json";
import { SolanaForge } from "../idl/solana_forge";
import { ProgramContext } from "./solana-context";

// This component handles the Anchor logic, same as before
const AnchorSetup = ({ children }: { children: ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const { publicKey, sendTransaction, wallet: adapterWallet } = useWallet();

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState<boolean | null>(null);

  const provider = useMemo(() => {
    if (!publicKey || !adapterWallet) return null;
    const connection = new anchor.web3.Connection(endpoint);
    return new anchor.AnchorProvider(connection, adapterWallet.adapter as any, {
      preflightCommitment: "processed",
    });
  }, [endpoint, publicKey, adapterWallet]);

  const program = useMemo(() => {
    if (provider) {
      return new Program<SolanaForge>(rawIdl as any, provider);
    }
    return null;
  }, [provider]);

  // 1. Check if User Account Exists
  useEffect(() => {
    const checkAccount = async () => {
      if (!program || !publicKey) {
        setIsInitialized(null);
        return;
      }
      try {
        const [userAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), publicKey.toBuffer()],
          program.programId
        );
        const userAccount = await program.account.userAccount.fetchNullable(
          userAccountPda
        );
        setIsInitialized(!!userAccount);
      } catch (error) {
        console.error("Error checking account:", error);
        setIsInitialized(false);
      }
    };
    checkAccount();
  }, [program, publicKey]);

  // 2. Check Network Status
  useEffect(() => {
    if (provider && provider.connection) {
      setIsNetworkCorrect(true);
    } else {
      setIsNetworkCorrect(null);
    }
  }, [provider]);

  // 3. Initialize User Account
  const initializeUserAccount = useCallback(async () => {
    if (!program || !publicKey || !provider) {
      throw new Error("Wallet not connected or program not available.");
    }
    // Airdrop check
    const balance = await provider.connection.getBalance(publicKey);
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      try {
        const signature = await provider.connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      } catch (e) {
        console.warn("Airdrop failed", e);
      }
    }

    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );

    const transaction = await program.methods
      .initializeUser()
      .accountsPartial({
        userAccount: userAccountPda,
        payer: publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction.feePayer = publicKey;
    const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const signature = await sendTransaction(transaction, provider.connection);

    await provider.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, "confirmed");

    setIsInitialized(true);
  }, [program, provider, publicKey, sendTransaction]);

  return (
    <ProgramContext.Provider
      value={{
        program,
        provider,
        isInitialized,
        isNetworkCorrect,
        initializeUserAccount,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

// This component handles the Wallet Configuration
export default function ClientWalletProvider({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [
      // 1. Mobile Wallet Adapter
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "SolanaForge",
          uri: "https://solana-forge.netlify.app",
          icon: "https://solanaforge.app/icon.png",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
        cluster: network,
      }),
      // 2. Standard Adapters
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // 3. WalletConnect
      new WalletConnectWalletAdapter({
        network: network,
        options: {
          projectId:
            process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
            "YOUR_PROJECT_ID_HERE",
          metadata: {
            name: "SolanaForge",
            description: "Professional Token Management DApp",
            url: "https://solana-forge.netlify.app/",
            icons: ["https://solanaforge.app/icon.png"],
          },
        },
      }),
    ],
    [network]
  );

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <AnchorSetup>{children}</AnchorSetup>
      </WalletModalProvider>
    </WalletProvider>
  );
}