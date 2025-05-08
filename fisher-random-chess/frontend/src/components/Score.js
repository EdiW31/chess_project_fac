import React from "react";

const Score = ({ captured }) => {
  const calculateScore = () => {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 }; // Valori pentru piese
    return captured.reduce(
      (score, piece) => score + (pieceValues[piece.toLowerCase()] || 0),
      0
    );
  };

  return (
    <div className="score">
      <h3>Score: {calculateScore()}</h3>
    </div>
  );
};

export default Score;
