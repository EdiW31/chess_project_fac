import React from "react";
import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="home-page">
      <h1>Welcome to Fisher Random Chess</h1>
      <Link to="/game">
        <button>Play Game</button>
      </Link>
    </div>
  );
};

export default HomePage;
