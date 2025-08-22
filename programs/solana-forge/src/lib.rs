// lib.rs for SolanaForge - Compatible with Anchor v0.31.1

use anchor_lang::prelude::*;
// Note the change here: we now use 'Interface' for SPL Token accounts
use anchor_spl::{
    token_interface::{Mint, MintTo, TokenAccount, TokenInterface},
    associated_token::AssociatedToken,
};

// Program ID - This will be updated after you deploy
declare_id!("DqgCoHx1ncV6PzVYVg7bRxj4KQ5XrxhpPTT5qqe2FR99");

#[program]
pub mod solana_forge {
    use super::*;

    /// Initializes a new user account.
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.authority = *ctx.accounts.user.key;
        msg!("User account initialized for: {}", user_account.authority);
        Ok(())
    }

    /// Creates a new SPL Token.
    pub fn create_token(
        ctx: Context<CreateToken>,
        decimals: u8,
        initial_supply: u64,
    ) -> Result<()> {
        // Calculate the actual supply based on decimals
        let supply = (initial_supply as u64) * 10u64.pow(decimals as u32);

        // Mint the initial supply to the user's token account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_context = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token_interface::mint_to(cpi_context, supply)?;

        msg!("Token created successfully!");
        msg!("Mint: {}", ctx.accounts.mint.key());
        msg!("Initial Supply: {}", supply);
        Ok(())
    }
}

/// Context for the `initialize_user` instruction.
#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Context for the `create_token` instruction.
#[derive(Accounts)]
#[instruction(decimals: u8)] // Make decimals available to the macro
pub struct CreateToken<'info> {
    /// The new token mint account.
    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = payer,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    /// The user's token account for the new mint.
    /// FIX: Use 'init_if_needed' for Associated Token Accounts.
    /// This tells Anchor to create the account only if it doesn't exist.
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    /// The user who is creating the token and paying for the accounts.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Solana Token Program (now an Interface).
    pub token_program: Interface<'info, TokenInterface>,
    /// The Associated Token Account program.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// The Solana System Program.
    pub system_program: Program<'info, System>,
}

/// Defines the structure of the UserAccount.
#[account]
pub struct UserAccount {
    pub authority: Pubkey,
}
