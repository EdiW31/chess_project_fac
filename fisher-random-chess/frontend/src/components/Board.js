import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";
import MoveHistory from "./MoveHistory";
import Score from "./Score";
import "../styles/Board.scss";

const Board = () => {
  const [fen, setFen] = useState("start");
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [moves, setMoves] = useState([]);
  const [capturedByWhite, setCapturedByWhite] = useState([]);
  const [capturedByBlack, setCapturedByBlack] = useState([]);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/setup")
      .then((response) => {
        setFen(response.data);
      })
      .catch((error) => {
        console.error("Error fetching setup:", error);
      });
  }, []);

  const onDrop = ({ sourceSquare, targetSquare }) => {
    console.log("Move:", sourceSquare, targetSquare); // Debugging
    console.log("FEN:", fen); // Verifică FEN-ul curent
    axios
      .post("http://127.0.0.1:5000/api/move", {
        from: sourceSquare,
        to: targetSquare,
        fen: fen,
      })
      .then((response) => {
        console.log("Response:", response.data); // Debugging
        if (response.data.status === "success") {
          setFen(response.data.fen);
          setMoves((prevMoves) => [
            ...prevMoves,
            `${sourceSquare}-${targetSquare}`,
          ]);

          if (response.data.captured) {
            if (response.data.turn === "w") {
              setCapturedByBlack((prev) => [...prev, response.data.captured]);
            } else {
              setCapturedByWhite((prev) => [...prev, response.data.captured]);
            }
          }

          if (response.data.ai_move) {
            setMoves((prevMoves) => [
              ...prevMoves,
              `Bot: ${response.data.ai_move}`,
            ]);
          }
        } else {
          alert(response.data.message || "Invalid move.");
        }
      })
      .catch((error) => {
        console.error("Error making move:", error);
        alert("Invalid move or server error.");
      });
  };

  const resetGame = () => {
    axios
      .get("http://127.0.0.1:5000/api/setup")
      .then((response) => {
        setFen(response.data);
        setMoves([]);
        setCapturedByWhite([]);
        setCapturedByBlack([]);
      })
      .catch((error) => {
        console.error("Error resetting game:", error);
      });
  };

  const getPieceImage = (piece) => {
    return `/assets/chess-pieces/${piece}.png`;
  };

  return (
    <div>
      <h2>Fisher Random Chess</h2>
      <button onClick={resetGame}>Reset Game</button>
      <div className="chessboard-container">
        <div className="captured-pieces">
          <h3>Captured by White:</h3>
          <div className="pieces">
            {capturedByWhite.map((piece, index) => (
              <img key={index} src={getPieceImage(piece)} alt={piece} />
            ))}
          </div>
        </div>

        <Chessboard
          position={fen}
          onDrop={onDrop}
          squareStyles={highlightedSquares}
          draggable={true}
        />

        <div className="captured-pieces">
          <h3>Captured by Black:</h3>
          <div className="pieces">
            {capturedByBlack.map((piece, index) => (
              <img key={index} src={getPieceImage(piece)} alt={piece} />
            ))}
          </div>
        </div>
      </div>
      <MoveHistory moves={moves} />
      <Score captured={[...capturedByWhite, ...capturedByBlack]} />
    </div>
  );
};

export default Board;
