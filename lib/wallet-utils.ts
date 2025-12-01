// FILE: lib/wallet-utils.ts

import { WalletContextState } from "@solana/wallet-adapter-react";

export const isMobileUserAgent = () => {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const triggerMobileWalletRedirect = (wallet: WalletContextState) => {
  if (!isMobileUserAgent()) return;
  
  const walletName = wallet.wallet?.adapter.name.toLowerCase();

  // 1. PHANTOM
  if (walletName?.includes("phantom")) {
    // "ul" stands for Universal Link. This wakes up the app.
    window.location.href = "https://phantom.app/ul/v1/"; 
    return;
  }

  // 2. SOLFLARE
  if (walletName?.includes("solflare")) {
    window.location.href = "https://solflare.com/ul/v1/";
    return;
  }
};