import React from "react";

const Score = ({ scoreBlack, scoreWhite, isCheck, isCheckmate }) => {
  return (
    <div className="scores-container">
      <h3>Scores</h3>
      <div className="score">
        <p>
          <strong>Player:</strong> {scoreBlack}
        </p>
        <p>
          <strong>Bot:</strong> {scoreWhite}
        </p>
      </div>
      <div className="game-status">
        {isCheckmate ? (
          <p className="status checkmate">Checkmate!</p>
        ) : isCheck ? (
          <p className="status check">Check!</p>
        ) : (
          <p className="status normal">Game in progress...</p>
        )}
      </div>
    </div>
  );
};

export default Score;
