import React, { useState } from "react";
import QuestionInput from "../components/QuestionInput";

const Home = () => {
  const [answer, setAnswer] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Industrial Document Q&A</h1>
      <QuestionInput setAnswer={setAnswer} />
    </div>
  );
};

export default Home;