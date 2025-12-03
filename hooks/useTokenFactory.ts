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
  TransactionMessage,
  VersionedTransaction,
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
  // Destructure signTransaction as well
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

  // --- HELPERS (Unchanged logic) ---
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
    if (formData.twitter) {
      const twitterRegex =
        /^(https?:\/\/)?(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]{1,15}\/?$/;
      if (!twitterRegex.test(formData.twitter)) {
        errs.twitter = "Invalid Twitter URL (e.g. https://x.com/username)";
      }
    }
    if (formData.telegram) {
      const telegramRegex =
        /^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}\/?$/;
      if (!telegramRegex.test(formData.telegram)) {
        errs.telegram = "Invalid Telegram URL (e.g. https://t.me/username)";
      }
    }
    if (formData.website) {
      const urlRegex =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(formData.website)) {
        errs.website = "Invalid Website URL";
      }
    }
    if (addressMethod === "custom" && !uploadedKeypair && !selectedVanityKey) {
      errs.address = "You selected Custom Address but haven't provided one.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- CORE: CREATE TOKEN (Versioned + Mobile Fix) ---
  const createToken = async () => {
    if (!validate() || !publicKey || !program) return;

    setIsCreating(true);
    setSignature(null);
    setErrors({});

    try {
      setStatusMessage("Uploading Image to IPFS...");
      const imgUrl = await uploadToIpfs(tokenImage!);

      setStatusMessage("Uploading Metadata...");
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

      setStatusMessage("Please sign transaction in your wallet...");

      // 1. Get Instruction
      const instruction = await program.methods
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

      // 3. Sign with Mint Keypair (Always required for creation)
      transaction.sign([mintKeypair]);

      let txSignature: string;

      // 4. Send Strategy (Mobile Fix)
      // If the wallet supports direct signing (Phantom, Solflare, Mobile Adapter), use it.
      // This bypasses the "signature must be base58" error by handling serialization manually.
      if (signTransaction) {
        const signedTx = await signTransaction(transaction);
        // Send RAW transaction
        txSignature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: true, // IMPORTANT for mobile
            maxRetries: 5,
          }
        );
      } else {
        // Fallback for wallets without signTransaction (unlikely on modern mobile)
        txSignature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });
      }

      // 5. Confirm
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
      console.error(e);
      // Clean up error message for mobile
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
