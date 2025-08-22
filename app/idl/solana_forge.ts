/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_forge.json`.
 */
export type SolanaForge = {
  "address": "7hC82veS135Xs4QN9MJW35BvjisnpKfoEs7aEYC23MHp",
  "metadata": {
    "name": "solanaForge",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createToken",
      "docs": [
        "Creates a new SPL Token."
      ],
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
          "name": "mint",
          "docs": [
            "The new token mint account."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAccount",
          "docs": [
            "The user's token account for the new mint.",
            "FIX: Use 'init_if_needed' for Associated Token Accounts.",
            "This tells Anchor to create the account only if it doesn't exist."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "payer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payer",
          "docs": [
            "The user who is creating the token and paying for the accounts."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "The Solana Token Program (now an Interface)."
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "The Associated Token Account program."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "The Solana System Program."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "initialSupply",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeUser",
      "docs": [
        "Initializes a new user account."
      ],
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
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
  "types": [
    {
      "name": "userAccount",
      "docs": [
        "Defines the structure of the UserAccount."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
