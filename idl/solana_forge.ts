/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_forge.json`.
 */
export type SolanaForge = {
  "address": "HwB325tYBpE7pAzZshMBCZo3PRCpdwwwLtsRy6t8NjDg",
  "metadata": {
    "name": "solanaForge",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createToken",
      "discriminator": [
        84,
        52,
        204,
        228,
        24,
        140,
        234,
        75
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "userAccount"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "metadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "tokenMetadataProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "account",
              "path": "tokenMetadataProgram"
            }
          }
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "initialSupply",
          "type": "u64"
        },
        {
          "name": "tokenStandard",
          "type": {
            "defined": {
              "name": "tokenStandard"
            }
          }
        },
        {
          "name": "transferFeeBasisPoints",
          "type": "u16"
        },
        {
          "name": "interestRate",
          "type": "i16"
        },
        {
          "name": "isNonTransferable",
          "type": "bool"
        },
        {
          "name": "enablePermanentDelegate",
          "type": "bool"
        },
        {
          "name": "defaultAccountStateFrozen",
          "type": "bool"
        },
        {
          "name": "revokeUpdateAuthority",
          "type": "bool"
        },
        {
          "name": "revokeMintAuthority",
          "type": "bool"
        }
      ]
    },
    {
      "name": "initializeUser",
      "discriminator": [
        111,
        17,
        185,
        250,
        60,
        122,
        38,
        254
      ],
      "accounts": [
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "proxyBurnFromLock",
      "discriminator": [
        216,
        185,
        84,
        141,
        225,
        133,
        54,
        169
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyBurnFromWallet",
      "discriminator": [
        152,
        15,
        120,
        104,
        64,
        120,
        6,
        193
      ],
      "accounts": [
        {
          "name": "burner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyCloseVault",
      "discriminator": [
        192,
        160,
        46,
        41,
        34,
        22,
        22,
        65
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyLockTokens",
      "discriminator": [
        240,
        44,
        217,
        178,
        53,
        54,
        241,
        79
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "unlockTimestamp",
          "type": "i64"
        },
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "proxyWithdrawTokens",
      "discriminator": [
        250,
        32,
        175,
        249,
        161,
        143,
        244,
        170
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockRecord",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "lockerProgram",
          "address": "AVfmdPiqXfc15Pt8PPRXxTP5oMs4D1CdijARiz8mFMFD"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "tokenStandard",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "fungible"
          },
          {
            "name": "fungible2022"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "tokenCount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
