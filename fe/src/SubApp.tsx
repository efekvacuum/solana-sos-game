import { AnchorProvider, getProvider, Program, setProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import Board from "./components/Board.tsx";
import GameList from "./components/GameList.tsx";

function SubApp() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const wallet = useAnchorWallet();
  const [game, setGame] = useState(null);
  const [providerReady, setProviderReady] = useState(false);

  useEffect(() => {
    console.log("game is", game);
  }, [game])

  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
      console.log("we are done")
      setProviderReady(true);
    }
  }, [wallet])

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
      {!game && providerReady &&
        <GameList
          connection={connection}
          publicKey={publicKey}
          sendTransaction={sendTransaction}
          wallet={wallet}
          setGame={setGame}
        />
      }
    </div>
  );
}

export default SubApp;