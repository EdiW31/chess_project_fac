from flask import Flask, jsonify, request
from flask_cors import CORS
import chess
import random
import chess.engine

app = Flask(__name__)
CORS(app)

# Calea către executabilul Stockfish

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
    Evaluează tabla de șah pe baza valorii pieselor.
    """
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0
    }
    score = 0
    for piece in board.piece_map().values():
        value = piece_values.get(piece.piece_type, 0)
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

# Variabile globale pentru piesele capturate
captured_by_white = []
captured_by_black = []
#moga
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
    print("Received data:", data)  # Debugging
    fen = data['fen']
    move = f"{data['from']}{data['to']}"
    print("FEN:", fen)  # Debugging
    print("Move:", move)  # Debugging
    board = chess.Board(fen)

    try:
        chess_move = chess.Move.from_uci(move)
        print("Attempting move:", chess_move)  # Debugging
        if chess_move in board.legal_moves:
            captured_piece = None
            if board.is_capture(chess_move):
                captured_piece = board.piece_at(chess_move.to_square).symbol()
                if board.turn:  # Dacă este rândul albului, piesa capturată aparține negrului
                    captured_by_black.append(captured_piece)
                else:  # Dacă este rândul negrului, piesa capturată aparține albului
                    captured_by_white.append(captured_piece)

            board.push(chess_move)

            # Verifică dacă este șah sau mat după mutarea utilizatorului
            is_check = board.is_check()
            is_checkmate = board.is_checkmate()

            # Mutarea botului folosind Minimax
            if not is_checkmate:
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
                "is_check": is_check,
                "is_checkmate": is_checkmate,
                "ai_move": ai_move.uci() if ai_move else None
            }
            print("Response:", response)  # Debugging
            return jsonify(response)
        else:
            print("Illegal move:", chess_move)  # Debugging
            return jsonify({"status": "error", "message": "Illegal move."}), 400
    except Exception as e:
        print("Error:", str(e))  # Debugging
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

if __name__ == '__main__':
    app.run(debug=True)