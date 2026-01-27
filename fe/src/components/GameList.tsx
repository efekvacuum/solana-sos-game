import { getProvider } from "@coral-xyz/anchor";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { useEffect, useState } from "react";

const GameList = ({ program, programId, publicKey, wallet, setGame }) => {
  const [fullGames, setFullGames] = useState([]);
  const [joinableGames, setJoinableGames] = useState([]);
  const [myGames, setMyGames] = useState([]);


  async function getSosAccounts(): Promise<void> {
    const provider = await getProvider();

    const accounts = await provider.connection.getProgramAccounts(programId, {
      filters: [
        {
          // Optionally filter by the size of the account data
          dataSize: 100,  // Discriminator (8 bytes) + Pubkey (32 bytes) + u64 (8 bytes)
        },
      ],
    });

    const decodedAccounts = accounts.map(account => {
      return { pubkey: account.pubkey, ...program.account.sos.coder.accounts.decode("Sos", account.account.data) };
    });
    const fullGames = decodedAccounts.filter(item => item.p2.toString() !== SystemProgram.programId.toString());
    const joinableGames = decodedAccounts.filter(item => item.p2.toString() === SystemProgram.programId.toString() && item.p1.toString() !== publicKey.toString());
    const myGames = decodedAccounts.filter(item => item.p1.toString() === publicKey.toString() || item.p2.toString() === publicKey.toString());

    // Decode the accounts using the program's account decoder
    setFullGames(fullGames);
    setJoinableGames(joinableGames);
    setMyGames(myGames);
  }

  useEffect(() => {
    const main = async () => {
      if (wallet) {
        await getSosAccounts();
      }
    }
    main();
  }, [wallet]);
  const handleJoin = async (game) => {
    try {
      if (!publicKey) throw new Error("No publicKey");

      const tx = await program.methods.join().accounts({
        signer: publicKey,
        sos: game.pubkey
      })
        .rpc();

      getSosAccounts();
    } catch (err) {
      alert("Problem occured.");
    }
  };

  const handleResume = (game) => {
    setGame(game);
  };

  const handleSpectator = (game) => {
    setGame(game);
  };

  const handleNewGame = async () => {
    if (!publicKey) throw new Error("No publicKey");

    let newKeypair = Keypair.generate();

    const tx = await program.methods.initialize().accounts({
      signer: publicKey,
      sos: newKeypair.publicKey,
      systemProgram: SystemProgram.programId,
    })
      .signers([newKeypair])
      .rpc();

    getSosAccounts();
  };

  return (
    <div>
      <span className="font-bold">(Make sure your wallet is connected to devnet!!!)</span>
      <div className="max-w-md mx-auto border border-gray-300 rounded shadow-md py-4 px-24 relative">
        <h1 className="text-xl font-bold inline-block mt-2">Available Games</h1>
        <button
          className="bg-[#512da8] text-white px-4 py-2 rounded hover:bg-[#3b2375] mt-4 absolute top-0 right-0 mx-4"
          onClick={() => handleNewGame()}
        >
          New
        </button>

        {/* Display the list of games */}
        <h1 className="text-base font-bold my-4">Full Games</h1>
        <ul className={`divide-y divide-gray-200 h-[11rem] overflow-y-auto`}>
          {fullGames.length > 0 ? (
            fullGames.map((game, index) => (
              <li
                key={index}
                className="flex justify-between items-center py-2"
              >
                <span className="text-lg mr-10">{game.p1.toString().substr(0, 4) + "..." + " vs " + game.p2.toString().substr(0, 4) + "..."}</span>
                {/* Join button */}
                <button
                  className="bg-[#512da8] text-white px-6 py-2 rounded hover:bg-[#3b2375]"
                  onClick={() => handleSpectator(game)}
                >
                  Check Board
                </button>
              </li>
            ))
          ) : (
            <li className="text-gray-500 mb-4">No games available.</li>
          )}
        </ul>
        <h1 className="text-base font-bold my-4">Joinable Games</h1>
        <ul className="divide-y divide-gray-200 h-[11rem] overflow-y-auto">
          {joinableGames.length > 0 ? (
            joinableGames.map((game, index) => (
              <li
                key={index}
                className="flex justify-between items-center py-2"
              >
                {/* Game name */}
                <span className="text-lg mr-5">{game.p1.toString().substr(0, 4) + "..." + "'s game"}</span>


                {/* Join button */}
                <button
                  className="bg-[#512da8] text-white px-6 py-2 rounded hover:bg-[#3b2375]"
                  onClick={() => handleJoin(game)}
                >
                  Join
                </button>
              </li>
            ))
          ) : (
            <li className="text-gray-500 mb-4">No games available.</li>
          )}
        </ul>
        <h1 className="text-base font-bold my-4">My Games</h1>
        <ul className="divide-y divide-gray-200 h-[11rem] overflow-y-auto">
          {myGames.length > 0 ? (
            myGames.map((game, index) => (
              <li
                key={index}
                className="flex justify-between items-center py-2"
              >
                {/* Game name */}
                <span className="text-lg mr-5">{game.p1.toString().substr(0, 4) + "..." + "'s game"}</span>


                {/* Join button */}
                <button
                  className="bg-[#512da8] text-white px-6 py-2 rounded hover:bg-[#3b2375]"
                  onClick={() => handleResume(game)}
                >
                  Resume
                </button>
              </li>
            ))
          ) : (
            <li className="text-gray-500 mb-4">No games available.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default GameList;
