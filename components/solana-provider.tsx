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
  const wallet = useWallet();

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isNetworkCorrect, setIsNetworkCorrect] = useState<boolean | null>(
    null
  );

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;
    const connection = new anchor.web3.Connection(endpoint);
    return new anchor.AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
    });
  }, [endpoint, wallet]);

  const program = useMemo(() => {
    if (provider) {
      return new Program<SolanaForge>(rawIdl as any, provider);
    }
    return null;
  }, [provider]);

  useEffect(() => {
    const checkAccount = async () => {
      if (!program || !wallet.publicKey) {
        setIsInitialized(null);
        return;
      }

      setIsInitialized(null);
      try {
        const [userAccountPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), wallet.publicKey.toBuffer()],
          program.programId
        );
        const userAccount = await program.account.userAccount.fetch(
          userAccountPda
        );

        if (userAccount && typeof userAccount.tokenCount !== "undefined") {
          setIsInitialized(true);
        } else {
          setIsInitialized(false);
        }
      } catch (error) {
        setIsInitialized(false);
      }
    };
    checkAccount();
  }, [program, wallet.publicKey]);

  // --- START OF THE FIX ---
  // This hook now correctly determines the network status.
  useEffect(() => {
    // If the provider is available, it means we are connected to the endpoint
    // which is already configured for Devnet. We can safely assume the network is correct.
    if (provider && provider.connection) {
      setIsNetworkCorrect(true);
    } else {
      // If there's no provider, we are in the initial loading/connecting state.
      setIsNetworkCorrect(null);
    }
  }, [provider]);
  // --- END OF THE FIX ---

  const initializeUserAccount = useCallback(async () => {
    if (!program || !wallet.publicKey || !provider) {
      throw new Error("Wallet not connected or program not available.");
    }

    const balance = await provider.connection.getBalance(wallet.publicKey);
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      const airdropSignature = await provider.connection.requestAirdrop(
        wallet.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      const { blockhash, lastValidBlockHeight } =
        await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature: airdropSignature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
    }

    const [userAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      const txSignature = await program.methods
        .initializeUser()
        .accounts({
          userAccount: userAccountPda,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await provider.connection.confirmTransaction(txSignature, "confirmed");
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize user account:", error);
      throw error;
    }
  }, [program, provider, wallet.publicKey]);

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