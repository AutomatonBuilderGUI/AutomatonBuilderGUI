import { SetStateAction, useState, useEffect } from "react";
import { testStringOnAutomata } from "./TestStringOnAutomata";
import { BsFillClipboardCheckFill } from "react-icons/bs";
import InformationBox, { InformationBoxType } from "./InformationBox";
import StateManager from "../StateManager";

export default function TestStringWindow() {
  const [testString, setTestString] = useState("");
  const [result, setResult] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (
      result === "Rejected" ||
      result === "Accepted" ||
      result === "Invalid DFA" ||
      result === "Invalid Input Tokens"
    )
      setResult("");
  }, [JSON.stringify(StateManager.dfa)]);

  const errorMessages = [
    "Invalid DFA",
    "Invalid Input Tokens",
    "Empty string not allowed",
    "Rejected",
  ];

  const handleTestString = () => {
    const testResult = testStringOnAutomata(testString);
    if (errorMessages.includes(testResult)) {
      setResult(testResult);
      setIsError(true); // Set as error
    } else {
      setResult(testResult);
      setIsError(false);
    }
  };

  const handleChange = (e: { target: { value: SetStateAction<string> } }) => {
    setTestString(e.target.value);
    setResult(""); // Clear the result when the test string changes
    setIsError(false);
  };

  return (
    <div>
      <div className="flex items-center bg-white p-3 rounded-lg shadow-sm border border-gray-300">
        <input
          className="focus:outline-none bg-transparent flex-grow border-0 py-2"
          type="text"
          placeholder="Enter string to test"
          value={testString}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleTestString();
            }
          }}
        />
        <button
          id="testMachineButton"
          className="ml-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:bg-green-700"
          onClick={handleTestString}
        >
          <BsFillClipboardCheckFill />
        </button>
      </div>
      {result && isError && (
        <InformationBox infoBoxType={InformationBoxType.Error}>
          {result}
        </InformationBox>
      )}
      {result && !isError && (
        <InformationBox infoBoxType={InformationBoxType.Success}>
          {result}
        </InformationBox>
      )}
    </div>
  );
}
