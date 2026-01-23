import {
  fetchSos,
  getInitializeInstruction,
  getJoinInstruction
} from "../target/idl/index.ts";

import {
  appendTransactionMessageInstructions,
  assertIsSendableTransaction,
  createTransactionMessage,
  generateKeyPairSigner,
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

describe("Test", () => {
  let sosKeypair: KeyPairSigner<string>;
  let player2Keypair: KeyPairSigner<string>;
  let player3Keypair: KeyPairSigner<string>;
  let client: CustomClient;

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
    // Prepare inputs.
    const { value: latestBlockhash } = await
      client.rpc.getLatestBlockhash().send();

    /* const { stdout, stderr } = await execAsync('solana program deploy -u localhost target/deploy/hello_anchor.so');
     const deployedProgram : any = stdout.split("Program Id: ")[1].substring(0, 65);
     console.log("Deployed at: ",stdout);*/

    const initializeSosIx = getInitializeInstruction(
      {
        signer: client.wallet,
        sos: sosKeypair
      }
    )


    const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(client.wallet, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([initializeSosIx], tx),
        (tx) => client.estimateAndSetComputeUnitLimit(tx),
      );


    // Compile the transaction message and sign it.
    const transaction = await signTransactionMessageWithSigners(transactionMessage);
    console.log("signeed")
    assertIsSendableTransaction(transaction);

    await client.sendAndConfirmTransaction(transaction, { commitment: 'confirmed' });

    const accInfo = await client.rpc.getAccountInfo(sosKeypair.address).send();

    console.log("accInfo:", accInfo)
  });

  it("p2 joins", async () => {
    const { value: latestBlockhash } = await
      client.rpc.getLatestBlockhash().send();

    const joinIx = getJoinInstruction(
      {
        signer: player2Keypair,
        sos: sosKeypair.address
      }
    )

    const transactionMessage = await pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(player2Keypair, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([joinIx], tx),
        (tx) => client.estimateAndSetComputeUnitLimit(tx),
      );
    


    // Compile the transaction message and sign it.
    const transaction = await signTransactionMessageWithSigners(transactionMessage);
    assertIsSendableTransaction(transaction);

    await client.sendAndConfirmTransaction(transaction, { commitment: 'confirmed' });

    const accInfo = await client.rpc.getAccountInfo(sosKeypair.address).send();
    const sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.p2, player2Keypair.address)
  });

  
  it("Fails if player tries to join while the 2 players are decided", async () => {
    try{
      const { value: latestBlockhash } = await
        client.rpc.getLatestBlockhash().send();

      const joinIx = getJoinInstruction(
        {
          signer: player3Keypair,
          sos: sosKeypair.address
        }
      )

      const transactionMessage = await pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => setTransactionMessageFeePayerSigner(player3Keypair, tx),
          (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
          (tx) => appendTransactionMessageInstructions([joinIx], tx),
          (tx) => client.estimateAndSetComputeUnitLimit(tx),
        );
      


      // Compile the transaction message and sign it.
      const transaction = await signTransactionMessageWithSigners(transactionMessage);
      assertIsSendableTransaction(transaction);

      await client.sendAndConfirmTransaction(transaction, { commitment: 'confirmed' });
    } catch(error: any) {
      assert.equal(error.cause.InstructionError[1].Custom, 2502n)
    }
  });
  /*
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
  it("Fails if the person trying to access a board is not part of that game");*/
});
