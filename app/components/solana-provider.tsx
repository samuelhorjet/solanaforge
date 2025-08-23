"use client"

import type React from "react"

import { createContext, useContext, useMemo } from "react"
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"
import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"

// Import the JSON IDL (custom format)
import rawIdl from "../idl/solana_forge.json"

// Wallet adapter UI styles
require("@solana/wallet-adapter-react-ui/styles.css")

// Define context type
type ProgramContextType = {
  program: Program | null
}

// Create context for the Anchor program
const ProgramContext = createContext<ProgramContextType>({ program: null })

// Custom hook to access the program
export const useProgram = () => useContext(ProgramContext)

// --- Normalizer: Convert your JSON into proper Anchor IDL ---
function normalizeIdl(raw: any): anchor.Idl {
  return {
    version: raw.metadata.version,
    name: raw.metadata.name,
    instructions: raw.instructions.map((ix: any) => ({
      name: ix.name,
      docs: ix.docs,
      accounts: ix.accounts.map((acc: any) => ({
        name: acc.name,
        isMut: !!acc.writable,
        isSigner: !!acc.signer,
      })),
      args: ix.args,
    })),
    accounts: raw.accounts.map((acc: any) => ({
      name: acc.name,
      type: {
        kind: "struct",
        fields: [], // expand if you need account fields
      },
    })),
    types: raw.types.map((t: any) => ({
      name: t.name,
      type: {
        kind: "struct",
        fields: t.type.fields.map((f: any) => ({
          name: f.name,
          // ✅ Fix: convert non-standard "pubkey" → Anchor's "publicKey"
          type: f.type === "pubkey" ? "publicKey" : f.type,
        })),
      },
    })),
  }
}

// Anchor setup wrapper
const AnchorSetup = ({ children }: { children: React.ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const wallet = useWallet()

  const provider = useMemo(() => {
    const connection = new anchor.web3.Connection(endpoint)
    return new anchor.AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
    })
  }, [endpoint, wallet])

  const program = useMemo(() => {
    if (wallet.connected && wallet.publicKey && wallet.signTransaction) {
      const programId = new anchor.web3.PublicKey(rawIdl.address)

      // ✅ Normalize JSON to valid Anchor IDL
      const idl = normalizeIdl(rawIdl)

      return new Program(idl, programId, provider)
    }
    return null
  }, [provider, wallet.connected, wallet.publicKey, wallet.signTransaction])

  return <ProgramContext.Provider value={{ program }}>{children}</ProgramContext.Provider>
}

// Main Solana provider
export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [network])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AnchorSetup>{children}</AnchorSetup>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
