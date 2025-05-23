from flask import Flask, jsonify, request
from flask_cors import CORS
import chess
import random
import chess.engine
import json
import os
import mysql.connector
from flask_socketio import SocketIO, emit, join_room, leave_room

# Configurarea conexiunii la baza de date
db_config = {
    "host": "localhost",
    "user": "root",  # Înlocuiește cu utilizatorul tău MySQL
    "password": "12112003Ioan",  # Înlocuiește cu parola ta MySQL
    "database": "fisher_random_chess"
}

# Creează o conexiune la baza de date
db_connection = mysql.connector.connect(**db_config)
db_cursor = db_connection.cursor()

# Creează tabelele necesare
def create_tables():
    queries = [
        """
        CREATE TABLE IF NOT EXISTS learning_data (
            piece CHAR(1) PRIMARY KEY,
            value FLOAT NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS game_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            moves TEXT NOT NULL,
            winner VARCHAR(10),
            date_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    ]
    for query in queries:
        db_cursor.execute(query)
    db_connection.commit()

create_tables()

app = Flask(__name__)
CORS(app)

# Creează instanța SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Calea către executabilul Stockfish

LEARNING_DATA_FILE = "learning_data.json"

# Încarcă datele de învățare din baza de date
def load_learning_data():
    default_data = {
        "piece_values": {
            "p": 1, "n": 3, "b": 3, "r": 5, "q": 9,
            "P": 1, "N": 3, "B": 3, "R": 5, "Q": 9
        },
        "games_played": 0
    }
    for piece, value in default_data["piece_values"].items():
        db_cursor.execute("""
            INSERT INTO learning_data (piece, value)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE value = VALUES(value)
        """, (piece, value))
    db_connection.commit()

    # Încarcă datele din tabel
    db_cursor.execute("SELECT piece, value FROM learning_data")
    rows = db_cursor.fetchall()
    return {
        "piece_values": {row[0]: row[1] for row in rows},
        "games_played": 0
    }

# Salvează datele de învățare în baza de date
def save_learning_data(data):
    for piece, value in data["piece_values"].items():
        db_cursor.execute("UPDATE learning_data SET value = %s WHERE piece = %s", (value, piece))
    db_connection.commit()

learning_data = load_learning_data()

def save_game_history(moves, winner):
    try:
        print(f"Saving game history: moves={moves}, winner={winner}")  # Debugging
        db_cursor.execute(
            "INSERT INTO game_history (moves, winner) VALUES (%s, %s)",
            (json.dumps(moves), winner)
        )
        db_connection.commit()
    except Exception as e:
        print(f"Error saving game history: {e}")  # Debugging

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
    Evaluează tabla de șah pe baza valorii pieselor, controlului centrului și siguranței regelui.
    """
    piece_values = learning_data["piece_values"]
    score = 0

    # Valoarea pieselor
    for square, piece in board.piece_map().items():
        value = piece_values.get(piece.symbol(), 0)
        score += value if piece.color == chess.WHITE else -value

    # Controlul centrului
    center_squares = [chess.D4, chess.D5, chess.E4, chess.E5]
    for square in center_squares:
        if board.piece_at(square):
            piece = board.piece_at(square)
            score += 0.5 if piece.color == chess.WHITE else -0.5

    # Mobilitatea
    score += 0.1 * len(list(board.legal_moves)) if board.turn == chess.WHITE else -0.1 * len(list(board.legal_moves))

    # Siguranța regelui
    if board.is_check():
        score -= 1 if board.turn == chess.WHITE else -1

    return score

def minimax(board, depth, alpha, beta, is_maximizing):
    """
    Algoritmul Minimax cu Alpha-Beta Pruning.
    """
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)

    if is_maximizing:
        max_eval = float('-inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            max_eval = max(max_eval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = float('inf')
        for move in board.legal_moves:
            board.push(move)
            eval = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            min_eval = min(min_eval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break
        return min_eval

def make_ai_move(board, depth=3):
    """
    Găsește cea mai bună mutare pentru AI folosind Minimax cu Alpha-Beta Pruning.
    """
    best_move = None
    best_value = float('-inf')
    for move in board.legal_moves:
        board.push(move)
        board_value = minimax(board, depth - 1, float('-inf'), float('inf'), False)
        board.pop()
        if board_value > best_value:
            best_value = board_value
            best_move = move
    if best_move:
        print(f"AI move: {best_move.uci()}")  # Debugging
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
    db_cursor.execute("UPDATE learning_data SET value = %s WHERE piece = %s", 
                      (learning_data["games_played"], "games_played"))
    db_connection.commit()

    save_learning_data(learning_data)

def determine_winner(board):
    if board.is_checkmate():
        return "white" if not board.turn else "black"  # Dacă este șah-mat, câștigătorul este adversarul
    return "draw"

# Variabile globale pentru piesele capturate
captured_by_white = []
captured_by_black = []

# Variabile globale pentru jocurile multiplayer
multiplayer_games = {}

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
    fen = data['fen']
    move = f"{data['from']}{data['to']}"
    promotion = data.get('promotion', '')  # Implicit promovăm la regină dacă este cazul
    board = chess.Board(fen)

    try:
        # Adaugă promovarea la mutare dacă este cazul
        chess_move = chess.Move.from_uci(move + promotion if promotion else move)
        print(f"Attempting move: {move}, Promotion: {promotion}, Current FEN: {fen}")  # Debugging

        if chess_move in board.legal_moves:
            board.push(chess_move)
            print(f"Move applied: {move}, New FEN: {board.fen()}")  # Debugging

            if board.is_game_over():
                winner = determine_winner(board)
                return jsonify({
                    "status": "game_over",
                    "winner": winner,
                    "fen": board.fen()
                })

            # Mutarea AI-ului
            ai_move = make_ai_move(board)
            if ai_move:
                board.push(ai_move)

            return jsonify({
                "status": "success",
                "fen": board.fen(),
                "ai_move": ai_move.uci() if ai_move else None,
                "turn": "w" if board.turn else "b"
            })
        else:
            print(f"Illegal move: {move}")  # Debugging
            return jsonify({"status": "error", "message": "Illegal move."}), 400
    except Exception as e:
        print(f"Error processing move: {e}")  # Debugging
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

@app.route('/api/start_multiplayer_game', methods=['POST'])
def start_multiplayer_game():
    """
    Inițializează un joc multiplayer.
    """
    fen = generate_random_setup()
    game_id = random.randint(1000, 9999)  # Creează un ID unic pentru joc
    multiplayer_games[game_id] = {
        "fen": fen,
        "turn": "w",
        "moves": []
    }
    return jsonify({"status": "success", "game_id": game_id, "fen": fen})

@app.route('/api/multiplayer_move', methods=['POST'])
def multiplayer_move():
    """
    Gestionează mutările într-un joc multiplayer.
    """
    data = request.json
    game_id = data['game_id']
    move = data['move']
    if game_id not in multiplayer_games:
        return jsonify({"status": "error", "message": "Game not found"}), 404

    game = multiplayer_games[game_id]
    board = chess.Board(game["fen"])

    try:
        chess_move = chess.Move.from_uci(move)
        if chess_move in board.legal_moves:
            board.push(chess_move)
            game["fen"] = board.fen()
            game["moves"].append(move)
            game["turn"] = "w" if board.turn else "b"

            if board.is_game_over():
                winner = determine_winner(board)
                return jsonify({
                    "status": "game_over",
                    "winner": winner,
                    "message": f"Game over! Winner: {winner}"
                })

            return jsonify({
                "status": "success",
                "fen": game["fen"],
                "turn": game["turn"],
                "moves": game["moves"]
            })
        else:
            return jsonify({"status": "error", "message": "Illegal move"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/join_game', methods=['POST'])
def join_game():
    """
    Permite unui jucător să se alăture unui joc multiplayer existent.
    """
    data = request.json
    game_id = data.get('game_id')

    if game_id not in multiplayer_games:
        return jsonify({"status": "error", "message": "Game not found"}), 404

    game = multiplayer_games[game_id]
    return jsonify({
        "status": "success",
        "game_id": game_id,
        "fen": game["fen"],
        "moves": game["moves"],
        "turn": game["turn"]
    })

@app.route('/api/game_state/<game_id>', methods=['GET'])
def get_game_state(game_id):
    """
    Returnează starea curentă a jocului multiplayer.
    """
    if game_id not in multiplayer_games:
        return jsonify({"status": "error", "message": "Game not found"}), 404

    game = multiplayer_games[game_id]
    return jsonify({
        "status": "success",
        "game_id": game_id,
        "fen": game["fen"],
        "turn": game["turn"],
        "moves": game["moves"]
    })

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
    db_cursor.execute("SELECT piece, value FROM learning_data")
    rows = db_cursor.fetchall()
    piece_values = {row[0]: row[1] for row in rows if row[0] != "games_played"}
    games_played = next((row[1] for row in rows if row[0] == "games_played"), 0)

    return jsonify({
        "piece_values": piece_values,
        "games_played": games_played
    })

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

@socketio.on('create_game')
def create_game():
    """
    Creează un joc multiplayer și alocă un ID unic.
    """
    game_id = str(random.randint(1000, 9999))  # ID unic pentru joc
    multiplayer_games[game_id] = {
        "fen": generate_random_setup(),
        "turn": "w",
        "moves": []
    }
    join_room(game_id)
    emit('game_created', {"game_id": game_id, "fen": multiplayer_games[game_id]["fen"]}, room=game_id)

@socketio.on('join_game')
def join_game(data):
    """
    Permite unui jucător să se alăture unui joc multiplayer existent.
    """
    game_id = data.get('game_id')
    if game_id in multiplayer_games:
        join_room(game_id)
        emit('game_joined', {"game_id": game_id, "fen": multiplayer_games[game_id]["fen"]}, room=game_id)
    else:
        emit('error', {"message": "Game not found."})

@socketio.on('make_move')
def make_move(data):
    """
    Gestionează mutările într-un joc multiplayer.
    """
    game_id = data.get('game_id')
    move = data.get('move')

    if game_id not in multiplayer_games:
        emit('error', {"message": "Game not found."})
        return

    game = multiplayer_games[game_id]
    board = chess.Board(game["fen"])

    try:
        chess_move = chess.Move.from_uci(move)
        if chess_move in board.legal_moves:
            board.push(chess_move)
            game["fen"] = board.fen()
            game["moves"].append(move)
            game["turn"] = "w" if board.turn else "b"

            # Notifică jucătorii să sincronizeze starea jocului
            emit('sync_game', {"game_id": game_id, "fen": game["fen"], "turn": game["turn"]}, room=game_id)
            if board.is_game_over():
                winner = determine_winner(board)
                emit('game_over', {"winner": winner, "fen": game["fen"]}, room=game_id)
        else:
            emit('error', {"message": "Illegal move."})
    except Exception as e:
        emit('error', {"message": str(e)})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)