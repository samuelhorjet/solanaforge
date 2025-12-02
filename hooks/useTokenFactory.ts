// FILE: hooks/useTokenFactory.ts

import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Token } from "@/types/token";

export type TokenStandard = "token" | "token-2022";
export type AddressMethod = "random" | "custom";

const ensureProtocol = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

export const useTokenFactory = (onTokenCreated: (token: Token) => void) => {
  // We need signTransaction to manually handle the flow
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

  // --- WIZARD STATE ---
  const [step, setStep] = useState(1);
  const [addressMethod, setAddressMethod] = useState<AddressMethod>("random");

  // --- TOKEN CONFIG STATE ---
  const [tokenStandard, setTokenStandard] =
    useState<TokenStandard>("token-2022");
  const [uploadedKeypair, setUploadedKeypair] = useState<Keypair | null>(null);
  const [keypairFileError, setKeypairFileError] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: "9",
    initialSupply: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    transferFee: "0",
    interestRate: "0",
    nonTransferable: false,
    enablePermanentDelegate: false,
    defaultAccountStateFrozen: false,
    revokeUpdateAuthority: false,
    isMintable: true,
  });

  // Vanity Grinder State
  const [vanityPrefix, setVanityPrefix] = useState("");
  const [vanityResults, setVanityResults] = useState<Keypair[]>([]);
  const [selectedVanityKey, setSelectedVanityKey] = useState<string | null>(
    null
  );
  const [isGrinding, setIsGrinding] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, speed: 0 });
  const grindingRef = useRef(false);

  // Image State
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [tokenImagePreview, setTokenImagePreview] = useState<string | null>(
    null
  );

  // Transaction State
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);

  // --- HELPERS (unchanged) ---
  const handleKeypairUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeypairFileError(null);
    setUploadedKeypair(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed) || parsed.length !== 64) {
          setKeypairFileError(
            "Invalid JSON format. Must be a [64 byte] array."
          );
          return;
        }
        const kp = Keypair.fromSecretKey(new Uint8Array(parsed));
        const accountInfo = await connection.getAccountInfo(kp.publicKey);
        if (accountInfo) {
          setKeypairFileError(
            `Address ${kp.publicKey
              .toBase58()
              .slice(0, 6)}... is already active on chain. Use a fresh keypair.`
          );
          return;
        }
        setUploadedKeypair(kp);
        setSelectedVanityKey(null);
        setVanityResults([]);
      } catch (err) {
        setKeypairFileError("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const stopGrinding = () => {
    grindingRef.current = false;
    setIsGrinding(false);
  };

  const grindVanityAddress = (continueSearch = false) => {
    if (!vanityPrefix) return;
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(vanityPrefix)) {
      setErrors({ vanity: "Invalid characters. No 0, O, I, l." });
      return;
    }
    grindingRef.current = true;
    setIsGrinding(true);
    if (!continueSearch) {
      setVanityResults([]);
      setSelectedVanityKey(null);
      setStats({ scanned: 0, speed: 0 });
    }
    setErrors((prev) => ({ ...prev, vanity: "" }));
    let count = 0;
    let lastUpdate = Date.now();
    let startTime = Date.now();
    const findMatch = () => {
      if (!grindingRef.current) return;
      const burstStart = Date.now();
      while (Date.now() - burstStart < 20) {
        const kp = Keypair.generate();
        count++;
        if (kp.publicKey.toBase58().startsWith(vanityPrefix)) {
          setVanityResults((prev) => [...prev, kp]);
        }
      }
      if (Date.now() - lastUpdate > 500) {
        const elapsed = (Date.now() - startTime) / 1000;
        setStats({ scanned: count, speed: Math.round(count / elapsed) });
        lastUpdate = Date.now();
      }
      if (count > 500000) {
        stopGrinding();
        return;
      }
      requestAnimationFrame(findMatch);
    };
    findMatch();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTokenImage(file);
      setTokenImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, tokenImage: "" }));
    }
  };

  const uploadToIpfs = async (
    file: File | Blob,
    isJson = false
  ): Promise<string> => {
    const data = new FormData();
    data.append("file", file, isJson ? "metadata.json" : undefined);
    const res = await fetch("/api/upload", { method: "POST", body: data });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()).url;
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Name required.";
    if (!formData.symbol.trim()) errs.symbol = "Symbol required.";
    if (!tokenImage) errs.tokenImage = "Image required.";
    if (Number(formData.decimals) < 0 || Number(formData.decimals) > 18)
      errs.decimals = "Invalid decimals.";
    if (Number(formData.initialSupply) <= 0)
      errs.initialSupply = "Invalid supply.";

    if (
      formData.twitter &&
      !/^(https?:\/\/)?(www\.)?(twitter|x)\.com\//.test(formData.twitter)
    )
      errs.twitter = "Invalid Twitter URL";
    if (
      formData.telegram &&
      !/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//.test(formData.telegram)
    )
      errs.telegram = "Invalid Telegram URL";

    if (addressMethod === "custom" && !uploadedKeypair && !selectedVanityKey) {
      errs.address = "You selected Custom Address but haven't provided one.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createToken = async () => {
    console.log("Starting createToken...");
    if (!publicKey || !program) {
      console.error("Wallet or Program not ready");
      setErrors({ form: "Wallet not connected" });
      return;
    }
    if (!validate()) {
      console.error("Validation failed", errors);
      return;
    }

    setIsCreating(true);
    setSignature(null);
    setErrors({});

    try {
      setStatusMessage("Uploading Metadata...");
      const imgUrl = await uploadToIpfs(tokenImage!);

      const cleanWebsite = ensureProtocol(formData.website);
      const cleanTwitter = ensureProtocol(formData.twitter);
      const cleanTelegram = ensureProtocol(formData.telegram);

      const metadataPayload = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        image: imgUrl,
        external_url: cleanWebsite,
        attributes: [] as any[],
      };

      if (cleanTwitter)
        metadataPayload.attributes.push({
          trait_type: "Twitter",
          value: cleanTwitter,
        });
      if (cleanTelegram)
        metadataPayload.attributes.push({
          trait_type: "Telegram",
          value: cleanTelegram,
        });

      const metaUrl = await uploadToIpfs(
        new Blob([JSON.stringify(metadataPayload)], {
          type: "application/json",
        }),
        true
      );

      setStatusMessage("Building Transaction...");

      let mintKeypair: Keypair;
      if (addressMethod === "custom") {
        if (uploadedKeypair) {
          mintKeypair = uploadedKeypair;
        } else if (selectedVanityKey) {
          const found = vanityResults.find(
            (k) => k.publicKey.toBase58() === selectedVanityKey
          );
          if (found) mintKeypair = found;
          else mintKeypair = Keypair.generate();
        } else {
          mintKeypair = Keypair.generate();
        }
      } else {
        mintKeypair = Keypair.generate();
      }

      console.log("Mint Keypair:", mintKeypair.publicKey.toBase58());

      const decimals = Number(formData.decimals);
      const supply = new anchor.BN(formData.initialSupply).mul(
        new anchor.BN(10).pow(new anchor.BN(decimals))
      );
      const progId =
        tokenStandard === "token-2022"
          ? TOKEN_2022_PROGRAM_ID
          : TOKEN_PROGRAM_ID;
      const metaProgId = new PublicKey(
        MPL_TOKEN_METADATA_PROGRAM_ID.toString()
      );

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId
      );
      const [metaPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          metaProgId.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        metaProgId
      );
      const tokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        publicKey,
        false,
        progId
      );

      const fees = formData.transferFee
        ? Math.floor(Number(formData.transferFee) * 100)
        : 0;
      const interest = formData.interestRate
        ? Math.floor(Number(formData.interestRate))
        : 0;

      // --- BUILD TRANSACTION ---
      const transaction = await program.methods
        .createToken(
          formData.name,
          formData.symbol,
          metaUrl,
          decimals,
          supply,
          tokenStandard === "token-2022"
            ? { fungible2022: {} }
            : ({ fungible: {} } as any),
          fees,
          interest,
          formData.nonTransferable,
          formData.enablePermanentDelegate,
          formData.defaultAccountStateFrozen,
          formData.revokeUpdateAuthority,
          !formData.isMintable
        )
        .accountsPartial({
          userAccount: userPda,
          authority: publicKey,
          mint: mintKeypair.publicKey,
          tokenAccount,
          metadata: metaPda,
          tokenMetadataProgram: metaProgId,
          systemProgram: SystemProgram.programId,
          tokenProgram: progId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .transaction();

      // --- MANUAL TRANSACTION FLOW (Fixes Mobile) ---
      setStatusMessage("Preparing to sign...");

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("1. Signing with Mint Keypair (Local)...");
      transaction.partialSign(mintKeypair);

      let txSignature: string;

      // Method A: Use signTransaction (Best for Mobile Wallets)
      if (signTransaction) {
        console.log("2. Requesting Wallet Signature (signTransaction)...");
        setStatusMessage("Please check your wallet...");

        // This triggers the Mobile App to open
        const signedTx = await signTransaction(transaction);

        console.log("3. Wallet Signed. Serializing...");
        const rawTx = signedTx.serialize();

        console.log("4. Broadcasting to Network...");
        setStatusMessage("Sending to Solana...");
        txSignature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: true, // Safety check
          maxRetries: 5,
        });
      } else {
        // Method B: Fallback (Desktop/Extension behavior)
        console.log("2. Fallback: Using sendTransaction helper...");
        // We pass the signer explicitly here for desktop extensions
        txSignature = await sendTransaction(transaction, connection, {
          signers: [mintKeypair],
          skipPreflight: true,
        });
      }

      console.log("Tx Sent:", txSignature);
      setStatusMessage("Confirming...");

      await connection.confirmTransaction(
        {
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      setSignature(txSignature);
      setStatusMessage("Success!");

      // ... Update UI state ...
      onTokenCreated({
        id: mintKeypair.publicKey.toBase58(),
        mintAddress: mintKeypair.publicKey.toBase58(),
        name: formData.name,
        symbol: formData.symbol,
        decimals,
        supply: Number(formData.initialSupply),
        balance: Number(formData.initialSupply),
        createdAt: new Date().toISOString(),
        status: "active",
        image: imgUrl,
        isMintable: formData.isMintable,
        programId: progId.toBase58(),
        authority: publicKey.toBase58(),
        description: formData.description,
        website: cleanWebsite,
        twitter: cleanTwitter,
        telegram: cleanTelegram,
      });
    } catch (e: any) {
      console.error("Token Creation Error:", e);
      // Nice error message handling
      let msg = e.message || "Transaction failed";
      if (msg.includes("User rejected")) msg = "Request rejected by wallet";
      setErrors({ form: msg });
    } finally {
      setIsCreating(false);
      setUploadedKeypair(null);
    }
  };

  return {
    step,
    setStep,
    addressMethod,
    setAddressMethod,
    formData,
    handleInputChange,
    tokenStandard,
    setTokenStandard,
    handleKeypairUpload,
    uploadedKeypair,
    keypairFileError,
    setUploadedKeypair,
    vanityPrefix,
    setVanityPrefix,
    vanityResults,
    isGrinding,
    grindVanityAddress,
    stopGrinding,
    stats,
    selectedVanityKey,
    setSelectedVanityKey,
    tokenImage,
    tokenImagePreview,
    handleImageSelect,
    isCreating,
    statusMessage,
    errors,
    setErrors,
    signature,
    createToken,
  };
};
