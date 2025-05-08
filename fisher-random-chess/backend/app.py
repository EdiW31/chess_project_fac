from flask import Flask, jsonify, request
from flask_cors import CORS
import chess
import random
import chess.engine

app = Flask(__name__)
CORS(app)

# Calea către executabilul Stockfish
STOCKFISH_PATH = "C:/Users/crist/Downloads/stockfish-windows-x86-64-avx2/stockfish/stockfish.exe"

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

def make_ai_move(board):
    # Conectează-te la motorul Stockfish
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        # Cere mutarea cea mai bună
        result = engine.play(board, chess.engine.Limit(time=0.1))  # Timp de gândire: 0.1 secunde
        return result.move

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

            board.push(chess_move)

            # Verifică dacă este șah sau mat după mutarea utilizatorului
            is_check = board.is_check()
            is_checkmate = board.is_checkmate()

            # Mutarea botului folosind Stockfish
            if not is_checkmate:
                ai_move = make_ai_move(board)
                if ai_move:
                    board.push(ai_move)

            response = {
                "status": "success",
                "fen": board.fen(),
                "captured": captured_piece,
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