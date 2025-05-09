import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";
import { Chess } from "chess.js";
import MoveHistory from "./MoveHistory";
import Score from "./Score.js";
import "../styles/Board.scss";

const Board = () => {
  // State declarations
  const [gameState, setGameState] = useState({
    fen: "start",
    moves: [],
    scoreWhite: 0,
    scoreBlack: 0,
    isCheck: false,
    isCheckmate: false
  });

  const [capturedPieces, setCapturedPieces] = useState({
    white: [],
    black: []
  });

  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [learningData, setLearningData] = useState(null);

  // Effects
  useEffect(() => {
    initializeGame();
  }, []);

  // API calls
  const initializeGame = async () => {
    try {
      const [setupResponse, learningResponse] = await Promise.all([
        axios.get("http://127.0.0.1:5000/api/setup"),
        axios.get("http://127.0.0.1:5000/api/learning_data")
      ]);

      setGameState(prev => ({ ...prev, fen: setupResponse.data }));
      setLearningData(learningResponse.data);
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  };

  const fetchValidMoves = async (square) => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/api/legal_moves", {
        fen: gameState.fen,
        square
      });

      const newHighlightedSquares = response.data.moves.reduce((acc, move) => ({
        ...acc,
        [move]: {
          background: "rgba(255, 255, 0, 0.4)",
          borderRadius: "50%"
        }
      }), {});

      setHighlightedSquares(newHighlightedSquares);
    } catch (error) {
      console.error("Error fetching valid moves:", error);
    }
  };

  // Event handlers
  const onDrop = ({ sourceSquare, targetSquare }) => {
    const isPawnPromotion = checkPawnPromotion(sourceSquare, targetSquare);
    const promotion = isPawnPromotion ? "q" : null;

    axios.post("http://127.0.0.1:5000/api/move", {
      from: sourceSquare,
      to: targetSquare,
      fen: gameState.fen,
      promotion
    })
    .then(handleMoveResponse)
    .catch(handleMoveError);
  };

  const onMouseOverSquare = (square) => {
    try {
      const chess = new Chess(gameState.fen);
      if (chess.get(square)) {
        fetchValidMoves(square);
      }
    } catch (error) {
      console.error("Error checking piece:", error);
    }
  };

  const onMouseOutSquare = () => setHighlightedSquares({});

  const resetGame = () => {
    axios.get("http://127.0.0.1:5000/api/start_game")
      .then(response => {
        setGameState({
          fen: response.data.fen,
          moves: [],
          scoreWhite: 0,
          scoreBlack: 0,
          isCheck: false,
          isCheckmate: false
        });
        setCapturedPieces({ white: [], black: [] });
      })
      .catch(error => console.error("Error resetting game:", error));
  };

  // Helper functions
  const checkPawnPromotion = (sourceSquare, targetSquare) => {
    const isWhitePawn = gameState.fen.split(" ")[1] === "w" &&
                       sourceSquare[1] === "7" && targetSquare[1] === "8";
    const isBlackPawn = gameState.fen.split(" ")[1] === "b" &&
                       sourceSquare[1] === "2" && targetSquare[1] === "1";
    return isWhitePawn || isBlackPawn;
  };

  const handleMoveResponse = (response) => {
    if (response.data.status === "success") {
      updateGameState(response.data);
    } else if (response.data.status === "game_over") {
      alert(response.data.message);
      resetGame();
    } else {
      alert(response.data.message || "Invalid move.");
    }
  };

  const handleMoveError = (error) => {
    console.error("Error making move:", error);
    alert("Invalid move or server error.");
  };

  const updateGameState = (data) => {
    setGameState(prev => ({
      ...prev,
      fen: data.fen,
      moves: [...prev.moves, data.lastMove],
      scoreWhite: data.score_white || prev.scoreWhite,
      scoreBlack: data.score_black || prev.scoreBlack,
      isCheck: data.is_check || false,
      isCheckmate: data.is_checkmate || false
    }));

    setCapturedPieces({
      white: data.captured_by_white || [],
      black: data.captured_by_black || []
    });
  };

  // Render
  return (
    <div className="chess-game">
      <header>
        <h2>Fisher Random Chess</h2>
        <button onClick={resetGame}>Reset Game</button>
      </header>

      <div className="game-container">
        <div className="left-panel">
          <Score
            scoreBlack={gameState.scoreBlack}
            scoreWhite={gameState.scoreWhite}
            isCheck={gameState.isCheck}
            isCheckmate={gameState.isCheckmate}
          />
          <MoveHistory moves={gameState.moves} />
          {learningData && (
            <div className="learning-data">
              <h3>Learning Data</h3>
              <p><strong>Games Played:</strong> {learningData.games_played}</p>
              <h4>Piece Values:</h4>
              <ul>
                {Object.entries(learningData.piece_values).map(([piece, value]) => (
                  <li key={piece}>{piece}: {value.toFixed(2)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="chessboard-container">
          <Chessboard
            position={gameState.fen}
            onDrop={onDrop}
            onMouseOverSquare={onMouseOverSquare}
            onMouseOutSquare={onMouseOutSquare}
            squareStyles={highlightedSquares}
            draggable={true}
          />
        </div>

        <div className="right-panel">
          <div className="captured-pieces">
            <h3>Captured by Player:</h3>
            <div className="pieces">
              {capturedPieces.black.map((piece, index) => (
                <img 
                  key={index}
                  src={`/assets/chess-pieces/${piece}.png`}
                  alt={piece}
                />
              ))}
            </div>
          </div>

          <div className="captured-pieces">
            <h3>Captured by Bot:</h3>
            <div className="pieces">
              {capturedPieces.white.map((piece, index) => (
                <img 
                  key={index}
                  src={`/assets/chess-pieces/${piece}.png`}
                  alt={piece}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;