import {
  fetchSos,
  getInitializeInstruction,
  getJoinInstruction,
  getPlayInstruction
} from "../target/idl/index.ts";

import {
  appendTransactionMessageInstructions,
  assertIsSendableTransaction,
  createTransactionMessage,
  generateKeyPairSigner,
  Instruction,
  KeyPairSigner,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners
} from '@solana/kit';
import assert from 'assert';
import { exec } from 'child_process';
import { before, describe, it } from 'node:test';
import { promisify } from 'util';
import { airdrop, CustomClient, newClient } from '../client/client.ts';

const logBoard = (board: any) => {
  Array.from(Array(5)).forEach((x, i) => {
    console.log(board.slice(i * 5, i * 5 + 4))
  });
}

let client: CustomClient;

const sendTransactionHelper = async (instructions: Instruction[], feePayer: KeyPairSigner<string>) => {
  const { value: latestBlockhash } = await
    client.rpc.getLatestBlockhash().send();

  const transactionMessage = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
    (tx) => client.estimateAndSetComputeUnitLimit(tx),
  );

  // Below complains with typescript I didn't dive in to see why so I marked it with any
  const transaction = await signTransactionMessageWithSigners(transactionMessage as any);
  assertIsSendableTransaction(transaction);

  return await client.sendAndConfirmTransaction(transaction as any, { commitment: 'confirmed' });
}

describe("Test", () => {
  let sosKeypair: KeyPairSigner<string>;
  let player2Keypair: KeyPairSigner<string>;
  let player3Keypair: KeyPairSigner<string>;


  before(async () => {
    client = await newClient();
    sosKeypair = await generateKeyPairSigner();
    player2Keypair = await generateKeyPairSigner();

    await airdrop({
      recipientAddress: player2Keypair.address,
      lamports: lamports(1_000_000_000n),
      commitment: 'confirmed',
    });

    player3Keypair = await generateKeyPairSigner();

    await airdrop({
      recipientAddress: player3Keypair.address,
      lamports: lamports(1_000_000_000n),
      commitment: 'confirmed',
    });
  });

  it("initialize", async () => {
    const initializeSosIx = getInitializeInstruction(
      {
        signer: client.wallet,
        sos: sosKeypair
      }
    )

    await sendTransactionHelper([initializeSosIx], client.wallet)

    const sosAccount = await fetchSos(client.rpc, sosKeypair.address);
    assert.equal(sosAccount.data.p1, client.wallet.address);
  });

  it("p2 joins", async () => {
    const joinIx = getJoinInstruction(
      {
        signer: player2Keypair,
        sos: sosKeypair.address
      }
    )

    await sendTransactionHelper([joinIx], player2Keypair)

    const sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.p2, player2Keypair.address)
  });


  it("Fails if player tries to join while the 2 players are decided", async () => {
    try {
      const joinIx = getJoinInstruction(
        {
          signer: player3Keypair,
          sos: sosKeypair.address
        }
      )

      await sendTransactionHelper([joinIx], player3Keypair)
    } catch (error: any) {
      assert.equal(error.cause.InstructionError[1].Custom, 2502n)
    }
  });

  it("p1 plays", async () => {
    let sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.board[0], 0);
    const playIx = getPlayInstruction(
      {
        piece: 1,
        position: 0,
        sos: sosAccount.address,
        signer: client.wallet
      }
    )
    try {
      await sendTransactionHelper([playIx], client.wallet);
    } catch (err: any) {
      console.log("simerr", err.cause)
    }
    sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.board[0], 1);
  });

  /*it("Fails if not their turn", async () => {
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
  });*/
  it("Fails if the person trying to access a board is not part of that game");
});
