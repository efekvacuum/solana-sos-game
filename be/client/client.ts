import { estimateComputeUnitLimitFactory, getSetComputeUnitLimitInstruction } from '@solana-program/compute-budget';
import { airdropFactory, appendTransactionMessageInstruction, createKeyPairSignerFromBytes, createKeyPairSignerFromPrivateKeyBytes, createSolanaRpc, createSolanaRpcSubscriptions, generateKeyPairSigner, lamports, sendAndConfirmTransactionFactory } from '@solana/kit';
import fs from "fs";
import { homedir } from 'os';

function estimateAndSetComputeUnitLimitFactory(
    ...params: Parameters<typeof estimateComputeUnitLimitFactory>
) {
    const estimateComputeUnitLimit = estimateComputeUnitLimitFactory(...params);
    return async(
        transactionMessage: any,
    ) => {
        const computeUnitsEstimate = await estimateComputeUnitLimit(transactionMessage);
        return appendTransactionMessageInstruction(
            getSetComputeUnitLimitInstruction({ units: computeUnitsEstimate }),
            transactionMessage,
        );
    };
}

export type CustomClient = {
    rpc: ReturnType<typeof createSolanaRpc>,
    rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>,
    wallet: Awaited<ReturnType<typeof createKeyPairSignerFromBytes>>,
    estimateAndSetComputeUnitLimit: ReturnType<typeof estimateAndSetComputeUnitLimitFactory>,
    sendAndConfirmTransaction: ReturnType<typeof sendAndConfirmTransactionFactory>
}

let client: CustomClient;

export let airdrop: ReturnType<typeof airdropFactory>

export async function newClient() {
    if (!client) {
        const home = homedir();  // Gets /home/efe
        const keypairPath = `${home}/.config/solana/id.json`;
        const solanaWallet = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
        const wallet = await createKeyPairSignerFromBytes(solanaWallet);
        const rpc = createSolanaRpc('http://127.0.0.1:8899');
        const rpcSubscriptions = createSolanaRpcSubscriptions('ws://127.0.0.1:8900');
        const estimateAndSetComputeUnitLimit = estimateAndSetComputeUnitLimitFactory({ rpc });
        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

        client = {
            rpc,
            rpcSubscriptions,
            wallet,
            estimateAndSetComputeUnitLimit,
            sendAndConfirmTransaction
        };

        airdrop = airdropFactory({ rpc, rpcSubscriptions });
        
        
        await airdrop({
            recipientAddress: wallet.address,
            lamports: lamports(1_000_000_000n),
            commitment: 'confirmed',
        });
    }

    return client;
}