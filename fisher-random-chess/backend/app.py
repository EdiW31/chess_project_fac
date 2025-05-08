from flask import Flask, jsonify, request
from flask_cors import CORS
import chess
import random

app = Flask(__name__)
CORS(app)

def generate_random_setup():
    while True:
        # Step 1: Shuffle the pieces for one side (e.g., white)
        pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
        random.shuffle(pieces)

        # Step 2: Ensure bishops are on opposite-colored squares
        bishop_indices = [i for i, p in enumerate(pieces) if p == 'b']
        if bishop_indices[0] % 2 == bishop_indices[1] % 2:
            continue  # Bishops are on the same color, reshuffle

        # Step 3: Ensure the king is between the two rooks
        rook_indices = [i for i, p in enumerate(pieces) if p == 'r']
        king_index = pieces.index('k')
        if not (min(rook_indices) < king_index < max(rook_indices)):
            continue  # King is not between the rooks, reshuffle

        # If both conditions are satisfied, break the loop
        break

    # Step 4: Construct the FEN string
    white_back_rank = ''.join(pieces).upper()  # White pieces
    black_back_rank = ''.join(pieces).lower()  # Black pieces
    fen = f"{black_back_rank}/pppppppp/8/8/8/8/PPPPPPPP/{white_back_rank} w - - 0 1"
    return fen

def get_legal_moves(fen, square):
    board = chess.Board(fen)
    legal_moves = []
    for move in board.legal_moves:
        if move.from_square == chess.SQUARE_NAMES.index(square):
            legal_moves.append(chess.SQUARE_NAMES[move.to_square])
    return legal_moves

@app.route('/')
def index():
    return "Backend is running. Use /api/setup or /api/move."

@app.route('/api/setup', methods=['GET'])
def setup():
    fen = generate_random_setup()
    return jsonify(fen)

@app.route('/api/move', methods=['POST'])
def move():
    data = request.json
    fen = data['fen']
    move = f"{data['from']}{data['to']}"
    board = chess.Board(fen)

    try:
        chess_move = chess.Move.from_uci(move)
        if chess_move in board.legal_moves:
            board.push(chess_move)
            return jsonify({"status": "success", "fen": board.fen()})
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

if __name__ == '__main__':
    app.run(debug=True)



    