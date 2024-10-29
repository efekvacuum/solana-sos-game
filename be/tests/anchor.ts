import 'rpc-websockets/dist/lib/client';
import * as anchor from "@coral-xyz/anchor";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { HelloAnchor } from "../target/types/hello_anchor";

const logBoard = (board) => {
  Array.from(Array(5)).forEach((x, i) => {
    console.log(board.slice(i * 5, i * 5 + 4))
  });
}

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.HelloAnchor as anchor.Program<HelloAnchor>;
  
  var sosKeypair;
  var player2Keypair;
  var player3Keypair;
  before(() => {
    sosKeypair = new web3.Keypair();
    player2Keypair = new web3.Keypair();
    player3Keypair = new web3.Keypair();
  });

  it("initialize", async () => {
    // Send transaction
    const txHash = await program.methods
      .initialize()
      .accounts({
        sos: sosKeypair.publicKey,
        signer: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([sosKeypair])
      .rpc();

    // Confirm transaction
    await program.provider.connection.confirmTransaction(txHash);

    // Fetch the created account
    const sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );
    
    // Check whether the data on-chain is equal to local 'data'
    assert(program.provider.publicKey.equals(sosAccount.p1));
  });

  it("p2 joins", async () => {
    const txHash = await program.methods
      .join()
      .accounts({
        sos: sosKeypair.publicKey,
        signer: player2Keypair.publicKey,
      })
      .signers([player2Keypair])
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);

    const sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );

    assert(player2Keypair.publicKey.equals(sosAccount.p2));
  });

  it("Fails if player tries to join while the 2 players are decided", async () => {
    try{
    const txHash = await program.methods
      .join()
      .accounts({
        sos: sosKeypair.publicKey,
        signer: player3Keypair.publicKey,
      })
      .signers([player3Keypair])
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);
    
    } catch(error) {
      const errMsg = "Error Code: RequireKeysEqViolated. Error Number: 2502. Error Message: A require_keys_eq expression was violated.";
      assert(error.message.includes(errMsg))
    }
  });

  it("p1 plays", async () => {
    let sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );

    assert.equal(sosAccount.board[0], 0);

    const txHash = await program.methods
      .play(0, 1)
      .accounts({
        sos: sosKeypair.publicKey,
        signer: program.provider.publicKey,
      })
      .rpc();

    await program.provider.connection.confirmTransaction(txHash);

    sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );

    assert.equal(sosAccount.board[0], 1);
  });

  it("Fails if not their turn", async () => {
    try {
      const txHash = await program.methods
        .play(0, 1)
        .accounts({
          sos: sosKeypair.publicKey,
          signer: program.provider.publicKey,
        })
        .rpc();

      await program.provider.connection.confirmTransaction(txHash);
    } catch (error) {
      const errMsg = "Error Code: NotYourTurn.";
      
      assert(error.message.includes(errMsg))
    }
  });

  it("Fails if a player tries to put a piece to a non-empty position", async () => {
    try {
      const txHash = await program.methods
        .play(0, 1)
        .accounts({
          sos: sosKeypair.publicKey,
          signer: player2Keypair.publicKey,
        })
        .signers([player2Keypair])
        .rpc();

      await program.provider.connection.confirmTransaction(txHash);
    } catch (error) {
      const errMsg = "Error Code: PositionNotEmpty.";
      
      assert(error.message.includes(errMsg))
    }
  });

  it("p1 score should increase after succesful SOS", async () => {
    let sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );

    await program.methods
      .play(1, 2)
      .accounts({
        sos: sosKeypair.publicKey,
        signer: player2Keypair.publicKey,
      })
      .signers([player2Keypair])
      .rpc();

    const txHash = await program.methods
      .play(2, 1)
      .accounts({
        sos: sosKeypair.publicKey,
        signer: program.provider.publicKey,
      })
      .rpc();
    
    await program.provider.connection.confirmTransaction(txHash);

    sosAccount = await program.account.sos.fetch(
      sosKeypair.publicKey
    );
    
    logBoard(sosAccount.board);

    assert.equal(sosAccount.p1Score, 1);
    assert.equal(sosAccount.p2Score, 0);
  });
  it("Fails if the person trying to access a board is not part of that game");
});
