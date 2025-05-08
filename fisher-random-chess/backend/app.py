from flask import Flask, jsonify, request
from flask_cors import CORS
import chess
import random
import chess.engine
import json
import os

app = Flask(__name__)
CORS(app)

# Calea către executabilul Stockfish

LEARNING_DATA_FILE = "learning_data.json"

# Încarcă datele de învățare
def load_learning_data():
    if os.path.exists(LEARNING_DATA_FILE):
        with open(LEARNING_DATA_FILE, "r") as file:
            return json.load(file)
    else:
        return {
            "piece_values": {
                "p": 1, "n": 3, "b": 3, "r": 5, "q": 9,
                "P": 1, "N": 3, "B": 3, "R": 5, "Q": 9
            },
            "games_played": 0
        }

# Salvează datele de învățare
def save_learning_data(data):
    with open(LEARNING_DATA_FILE, "w") as file:
        json.dump(data, file)

learning_data = load_learning_data()

def generate_random_setup():
    while True:
        pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
        random.shuffle(pieces)

        bishop_indices = [i for i, p in enumerate(pieces) if p == 'b']
        if bishop_indices[0] % 2 == bishop_indices[1] % 2:
            continue

        rook_indices = [i for i, p in enumerate(pieces) if p == 'r']
        king_index = pieces.index('k')
        if not (min(rook_indices) < king_index < max(rook_indices)):
            continue

        break

    white_back_rank = ''.join(pieces).upper()
    black_back_rank = ''.join(pieces).lower()
    fen = f"{black_back_rank}/pppppppp/8/8/8/8/PPPPPPPP/{white_back_rank} w - - 0 1"
    return fen

def get_legal_moves(fen, square):
    board = chess.Board(fen)
    legal_moves = []
    for move in board.legal_moves:
        if move.from_square == chess.SQUARE_NAMES.index(square):
            legal_moves.append(chess.SQUARE_NAMES[move.to_square])
    return legal_moves

def evaluate_board(board):
    """
    Evaluează tabla de șah pe baza valorii pieselor și a datelor de învățare.
    """
    piece_values = learning_data["piece_values"]
    score = 0
    for piece in board.piece_map().values():
        value = piece_values.get(piece.symbol(), 0)
        score += value if piece.color == chess.WHITE else -value
    return score

def minimax(board, depth, is_maximizing):
    """
    Algoritmul Minimax pentru a calcula cea mai bună mutare.
    """
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)

    if is_maximizing:
        max_eval = float('-inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, False)
            board.pop()
            max_eval = max(max_eval, eval)
        return max_eval
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, True)
            board.pop()
            min_eval = min(min_eval, eval)
        return min_eval

def make_ai_move(board, depth=2):
    """
    Găsește cea mai bună mutare pentru AI folosind Minimax.
    """
    best_move = None
    best_value = float('-inf')
    for move in board.legal_moves:
        board.push(move)
        board_value = minimax(board, depth - 1, False)
        board.pop()
        if board_value > best_value:
            best_value = board_value
            best_move = move
    return best_move

def calculate_score(captured_pieces):
    piece_values = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
    }
    return sum([piece_values.get(piece.lower(), 0) for piece in captured_pieces])

def update_learning_data(winner):
    """
    Actualizează valorile pieselor în funcție de rezultatul jocului.
    """
    global captured_by_white, captured_by_black
    if winner == "white":  # AI-ul a câștigat
        for piece in captured_by_black:
            learning_data["piece_values"][piece.lower()] += 0.1
    elif winner == "black":  # AI-ul a pierdut
        for piece in captured_by_white:
            learning_data["piece_values"][piece.lower()] -= 0.1

    # Normalizează valorile pentru a evita creșteri/scăderi excesive
    for piece, value in learning_data["piece_values"].items():
        learning_data["piece_values"][piece] = max(0.1, round(value, 2))

    # Crește numărul de jocuri jucate
    learning_data["games_played"] += 1
    save_learning_data(learning_data)

def determine_winner(board):
    if board.is_checkmate():
        return "white" if not board.turn else "black"
    return "draw"

# Variabile globale pentru piesele capturate
captured_by_white = []
captured_by_black = []

@app.route('/')
def index():
    return "Backend is running. Use /api/setup or /api/move."

@app.route('/api/setup', methods=['GET'])
def setup():
    fen = generate_random_setup()
    print("Generated FEN:", fen)  # Debugging
    return jsonify(fen)

@app.route('/api/move', methods=['POST'])
def move():
    global captured_by_white, captured_by_black
    data = request.json
    fen = data['fen']
    move = f"{data['from']}{data['to']}"
    promotion = data.get('promotion', 'q')  # Implicit promovăm la regină
    board = chess.Board(fen)

    try:
        chess_move = chess.Move.from_uci(move)
        # Verifică dacă mutarea este validă
        if chess_move in board.legal_moves or (
            board.piece_at(chess_move.from_square).piece_type == chess.PAWN and
            (chess_move.to_square in chess.SQUARES[:8] or chess_move.to_square in chess.SQUARES[-8:])
        ):
            # Verifică dacă este o promovare
            if board.piece_at(chess_move.from_square).piece_type == chess.PAWN:
                if chess_move.to_square in chess.SQUARES[:8] or chess_move.to_square in chess.SQUARES[-8:]:
                    chess_move = chess.Move.from_uci(move + promotion)

            if board.is_capture(chess_move):
                captured_piece = board.piece_at(chess_move.to_square).symbol()
                if board.turn:
                    captured_by_black.append(captured_piece)
                else:
                    captured_by_white.append(captured_piece)

            board.push(chess_move)

            if board.is_game_over():
                winner = determine_winner(board)
                update_learning_data(winner)
                return jsonify({
                    "status": "game_over",
                    "winner": winner,
                    "message": f"Game over! Winner: {winner}"
                })

            ai_move = make_ai_move(board)
            if ai_move:
                if board.is_capture(ai_move):
                    captured_piece = board.piece_at(ai_move.to_square).symbol()
                    captured_by_white.append(captured_piece)
                board.push(ai_move)

            response = {
                "status": "success",
                "fen": board.fen(),
                "captured_by_white": captured_by_white,
                "captured_by_black": captured_by_black,
                "score_white": calculate_score(captured_by_white),
                "score_black": calculate_score(captured_by_black),
                "turn": "w" if board.turn else "b",
                "is_check": board.is_check(),
                "is_checkmate": board.is_checkmate(),
                "ai_move": ai_move.uci() if ai_move else None
            }
            return jsonify(response)
        else:
            return jsonify({"status": "error", "message": "Illegal move."}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/legal_moves', methods=['POST'])
def legal_moves():
    data = request.json
    fen = data['fen']
    square = data['square']
    moves = get_legal_moves(fen, square)
    return jsonify({"moves": moves})

@app.route('/api/start_game', methods=['GET'])
def start_game():
    fen = generate_random_setup()
    return jsonify({"fen": fen, "status": "success"})

@app.route('/api/test_stockfish', methods=['GET'])
def test_stockfish():
    board = chess.Board()
    try:
        ai_move = make_ai_move(board)
        return jsonify({"status": "success", "ai_move": ai_move.uci()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/learning_data', methods=['GET'])
def get_learning_data():
    """
    Returnează datele de învățare curente.
    """
    return jsonify(learning_data)

@app.route('/api/reset_learning_data', methods=['POST'])
def reset_learning_data():
    """
    Resetează datele de învățare la valorile inițiale.
    """
    global learning_data
    learning_data = {
        "piece_values": {
            "p": 1, "n": 3, "b": 3, "r": 5, "q": 9,
            "P": 1, "N": 3, "B": 3, "R": 5, "Q": 9
        },
        "games_played": 0
    }
    save_learning_data(learning_data)
    return jsonify({"status": "success", "message": "Learning data reset."})

if __name__ == '__main__':
    app.run(debug=True)