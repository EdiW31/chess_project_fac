import React, { useEffect, useState } from "react";
import axios from "axios";

const LearningData = () => {
  const [learningData, setLearningData] = useState(null);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:5000/api/learning_data")
      .then((response) => {
        setLearningData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching learning data:", error);
      });
  }, []);

  const resetLearningData = () => {
    axios
      .post("http://127.0.0.1:5000/api/reset_learning_data")
      .then(() => {
        alert("Learning data reset!");
        setLearningData(null); // Reîncarcă datele
      })
      .catch((error) => {
        console.error("Error resetting learning data:", error);
      });
  };

  if (!learningData) {
    return <p>Loading learning data...</p>;
  }

  return (
    <div className="learning-data">
      <h3>Learning Data</h3>
      <p>
        <strong>Games Played:</strong> {learningData.games_played}
      </p>
      <h4>Piece Values:</h4>
      <ul>
        {Object.entries(learningData.piece_values).map(([piece, value]) => (
          <li key={piece}>
            {piece}: {value.toFixed(2)}
          </li>
        ))}
      </ul>
      <button onClick={resetLearningData}>Reset Learning Data</button>
    </div>
  );
};

export default LearningData;
