# Fisher Random Chess

## Overview
Fisher Random Chess, also known as Chess960, is a chess variant that randomizes the starting positions of the pieces on the back rank. This project implements a web-based version of Fisher Random Chess with a React front-end and a Python back-end.

## Project Structure
The project is organized into two main directories: `backend` and `frontend`.

### Backend
- **app.py**: The main entry point for the Flask application. It initializes the server and handles API requests.
- **requirements.txt**: Lists the required Python packages for the backend, including Flask and any necessary libraries for the chess engine.
- **engine/**: Contains the logic for the Fisher Random chess variant.
  - **fisher_random.py**: Implements the rules and mechanics of Fisher Random Chess.
- **utils/**: Contains utility functions that support the backend logic.

### Frontend
- **public/index.html**: The main HTML file that serves as the entry point for the React application.
- **src/**: Contains the React components and application logic.
  - **components/**: Contains reusable components for the application.
    - **Board.js**: Represents the chessboard and handles user interactions.
    - **Header.js**: Displays the application header.
  - **App.js**: The main component that sets up the application structure.
  - **index.js**: The entry point for the React application.
  - **styles/**: Contains CSS styles for the application.
    - **App.css**: Defines the layout and appearance of the components.
- **package.json**: Configuration file for npm, listing dependencies and scripts.
- **.env**: Stores environment variables for the React application.

## Setup Instructions

### Backend
1. Navigate to the `backend` directory.
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```
3. Run the Flask application:
   ```
   python app.py
   ```

### Frontend
1. Navigate to the `frontend` directory.
2. Install the required npm packages:
   ```
   npm install
   ```
3. Start the React application:
   ```
   npm start
   ```

## Features
- Randomized starting positions for pieces according to Fisher Random rules.
- Interactive chessboard with user-friendly interface.
- Real-time move validation and game state management.

## Usage
Once both the backend and frontend are running, navigate to `http://localhost:3000` in your web browser to start playing Fisher Random Chess.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.