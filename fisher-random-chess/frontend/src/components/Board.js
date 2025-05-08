import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";

const Board = () => {
  const [fen, setFen] = useState("start");
  const [highlightedSquares, setHighlightedSquares] = useState({});

  useEffect(() => {
    // Fetch the initial random setup
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
    axios
      .post("http://127.0.0.1:5000/api/move", {
        from: sourceSquare,
        to: targetSquare,
        fen: fen,
      })
      .then((response) => {
        if (response.data.status === "success") {
          setFen(response.data.fen); // Update the board with the new FEN
        } else {
          setHighlightedSquares({
            [targetSquare]: { backgroundColor: "rgba(255, 0, 0, 0.4)" }, // Red for invalid move
          });
          setTimeout(() => setHighlightedSquares({}), 1000); // Clear after 1 second
          alert(response.data.message || "Invalid move.");
        }
      })
      .catch((error) => {
        console.error("Error making move:", error);
        alert("Invalid move or server error.");
      });
  };

  const onMouseOverSquare = (square) => {
    axios
      .post("http://127.0.0.1:5000/api/legal_moves", { fen, square })
      .then((response) => {
        const legalMoves = response.data.moves;
        const highlights = {};
        legalMoves.forEach((move) => {
          highlights[move] = { backgroundColor: "rgba(0, 255, 0, 0.4)" }; // Green for valid moves
        });
        setHighlightedSquares(highlights);
      })
      .catch((error) => {
        console.error("Error fetching legal moves:", error);
      });
  };

  const onMouseOutSquare = () => {
    setHighlightedSquares({});
  };

  return (
    <div>
      <h2>Fisher Random Chess</h2>
      <Chessboard
        position={fen}
        onDrop={onDrop}
        onMouseOverSquare={onMouseOverSquare}
        onMouseOutSquare={onMouseOutSquare}
        squareStyles={highlightedSquares}
        draggable={true}
      />
    </div>
  );
};

export default Board;
