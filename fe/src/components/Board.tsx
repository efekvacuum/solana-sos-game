import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import React, { useState } from "react";
import idl from "../idl.json";

const S_SVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <text x="50%" y="50%" fontSize="60" textAnchor="middle" dy=".35em" fill="#333">
      S
    </text>
  </svg>
);

const O_SVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <text x="50%" y="50%" fontSize="60" textAnchor="middle" dy=".35em" fill="#333">
      O
    </text>
  </svg>
);

const Board = ({ setGame, game, publicKey, connection }: {connection: Connection}) => {
  const convertTo2D = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    console.log(result);
    return result;
  };

  const programId = new PublicKey(import.meta.env.VITE_PROGRAM_ID);
  const program = new Program(idl, programId);
  const [board, setBoard] = useState(convertTo2D(game.board, 5));
  const [piece, setPiece] = useState(1);

  const handleClick = async (row, col) => {
    if(isItMyTurn()) {
      try {
        const position = row * 5 + col;
        console.log("here")
        if (!publicKey) throw new Error("No publicKey");
  
        const tx = await program.methods.play(position, piece).accounts({
          signer: publicKey,
          sos: game.pubkey
        })
          .rpc();
        console.log("confirming")
        await connection.confirmTransaction(tx, 'confirmed');
        console.log(tx);
        getCurrentGame();
      } catch(err) {
        alert("Problem occured.");
      }
    }
  };

  const getCurrentGame = async() => {
    let updatedGame = await program.account.sos.fetch(
      game.pubkey
    );
    setGame(updatedGame);
    setBoard(convertTo2D(updatedGame.board, 5));
  }

  const amIPlaying = () : boolean => {
    return game.p1.toString() === publicKey.toString() || game.p2.toString() === publicKey.toString()
  }

  const isItMyTurn = (): boolean => {
    if (
      amIPlaying() && 
      (game.turn === 1 && game.p1.toString() === publicKey.toString()) || 
      (game.turn === 2 && game.p2.toString() === publicKey.toString())
    )
      return true;
    
    return false;
  }

  const headerString = () => {
    if(amIPlaying()) {
      let opponentString = game.p1.toString() === publicKey.toString() ? game.p2.toString() : game.p1.toString();
      return "You" + " vs " + opponentString.substr(0, 4) + "...";
    }
      
    else
      return game.p1.toString().substr(0, 4) + "..." + " vs " + game.p2.toString().substr(0, 4) + "...";
  }

  const turnString = () => {
    let playerAddress = game.turn == 1 ? game.p1.toString() : game.p2.toString(); 
    if(playerAddress === publicKey.toString())
      return "Your turn";
    else
      return playerAddress.substr(0, 4) + "...'s turn";
  }

  return (
    <div className="mx-auto mt-10">
      <div className="text-xl font-bold my-4" onClick={() => getCurrentGame()}>{headerString()}</div>
      <div className="text-base italic my-4">{turnString()}</div>
      {amIPlaying() && 
      <div className="text-xl my-4">Choose:&nbsp;
        <span className={`cursor-pointer font-bold text-lg ${piece == 1 ? "underline" : ""}`} onClick={() => setPiece(1)}>S</span>&nbsp;
        <span className={`cursor-pointer font-bold text-lg ${piece == 2 ? "underline" : ""}`} onClick={() => setPiece(2)}>O</span>
      </div>
      }
      <div className="grid grid-cols-5 gap-0 border border-gray-400">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-12 h-12 border border-gray-200 flex items-center justify-center ${(isItMyTurn() ? "cursor-pointer" : "")}`}
              onClick={() => handleClick(rowIndex, colIndex)}
            >
              {cell === 1 ? <S_SVG /> : cell === 2 ? <O_SVG /> : null}
            </div>
          ))
        )}
      </div>
      <div className="text-xl font-bold my-4">Score</div>
      <div><b>{game.p1.toString().substr(0, 4)}...: </b>{game.p1Score} <b>{game.p2.toString().substr(0, 4)}...: </b>{game.p2Score}</div>
      <button
        className="bg-[#512da8] text-white px-6 py-2 rounded hover:bg-[#3b2375] mt-4"
        onClick={() => setGame(null)}
      >
        Go Back
      </button>
    </div>
  );
};


export default Board;