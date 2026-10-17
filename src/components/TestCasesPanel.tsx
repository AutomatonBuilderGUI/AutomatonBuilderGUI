import { ChangeEvent, useRef, useState } from "react";
import StateManager from "../StateManager";
import { IconContext } from "react-icons";
import { BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";
import { testStringOnAutomata } from "./TestStringOnAutomata";
import {
  CoreListItem,
  CoreListItem_Left,
  CoreListItem_Right,
} from "./ListItem";
import { BiTestTube } from "react-icons/bi";
import FloatingPanel from "./FloatingPanel";
import ErrorDialogBox from "./ErrorDialogBox";

export default function TestCasesPanel() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [tests, setTests] = useState([]);
  const testsFileInputRef = useRef<HTMLInputElement>(null); // Create a ref for the tests file input

  const handleErrorClose = () => {
    setIsErrorVisible(false);
  };

  // Function to trigger tests file input click event
  const handleLoadTestsButtonClick = () => {
    testsFileInputRef.current?.click(); // Programmatically click the hidden file input
  };

  const handleRunAllTestsClick = () => {
    if (StateManager.checkDebug()) {
      showError(
        "Please disable Debug Mode before running all of the tests. However, you may run individual tests with Debug Mode enabled.",
      );
      return;
    }
    let results = tests.map((test) => {
      let res = testStringOnAutomata(test.string);
      return res === "Accepted" ? test.expectedAccept : !test.expectedAccept;
    });
    setTestResults(results);
  };

  const handleTestsFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    StateManager.uploadJSON(e)
      .then((parsedData) => {
        let i = 0;
        let arr = [];
        for (let test of parsedData.tests) {
          if (test.string !== undefined || test.expectedAccept !== undefined)
            arr.push({
              id: i++,
              string: test.string,
              expectedAccept: test.expectedAccept,
            });
        }
        setTests(arr);
        setTestResults([]);
      })
      .catch((response) => {
        showError(`handleTestsFileUpload ${response}`);
      });
  };

  const displayTestResult = (res: boolean) => {
    if (res) {
      return (
        <IconContext.Provider value={{ size: "1.5em" }}>
          <BsCheckCircleFill className="min-h-full mr-2 text-green-400 dark:text-green-600 text-lg" />
        </IconContext.Provider>
      );
    } else if (res === false) {
      return (
        <IconContext.Provider value={{ size: "1.5em" }}>
          <BsXCircleFill className="min-h-full mr-2 text-red-500 dark:text-red-400 text-lg" />
        </IconContext.Provider>
      );
    }
  };

  const displayTest = tests.map((test) => (
    <div key={test.id} className="mb-2 text-left">
      <CoreListItem>
        <CoreListItem_Left>
          <div className="flex">
            <div>{displayTestResult(testResults[test.id])}</div>
            <div>
              {test.string}
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Should be
                {test.expectedAccept === true ? (
                  <span className="text-lime-500 dark:text-lime-300">
                    {" "}
                    {"Accepted"}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    {" "}
                    {"Rejected"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CoreListItem_Left>
        <CoreListItem_Right>
          <button
            onClick={() => {
              runSingleTest(test.id);
            }}
            title={`Test ${test.string}`}
          >
            <BiTestTube />
          </button>
        </CoreListItem_Right>
      </CoreListItem>
    </div>
  ));

  const runSingleTest = (id: number) => {
    let results = tests.map((test) => {
      if (test.id === id) {
        let res = testStringOnAutomata(test.string);
        return res === "Accepted" ? test.expectedAccept : !test.expectedAccept;
      } else return testResults[test.id];
    });
    setTestResults(results);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setIsErrorVisible(true);
  };

  return (
    <>
      <FloatingPanel heightPolicy="min" style={{ width: "300px" }}>
        <div className="flow-root">
          <div className="float-left text-3xl mb-2">Tests</div>
          <input
            type="file"
            id="tests-file-uploader"
            ref={testsFileInputRef}
            style={{ display: "none" }}
            onChange={handleTestsFileUpload}
          />
          <button
            className="float-right"
            onClick={handleLoadTestsButtonClick}
            title="Upload Tests from JSON"
          >
            <span className="text-sky-500 dark:text-sky-200">Upload Tests</span>
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto">{displayTest}</div>
        <div className="flex flex-col">
          <button
            className="rounded-full p-2 m-1 bg-blue-600 dark:bg-blue-800 text-white text-center"
            onClick={handleRunAllTestsClick}
          >
            Run All Tests
          </button>
        </div>
      </FloatingPanel>
      {isErrorVisible && (
        <ErrorDialogBox onClose={handleErrorClose} message={errorMessage} />
      )}
    </>
  );
}
