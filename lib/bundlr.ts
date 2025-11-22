// FILE: lib/bundlr.ts

import { WebBundlr } from "@bundlr-network/client";
import { WalletContextState } from "@solana/wallet-adapter-react";

// The network you want to connect to
const providerUrl = "https://api.devnet.solana.com";

/**
 * Creates a new Bundlr instance connected to the user's wallet.
 * @param wallet The wallet adapter from useWallet()
 * @returns A new Bundlr instance
 */
export const getBundlr = async (wallet: WalletContextState) => {
  
  // WebBundlr uses the wallet's provider to sign transactions
  // inside the browser.
  const bundlr = new WebBundlr(
    "https://devnet.bundlr.network", // Use "https://node1.bundlr.network" for mainnet
    "solana", 
    wallet, 
    {
      providerUrl,
    }
  );

  await bundlr.ready();
  console.log("Bundlr connected");

  return bundlr;
};