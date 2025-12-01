"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import rawIdl from "../idl/solana_forge.json";
import { SolanaForge } from "../idl/solana_forge";

interface ProgramContextState {
  program: Program<SolanaForge> | null;
  provider: anchor.AnchorProvider | null;
  isInitialized: boolean | null;
  isNetworkCorrect: boolean | null;
  initializeUserAccount: () => Promise<void>;
}

const ProgramContext = createContext<ProgramContextState>({
  program: null,
  provider: null,
  isInitialized: null,
  isNetworkCorrect: null,
  initializeUserAccount: async () => {},
});

export const useProgram = () => useContext(ProgramContext);

const AnchorSetup = ({ children }: { children: ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Destructure sendTransaction here
  const { publicKey, sendTransaction, wallet: adapterWallet } = useWallet();

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState<boolean | null>(null);

  const provider = useMemo(() => {
    if (!publicKey || !adapterWallet) return null;
    const connection = new anchor.web3.Connection(endpoint);
    // We cast adapterWallet to any because Anchor types are slightly stricter than Adapter types
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

      // Don't reset to null here to avoid flickering, only set if we have a result
      try {
        const [userAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), publicKey.toBuffer()],
          program.programId
        );
        // Using fetchNullable is safer if the account might not exist
        const userAccount = await program.account.userAccount.fetchNullable(
          userAccountPda
        );

        if (userAccount) {
          setIsInitialized(true);
        } else {
          setIsInitialized(false);
        }
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

  // 3. Initialize User Account (FIXED FOR MOBILE)
  const initializeUserAccount = useCallback(async () => {
    if (!program || !publicKey || !provider) {
      throw new Error("Wallet not connected or program not available.");
    }

    // A. Check Balance & Airdrop if needed (Devnet only)
    const balance = await provider.connection.getBalance(publicKey);
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      try {
        const airdropSignature = await provider.connection.requestAirdrop(
          publicKey,
          1 * LAMPORTS_PER_SOL
        );
        const { blockhash, lastValidBlockHeight } =
          await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction(
          { signature: airdropSignature, blockhash, lastValidBlockHeight },
          "confirmed"
        );
      } catch (e) {
        console.warn("Airdrop failed, continuing anyway...", e);
      }
    }

    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), publicKey.toBuffer()],
      program.programId
    );

    try {
      // --- THE FIX ---
      // Instead of .rpc(), we build a transaction and use sendTransaction
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

      // This triggers the Mobile Wallet Adapter correctly
      const signature = await sendTransaction(transaction, provider.connection);

      await provider.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed");

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize user account:", error);
      throw error;
    }
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

export function SolanaProvider({ children }: { children: ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AnchorSetup>{children}</AnchorSetup>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}