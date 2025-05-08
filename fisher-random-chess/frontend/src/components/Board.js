import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";
import MoveHistory from "./MoveHistory";
import Score from "./Score.js";
import "../styles/Board.scss";

const Board = () => {
  const [fen, setFen] = useState("start");
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [moves, setMoves] = useState([]);
  const [capturedByWhite, setCapturedByWhite] = useState([]);
  const [capturedByBlack, setCapturedByBlack] = useState([]);
  const [scoreWhite, setScoreWhite] = useState(0);
  const [scoreBlack, setScoreBlack] = useState(0);
  const [isCheck, setIsCheck] = useState(false);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [learningData, setLearningData] = useState(null); // Adaugă state pentru learningData

  useEffect(() => {
    // Fetch setup
    axios
      .get("http://127.0.0.1:5000/api/setup")
      .then((response) => {
        setFen(response.data);
      })
      .catch((error) => {
        console.error("Error fetching setup:", error);
      });

    // Fetch learning data
    axios
      .get("http://127.0.0.1:5000/api/learning_data")
      .then((response) => {
        setLearningData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching learning data:", error);
      });
  }, []);

  const onDrop = ({ sourceSquare, targetSquare }) => {
    const isPawnPromotion =
      (fen.split(" ")[1] === "w" &&
        sourceSquare[1] === "7" &&
        targetSquare[1] === "8") ||
      (fen.split(" ")[1] === "b" &&
        sourceSquare[1] === "2" &&
        targetSquare[1] === "1");

    const promotion = isPawnPromotion ? "q" : null; // Implicit promovăm la regină

    axios
      .post("http://127.0.0.1:5000/api/move", {
        from: sourceSquare,
        to: targetSquare,
        fen: fen,
        promotion: promotion, // Trimite promovarea
      })
      .then((response) => {
        console.log("Response:", response.data); // Debugging
        if (response.data.status === "success") {
          setFen(response.data.fen);
          setMoves((prevMoves) => [
            ...prevMoves,
            `${sourceSquare}-${targetSquare}`,
          ]);

          // Actualizează piesele capturate
          setCapturedByWhite(response.data.captured_by_white || []);
          setCapturedByBlack(response.data.captured_by_black || []);

          if (response.data.ai_move) {
            setMoves((prevMoves) => [
              ...prevMoves,
              `Bot: ${response.data.ai_move}`,
            ]);
          }

          // Update scores
          setScoreWhite(response.data.score_white || 0);
          setScoreBlack(response.data.score_black || 0);

          // Update check and checkmate status
          setIsCheck(response.data.is_check || false);
          setIsCheckmate(response.data.is_checkmate || false);
        } else if (response.data.status === "game_over") {
          alert(response.data.message);
          resetGame(); // Reîncepe jocul
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
      .get("http://127.0.0.1:5000/api/start_game")
      .then((response) => {
        setFen(response.data.fen);
        setMoves([]);
        setCapturedByWhite([]);
        setCapturedByBlack([]);
        setScoreWhite(0);
        setScoreBlack(0);
        setIsCheck(false);
        setIsCheckmate(false);
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
      <div className="game-container">
        <div className="left-panel">
          <Score
            scoreBlack={scoreBlack}
            scoreWhite={scoreWhite}
            isCheck={isCheck}
            isCheckmate={isCheckmate}
          />
          <MoveHistory moves={moves} />
          {learningData && (
            <div className="learning-data">
              <h3>Learning Data</h3>
              <p>
                <strong>Games Played:</strong> {learningData.games_played}
              </p>
              <h4>Piece Values:</h4>
              <ul>
                {Object.entries(learningData.piece_values).map(
                  ([piece, value]) => (
                    <li key={piece}>
                      {piece}: {value.toFixed(2)}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="chessboard-container">
          <Chessboard
            position={fen}
            onDrop={onDrop}
            squareStyles={highlightedSquares}
            draggable={true}
          />
        </div>

        <div className="right-panel">
          <div className="captured-pieces">
            <h3>Captured by Player:</h3>
            <div className="pieces">
              {capturedByBlack.map((piece, index) => (
                <img key={index} src={getPieceImage(piece)} alt={piece} />
              ))}
            </div>
          </div>

          <div className="captured-pieces">
            <h3>Captured by Bot:</h3>
            <div className="pieces">
              {capturedByWhite.map((piece, index) => (
                <img key={index} src={getPieceImage(piece)} alt={piece} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
