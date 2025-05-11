import React from "react";

const GameModeSelection = ({ onSelectMode }) => {
  return (
    <div className="game-mode-selection">
      <h2>Select Game Mode</h2>
      <button onClick={() => onSelectMode("ai")}>Play with AI</button>
      <button onClick={() => onSelectMode("friend")}>Play with Friend</button>
    </div>
  );
};

export default GameModeSelection;
