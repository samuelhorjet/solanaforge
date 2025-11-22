// FILE: hooks/useTokenFactory.ts
import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/components/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Token } from "@/types/token";

export type TokenStandard = "token" | "token-2022";

export const useTokenFactory = (onTokenCreated: (token: Token) => void) => {
  const { publicKey } = useWallet();
  const { program } = useProgram();

  // --- STATE ---
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>("token-2022");
  
  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    decimals: "9",
    initialSupply: "",
    transferFee: "0",
    interestRate: "0",
    nonTransferable: false,
    enablePermanentDelegate: false,
    defaultAccountStateFrozen: false,
    revokeUpdateAuthority: false,
  });

  // Vanity State
  const [vanityPrefix, setVanityPrefix] = useState("");
  const [vanityResults, setVanityResults] = useState<Keypair[]>([]);
  const [selectedVanityKey, setSelectedVanityKey] = useState<string | null>(null);
  const [isGrinding, setIsGrinding] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, speed: 0 });
  const grindingRef = useRef(false);

  // Image State
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [tokenImagePreview, setTokenImagePreview] = useState<string | null>(null);

  // Process State
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string | null>(null);

  // --- LOGIC: Vanity Generator ---
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
    setErrors(prev => ({ ...prev, vanity: "" }));

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
                setVanityResults(prev => [...prev, kp]);
            }
        }
        if (Date.now() - lastUpdate > 500) {
            const elapsed = (Date.now() - startTime) / 1000;
            setStats({ scanned: count, speed: Math.round(count / elapsed) });
            lastUpdate = Date.now();
        }
        if (count > 500000) { // Safety stop
             stopGrinding();
             return;
        }
        requestAnimationFrame(findMatch);
    };
    findMatch();
  };

  useEffect(() => {
    if (vanityResults.length >= 10 && isGrinding) stopGrinding();
  }, [vanityResults, isGrinding]);


  // --- LOGIC: Inputs & Validation ---
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTokenImage(file);
      setTokenImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, tokenImage: "" }));
    }
  };

  const uploadToIpfs = async (file: File | Blob, isJson = false): Promise<string> => {
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
    if (Number(formData.decimals) < 0 || Number(formData.decimals) > 18) errs.decimals = "Invalid decimals.";
    if (Number(formData.initialSupply) <= 0) errs.initialSupply = "Invalid supply.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- LOGIC: Submit ---
  const createToken = async () => {
    if (!validate() || !publicKey || !program) return;

    setIsCreating(true);
    setSignature(null);
    setErrors({});
    
    try {
      setStatusMessage("Uploading IPFS...");
      const imgUrl = await uploadToIpfs(tokenImage!);
      const metaUrl = await uploadToIpfs(new Blob([JSON.stringify({
        name: formData.name, symbol: formData.symbol, image: imgUrl, description: "Created on SolanaForge"
      })], { type: "application/json" }), true);

      setStatusMessage("Preparing transaction...");
      
      // Select Keypair
      let mintKeypair = Keypair.generate();
      if (selectedVanityKey) {
        const found = vanityResults.find(k => k.publicKey.toBase58() === selectedVanityKey);
        if (found) mintKeypair = found;
      }

      const decimals = Number(formData.decimals);
      const supply = new anchor.BN(formData.initialSupply).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));
      const progId = tokenStandard === "token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const metaProgId = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID.toString());

      const [userPda] = PublicKey.findProgramAddressSync([Buffer.from("user"), publicKey.toBuffer()], program.programId);
      const [metaPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), metaProgId.toBuffer(), mintKeypair.publicKey.toBuffer()], metaProgId);
      const tokenAccount = getAssociatedTokenAddressSync(mintKeypair.publicKey, publicKey, false, progId);

      const fees = formData.transferFee ? Math.floor(Number(formData.transferFee) * 100) : 0;
      const interest = formData.interestRate ? Math.floor(Number(formData.interestRate)) : 0;

      setStatusMessage("Sign transaction...");

      const tx = await program.methods.createToken(
        formData.name, formData.symbol, metaUrl, decimals, supply,
        tokenStandard === "token-2022" ? { fungible2022: {} } : { fungible: {} } as any,
        fees, interest, formData.nonTransferable, formData.enablePermanentDelegate,
        formData.defaultAccountStateFrozen, formData.revokeUpdateAuthority
      ).accountsPartial({
        userAccount: userPda, authority: publicKey, mint: mintKeypair.publicKey,
        tokenAccount, metadata: metaPda, tokenMetadataProgram: metaProgId,
        systemProgram: SystemProgram.programId, tokenProgram: progId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, rent: SYSVAR_RENT_PUBKEY,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY
      }).signers([mintKeypair]).rpc();

      setSignature(tx);
      setStatusMessage("Success!");
      onTokenCreated({
        id: mintKeypair.publicKey.toBase58(),
        name: formData.name, symbol: formData.symbol, decimals, supply: Number(formData.initialSupply),
        balance: Number(formData.initialSupply), mintAddress: mintKeypair.publicKey.toBase58(),
        createdAt: new Date().toISOString(), status: "active"
      });
    } catch (e: any) {
      console.error(e);
      setErrors({ form: e.message || "Failed" });
    } finally {
      setIsCreating(false);
    }
  };

  return {
    formData, handleInputChange, tokenStandard, setTokenStandard,
    vanityPrefix, setVanityPrefix, vanityResults, isGrinding, grindVanityAddress, stopGrinding, stats,
    selectedVanityKey, setSelectedVanityKey,
    tokenImage, tokenImagePreview, handleImageSelect,
    isCreating, statusMessage, errors, signature, createToken
  };
};