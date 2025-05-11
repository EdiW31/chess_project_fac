import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";
import { Chess } from "chess.js";
import Score from "./Score.js";
import GameModeSelection from "./GameModeSelection";
import "../styles/Board.scss";

const Board = () => {
  const [gameMode, setGameMode] = useState(null); // "ai" sau "friend"
  const [gameId, setGameId] = useState(null);

  // State declarations
  const [gameState, setGameState] = useState({
    fen: "start",
    moves: [],
    scoreWhite: 0,
    scoreBlack: 0,
    isCheck: false,
    isCheckmate: false,
  });

  const [capturedPieces, setCapturedPieces] = useState({
    white: [],
    black: [],
  });

  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [learningData, setLearningData] = useState(null);

  // Effects
  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/learning_data")
      .then((response) => {
        console.log("Learning Data fetched:", response.data); // Debugging
        setLearningData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching learning data:", error);
      });
  }, []);

  // API calls
  const initializeGame = async () => {
    try {
      const [setupResponse, learningResponse] = await Promise.all([
        axios.get("http://127.0.0.1:5000/api/setup"),
        axios.get("http://127.0.0.1:5000/api/learning_data"),
      ]);

      setGameState((prev) => ({ ...prev, fen: setupResponse.data }));
      setLearningData(learningResponse.data);
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  };

  const fetchValidMoves = async (square) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/api/legal_moves",
        {
          fen: gameState.fen,
          square,
        }
      );

      const newHighlightedSquares = response.data.moves.reduce(
        (acc, move) => ({
          ...acc,
          [move]: {
            background: "rgba(255, 255, 0, 0.4)",
            borderRadius: "50%",
          },
        }),
        {}
      );

      setHighlightedSquares(newHighlightedSquares);
    } catch (error) {
      console.error("Error fetching valid moves:", error);
    }
  };

  const startMultiplayerGame = () => {
    axios
      .post("http://127.0.0.1:5000/api/start_multiplayer_game")
      .then((res) => {
        console.log("Multiplayer game started:", res.data); // Debugging
        setGameId(res.data.game_id); // Setează Game ID
        setGameState({ fen: res.data.fen, moves: [] }); // Setează starea jocului
      })
      .catch((error) => {
        console.error("Error starting multiplayer game:", error);
      });
  };

  const joinMultiplayerGame = () => {
    if (!gameId) {
      alert("Please enter a valid Game ID.");
      return;
    }

    axios
      .post("http://192.168.0.140:5000/api/join_game", { game_id: gameId })
      .then((res) => {
        if (res.data.status === "success") {
          console.log("Joined game:", res.data); // Debugging
          setGameState({ fen: res.data.fen, moves: res.data.moves }); // Setează starea jocului
        } else {
          alert(res.data.message || "Failed to join game.");
        }
      })
      .catch((error) => {
        console.error("Error joining game:", error);
        alert("Game not found or network error.");
      });
  };

  // Event handlers
  const onDrop = ({ sourceSquare, targetSquare }) => {
    const isPawnPromotion = checkPawnPromotion(sourceSquare, targetSquare);
    const promotion = isPawnPromotion ? "q" : null;

    axios
      .post("http://127.0.0.1:5000/api/move", {
        from: sourceSquare,
        to: targetSquare,
        fen: gameState.fen,
        promotion,
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
    axios
      .get("http://127.0.0.1:5000/api/start_game")
      .then((response) => {
        setGameState({
          fen: response.data.fen,
          moves: [],
          scoreWhite: 0,
          scoreBlack: 0,
          isCheck: false,
          isCheckmate: false,
        });
        setCapturedPieces({ white: [], black: [] });
      })
      .catch((error) => console.error("Error resetting game:", error));
  };

  // Helper functions
  const checkPawnPromotion = (sourceSquare, targetSquare) => {
    const isWhitePawn =
      gameState.fen.split(" ")[1] === "w" &&
      sourceSquare[1] === "7" &&
      targetSquare[1] === "8";
    const isBlackPawn =
      gameState.fen.split(" ")[1] === "b" &&
      sourceSquare[1] === "2" &&
      targetSquare[1] === "1";
    return isWhitePawn || isBlackPawn;
  };

  const handleMoveResponse = (response) => {
    if (response.data.status === "success") {
      updateGameState(response.data);
    } else if (response.data.status === "game_over") {
      alert(response.data.message);

      // Reîncarcă Learning Data
      axios
        .get("http://127.0.0.1:5000/api/learning_data")
        .then((res) => {
          console.log("Learning Data fetched:", res.data); // Debugging
          setLearningData(res.data); // Actualizează Learning Data
        })
        .catch((error) => {
          console.error("Error fetching learning data:", error);
        });

      resetGame(); // Resetează jocul
    } else {
      alert(response.data.message || "Invalid move.");
    }
  };

  const handleMoveError = (error) => {
    console.error("Error making move:", error);
    alert("Invalid move or server error.");
  };

  const updateGameState = (data) => {
    setGameState((prev) => ({
      ...prev,
      fen: data.fen,
      moves: [...prev.moves, data.lastMove],
      scoreWhite: data.score_white || prev.scoreWhite,
      scoreBlack: data.score_black || prev.scoreBlack,
      isCheck: data.is_check || false,
      isCheckmate: data.is_checkmate || false,
    }));

    setCapturedPieces({
      white: data.captured_by_white || [],
      black: data.captured_by_black || [],
    });
  };

  // Render
  if (!gameMode) {
    return <GameModeSelection onSelectMode={setGameMode} />;
  }

  if (gameMode === "friend") {
    if (!gameId) {
      return (
        <div>
          <h2>Multiplayer Game</h2>
          <input
            type="text"
            placeholder="Enter Game ID"
            value={gameId || ""}
            onChange={(e) => setGameId(e.target.value)}
          />
          <button onClick={joinMultiplayerGame}>Join Game</button>
          <button onClick={startMultiplayerGame}>Start New Game</button>
        </div>
      );
    }

    return (
      <div>
        <h2>Multiplayer Game</h2>
        <p>Game ID: {gameId}</p>
        {/* Afișează tabla de șah și gestionează mutările */}
      </div>
    );
  }

  return (
    <div className="chess-game">
      <header>
        <h2>Game with AI</h2>
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
