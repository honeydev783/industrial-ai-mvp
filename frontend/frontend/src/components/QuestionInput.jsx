import { useState } from "react";
import { askQuestion } from "../api/backend";

const QuestionInput = ({ setAnswer }) => {
  const [question, setQuestion] = useState("");

  const handleAsk = async () => {
    const result = await askQuestion(question);
    setAnswer(result);
  };

  return (
    <div className="my-4">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="border p-2 w-full"
      />
      <button onClick={handleAsk} className="bg-blue-600 text-white px-4 py-2 mt-2">
        Ask
      </button>
    </div>
  );
};

export default QuestionInput;