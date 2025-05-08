import React from "react";
import "../styles/Board.scss";

const MoveHistory = ({ moves }) => {
  return (
    <div className="move-history">
      <h3>Move History</h3>
      <ul>
        {moves.map((move, index) => (
          <li key={index}>
            <strong>{index + 1}.</strong> {move}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MoveHistory;
