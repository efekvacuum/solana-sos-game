import {
  fetchSos,
  getHelloAnchorErrorMessage,
  getInitializeInstruction,
  getJoinInstruction,
  getPlayInstruction,
  HELLO_ANCHOR_ERROR__NOT_YOUR_TURN,
  HELLO_ANCHOR_ERROR__POSITION_NOT_EMPTY
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
        sos: sosKeypair.address,
        signer: client.wallet
      }
    )

    await sendTransactionHelper([playIx], client.wallet);

    sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.board[0], 1);
  });

  it("Fails if not their turn", async () => {
    try {
      const playIx = getPlayInstruction(
        {
          piece: 1,
          position: 0,
          sos: sosKeypair.address,
          signer: client.wallet
        }
      )

      await sendTransactionHelper([playIx], client.wallet);
    } catch (error: any) {
      assert.equal(HELLO_ANCHOR_ERROR__NOT_YOUR_TURN, parseInt(error.cause.InstructionError[1].Custom))
    }
  });

  it("Fails if a player tries to put a piece to a non-empty position", async () => {
     try {
      const playIx = getPlayInstruction(
        {
          piece: 2,
          position: 0,
          sos: sosKeypair.address,
          signer: player2Keypair
        }
      )

      await sendTransactionHelper([playIx], player2Keypair);
    } catch (error: any) {
      assert.equal(HELLO_ANCHOR_ERROR__POSITION_NOT_EMPTY, parseInt(error.cause.InstructionError[1].Custom))
    }
  });
 
  it("p1 score should increase after succesful SOS", async () => {
    let sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.p1Score, 0);

    let playIx = getPlayInstruction(
      {
        piece: 2,
        position: 1,
        sos: sosKeypair.address,
        signer: player2Keypair
      }
    )

    await sendTransactionHelper([playIx], player2Keypair)

    playIx = getPlayInstruction(
      {
        piece: 1,
        position: 2,
        sos: sosKeypair.address,
        signer: client.wallet
      }
    )

    await sendTransactionHelper([playIx], client.wallet)
    
    sosAccount = await fetchSos(client.rpc, sosKeypair.address)

    assert.equal(sosAccount.data.p1Score, 1);
    assert.equal(sosAccount.data.p2Score, 0);
  });
  it("Fails if the person trying to access a board is not part of that game", async () => {
    try {
      const playIx = getPlayInstruction(
        {
          piece: 2,
          position: 4,
          sos: sosKeypair.address,
          signer: player3Keypair
        }
      )

      await sendTransactionHelper([playIx], player3Keypair);
    } catch (error: any) {
      assert.equal(HELLO_ANCHOR_ERROR__NOT_YOUR_TURN, parseInt(error.cause.InstructionError[1].Custom))
    }
  });
});
