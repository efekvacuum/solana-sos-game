use anchor_lang::prelude::*;
use solana_program::system_program;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("BXuDm8bKg1o7TpSQ11pWoNAMVDNtT7vS9isphhaTfzr9");

fn calculate_score_gained(board: &[u8; 25], position: u8) -> u8 {
    let user_piece = board[position as usize];
    let inverse_piece = if user_piece == 1 { 2 } else { 1 };
    let mut points_gained: u8 = 0;
    let x = position % 5; // 0 1 2 3 4
    let y = position / 5; // 0 1 2 3 4

    // Check top
    if y > 1 && board[((y - 1) * 5 + x) as usize] == inverse_piece && board[((y - 2) * 5 + x) as usize] == user_piece
    { points_gained += 1 }

    // Check top right
    if y > 1 && x < 3 && board[((y - 1) * 5 + x + 1) as usize] == inverse_piece && board[((y - 2) * 5 + x + 2) as usize] == user_piece
    { points_gained += 1 }

    // Check right
    if x < 3 && board[(y * 5 + x + 1) as usize] == inverse_piece && board[(y * 5 + x + 2) as usize] == user_piece
    { points_gained += 1 }

    // Check bottom right
    if y < 3 && x < 3 && board[((y + 1) * 5 + x + 1) as usize] == inverse_piece && board[((y + 2) * 5 + x + 2) as usize] == user_piece
    { points_gained += 1 }

    // Check bottom
    if y < 3 && board[((y + 1) * 5 + x) as usize] == inverse_piece && board[((y + 2) * 5 + x) as usize] == user_piece
    { points_gained += 1 }

    // Check bottom left
    if y < 3 && x > 1 && board[((y + 1) * 5 + x - 1) as usize] == inverse_piece && board[((y + 2) * 5 + x - 2) as usize] == user_piece
    { points_gained += 1 }

    // Check left
    if x > 1 && board[(y * 5 + x - 1) as usize] == inverse_piece && board[(y * 5 + x - 2) as usize] == user_piece
    { points_gained += 1 }

    // Check top left
    if y > 1 && x > 1 && board[((y - 1) * 5 + x - 1) as usize] == inverse_piece && board[((y - 2) * 5 + x - 2) as usize] == user_piece
    { points_gained += 1 }

    points_gained
}

#[program]
mod hello_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let sos = &mut ctx.accounts.sos;
        sos.p1 = ctx.accounts.signer.key();
        sos.turn = 1;
        sos.p1Score = 0;
        sos.p2Score = 0;
        msg!("Changed data!"); // Message will show up in the tx logs
        Ok(())
    }

    pub fn join(ctx: Context<Join>) -> Result<()> {
        let sos = &mut ctx.accounts.sos;
        require_keys_eq!(system_program::ID, sos.p2);
        sos.p2 = ctx.accounts.signer.key();
        msg!("Player joined");
        Ok(())
    }

    pub fn play(ctx: Context<Play>, position: u8, piece: u8) -> Result<()> {
        let sos = &mut ctx.accounts.sos;

        // Check whose turn it is, throw if it's not the person playing
        let whose_turn = if sos.turn == 1 { sos.p1 } else { sos.p2 };
        require_keys_eq!(whose_turn, ctx.accounts.signer.key(), Errors::NotYourTurn);

        // Check if piece variable is valid
        require!(piece == 1 || piece == 2, Errors::PieceOutsideLimits);

        // Check if position is within limits
        require!(position < 25, Errors::PositionOutsideLimits);

        // Check if board is empty on the position
        require_eq!(sos.board[position as usize], 0, Errors::PositionNotEmpty);

        // Allow user to play
        sos.board[position as usize] = piece;

        // Calculate points
        if sos.turn == 1 {
            sos.p1Score += calculate_score_gained(&sos.board, position)
        } else {
            sos.p2Score += calculate_score_gained(&sos.board, position)
        }

        // Change turn
        sos.turn = if sos.turn == 1 { 2 } else { 1 };

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = signer, space = 8 + 32 + 32 + 25 + 1 + 1 + 1)]
    pub sos: Account<'info, Sos>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Join<'info> {
    #[account(mut)]
    pub sos: Account<'info, Sos>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(mut)]
    pub sos: Account<'info, Sos>,
    #[account(mut)]
    pub signer: Signer<'info>,
}


#[error_code]
pub enum Errors {
    PositionOutsideLimits,
    PieceOutsideLimits,
    PositionNotEmpty,
    NotYourTurn
}


#[account]
pub struct Sos {
    p1: Pubkey,
    p2: Pubkey,

    // 5x5 board
    // 0s are empty, 1 is S, 2 is O
    board: [u8; 25], 

    // 1 is p1, 2 is p2
    turn: u8,

    p1Score: u8,
    p2Score: u8
}