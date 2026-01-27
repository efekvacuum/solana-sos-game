import { AnchorProvider, getProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import Board from "./components/Board.tsx";
import GameList from "./components/GameList.tsx";
import idl from "./idl.json";

function SubApp() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [game, setGame] = useState<any>(null);
  const [providerReady, setProviderReady] = useState(false);
  const [program, setProgram] = useState<any>(null);

  async function waitUntilSuccess(fn: any, interval = 500) {
    while (true) {
      try {
        const result = await fn();
        return result; // Success - exit loop and return result
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, interval));

      }
    }
  }

  const programId = new PublicKey(import.meta.env.VITE_PROGRAM_ID);


  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (game && program) {
      interval = setInterval(async () => {
        if (game?.pubkey) {
          let updatedGame = await program.account.sos.fetch(
            game!.pubkey
          );
          updatedGame.pubkey = game.pubkey;
          setGame(updatedGame);
        }
      }, 1000);
    }

    return (() => {
      if (interval) clearInterval(interval);
    })
  }, [game])

  useEffect(() => {
    if (anchorWallet) {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      setProvider(provider);
      setProviderReady(true);

      waitUntilSuccess(getProvider).then(() => {
        setProgram(new Program(idl as any, programId));
      });
    } else {
      setProviderReady(false);
    }

  }, [anchorWallet])

  return (
    <div>
      {game && providerReady &&
        <Board
          connection={connection}
          setGame={setGame}
          game={game}
          publicKey={publicKey}
        />
      }
      {!game && providerReady && program &&
        <GameList
          program={program}
          programId={programId}
          publicKey={publicKey}
          wallet={anchorWallet}
          setGame={setGame}
        />
      }
    </div>
  );
}

export default SubApp;