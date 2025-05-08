import React from "react";

const CapturedPieces = ({ captured }) => {
  return (
    <div className="captured-pieces">
      <h3>Captured Pieces</h3>
      <div>
        {captured.map((piece, index) => (
          <span key={index}>{piece}</span>
        ))}
      </div>
    </div>
  );
};

export default CapturedPieces;
