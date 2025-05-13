import React, { useState, useEffect } from "react";
import Chessboard from "chessboardjsx";
import axios from "axios";
import { Chess } from "chess.js";
import Score from "./Score.js";
import GameModeSelection from "./GameModeSelection";
import "../styles/Board.scss";
import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:5000"); // Adresa backend-ului

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
    turn: "w",
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

  useEffect(() => {
    // Evenimente WebSocket
    socket.on("game_created", (data) => {
      setGameId(data.game_id);
      setGameState({ fen: data.fen, turn: "w" });
    });

    socket.on("game_joined", (data) => {
      setGameId(data.game_id);
      setGameState({ fen: data.fen, turn: "w" });
    });

    return () => {
      socket.off(); // Dezactivează evenimentele la demontarea componentei
    };
  }, []);

  useEffect(() => {
    socket.on("move_made", (data) => {
      setGameState((prev) => ({
        ...prev,
        fen: data.fen,
        turn: data.turn,
      }));
    });

    socket.on("game_over", (data) => {
      alert(`Game over! Winner: ${data.winner}`);
      setGameState((prev) => ({
        ...prev,
        fen: data.fen,
        turn: null,
      }));
    });

    return () => {
      socket.off("move_made");
      socket.off("game_over");
    };
  }, []);

  useEffect(() => {
    const syncGameState = async () => {
      if (!gameId) return;

      try {
        const response = await axios.get(
          `http://127.0.0.1:5000/api/game_state/${gameId}`
        );
        if (response.data.status === "success") {
          setGameState((prev) => ({
            ...prev,
            fen: response.data.fen,
            turn: response.data.turn,
            moves: response.data.moves,
          }));
        }
      } catch (error) {
        console.error("Error syncing game state:", error);
      }
    };

    const interval = setInterval(syncGameState, 2000); // Sincronizare la fiecare 2 secunde
    return () => clearInterval(interval); // Curăță intervalul la demontarea componentei
  }, [gameId]);

  useEffect(() => {
    socket.on("sync_game", (data) => {
      if (data.game_id === gameId) {
        // Sincronizează starea jocului
        axios
          .get(`http://127.0.0.1:5000/api/game_state/${gameId}`)
          .then((response) => {
            if (response.data.status === "success") {
              setGameState((prev) => ({
                ...prev,
                fen: response.data.fen,
                turn: response.data.turn,
                moves: response.data.moves,
              }));
            }
          })
          .catch((error) => console.error("Error syncing game state:", error));
      }
    });

    return () => {
      socket.off("sync_game");
    };
  }, [gameId]);

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
    socket.emit("create_game");
  };

  const joinMultiplayerGame = () => {
    if (!gameId) {
      alert("Please enter a valid Game ID.");
      return;
    }

    socket.emit("join_game", { game_id: gameId });
  };

  // Event handlers
  const onDrop = ({ sourceSquare, targetSquare }) => {
    const isPawnPromotion = checkPawnPromotion(sourceSquare, targetSquare);
    const promotion = isPawnPromotion ? "q" : null;

    const move = `${sourceSquare}${targetSquare}`;
    socket.emit("make_move", { game_id: gameId, move, promotion });
  };

  const onDropAI = ({ sourceSquare, targetSquare }) => {
    const chess = new Chess(gameState.fen);

    // Verifică dacă piesa este un pion
    const piece = chess.get(sourceSquare);
    if (!piece) {
      alert("No piece on the selected square!");
      return;
    }

    console.log("Selected piece:", piece); // Debugging

    const isPawnPromotion = checkPawnPromotion(sourceSquare, targetSquare);
    const promotion = isPawnPromotion ? "q" : null;

    const move = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: promotion, // Promovare implicită
    });

    if (move === null) {
      alert("Illegal move!");
      return;
    }

    console.log("Attempting move:", move.san, "FEN:", chess.fen()); // Debugging

    axios
      .post("http://127.0.0.1:5000/api/move", {
        fen: gameState.fen,
        from: sourceSquare,
        to: targetSquare,
        promotion, // Trimite promovarea
      })
      .then((response) => {
        console.log("Move response:", response.data); // Debugging
        if (response.data.status === "success") {
          setGameState((prev) => ({
            ...prev,
            fen: response.data.fen,
            turn: response.data.turn,
          }));
        } else if (response.data.status === "game_over") {
          alert(`Game over! Winner: ${response.data.winner}`);
          resetGame(); // Resetează jocul automat
        }
      })
      .catch((error) => {
        console.error("Error making move:", error);
      });
  };

  const onDropMultiplayer = ({ sourceSquare, targetSquare }) => {
    const move = `${sourceSquare}${targetSquare}`;
    socket.emit("make_move", { game_id: gameId, move });
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

  const makeMove = (sourceSquare, targetSquare) => {
    const move = `${sourceSquare}${targetSquare}`;
    socket.emit("make_move", { game_id, move });
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
        <div className="turn-indicator">
          <h3>Turn: {gameState.turn === "w" ? "White" : "Black"}</h3>
        </div>
        <Chessboard
          position={gameState.fen}
          onDrop={onDrop} // Folosește onDrop pentru multiplayer
          onMouseOverSquare={onMouseOverSquare}
          onMouseOutSquare={onMouseOutSquare}
          squareStyles={highlightedSquares}
          draggable={true}
        />
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
        <div className="chessboard-container">
          <Chessboard
            position={gameState.fen}
            onDrop={onDropAI} // Folosește onDropAI pentru AI
            onMouseOverSquare={onMouseOverSquare}
            onMouseOutSquare={onMouseOutSquare}
            squareStyles={highlightedSquares}
            draggable={true}
          />
          <div className="turn-indicator">
            <h3>Turn: {gameState.turn === "w" ? "White" : "Black"}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
