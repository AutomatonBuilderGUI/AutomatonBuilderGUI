import StateManager from "./StateManager";
import { Tool } from "./Tool";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import NodeView from "./components/NodeView";
import Toolbox from "./components/Toolbox";
import FloatingPanel from "./components/FloatingPanel";
import SelectableObject from "./SelectableObject";
import DetailsBox from "./components/DetailsBox/DetailsBox";
import { ClosableModalWindow } from "./components/ModalWindow";
import ConfigureAutomatonWindow from "./components/ConfigureAutomatonWindow";
import { BsGearFill, BsMoonFill } from "react-icons/bs";
import TestStringWindow from "./components/TestStringWindow";
import InformationBox, {
  InformationBoxType,
} from "./components/InformationBox";
import {} from "./components/TestStringWindow";
import DetailsBox_ActionStackViewer from "./components/DetailsBox/DetailsBox_ActionStackViewer";
import { motion, AnimatePresence } from "framer-motion";
import AutomatonElementError from "../node_modules/automaton-kit/lib/errors/AutomatonElementError";
import NodeWrapper from "./NodeWrapper";
import { useActionStack } from "./utilities/ActionStackUtilities";
import { GrTest } from "react-icons/gr";
import TestCasesPanel from "./components/TestCasesPanel";
import SettingsWindow from "./components/SettingsWindow";
import { DarkModeContext } from "./DarkModeContext";

function App({ defaultDarkMode }: { defaultDarkMode: boolean }) {
  const [currentTool, setCurrentTool] = useState(Tool.States);
  const [selectedObjects, setSelectedObjects] = useState(
    new Array<SelectableObject>(),
  );
  const [startNode, setStartNode] = useState(StateManager.startNode);
  const [isLabelUnique, setIsLabelUnique] = useState(true);
  const [areTokensUnique, setAreTokensUnique] = useState(true);
  const [_, currentStackLocation] = useActionStack();
  const [testsPanelOpen, setTestsPanelOpen] = useState(false);

  // React state and open/close functions for the "Tests" panel
  const toggleTestsPanel = () => {
    setTestsPanelOpen(!testsPanelOpen);
  };

  // Adds the "confirm close" modal when attempting to close the page.
  // Solution from this stackoverflow page:
  // https://stackoverflow.com/a/52358522
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      //using on chrome may require return value to be set
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Switch current tool when keys pressed
  useEffect(() => {
    StateManager.setSelectedObjects = setSelectedObjects;
    addEventListener("keydown", (ev: KeyboardEvent) => {
      // Ignore keyboard shortcuts if user is in a text box.
      // Solution from https://stackoverflow.com/a/4575309
      const n = document.activeElement.nodeName;
      if (n == "TEXTAREA" || n == "INPUT") {
        return;
      }

      if (ev.code === "KeyA") {
        setCurrentTool(Tool.States);
      } else if (ev.code === "KeyT") {
        setCurrentTool(Tool.Transitions);
      } else if (ev.code === "KeyS") {
        setCurrentTool(Tool.Select);
      } else if (ev.code === "KeyR") {
        setCurrentTool(Tool.Comment);
      }
    });
  }, []);

  // When the user selects a different tool in the UI,
  // update the StateManager to use that as the current tool.
  useEffect(() => {
    StateManager.currentTool = currentTool;
  }, [currentTool]);

  // When the user changes their object selection, update the current
  // list of selected objects.
  useEffect(() => {
    StateManager.selectedObjects = selectedObjects;
  }, [selectedObjects]);

  // When the user changes the start node in the UI, push the action of
  // making that node the start node to the action stack.
  useEffect(() => {
    StateManager.setNodeIsStart(startNode);
  }, [startNode]);

  // When an error is detected in the DFA, highlight the associated nodes
  useEffect(() => {
    const dfa = StateManager.dfa;
    if (dfa) {
      // Get the list of errors from the DFA
      const errors = dfa.getErrors();
      // Create a set to keep track of nodes that have errors
      const errorNodes = new Set<NodeWrapper>();

      errors.forEach((error) => {
        if (error instanceof AutomatonElementError) {
          // Using getElement() method to retrieve the automaton element associated with the error
          const element = error.getElement();
          if (element.label) {
            const stateLabel = element.label;
            const node = StateManager.nodeWrappers.find(
              (node) => node.labelText === stateLabel,
            );
            if (node) {
              node.setErrorState(true);
              errorNodes.add(node);
            }
          }
        }
      });

      // Reset nodes that are not in error
      StateManager.nodeWrappers.forEach((node) => {
        if (!errorNodes.has(node)) {
          node.setErrorState(false);
        }
      });
    }
  }, [StateManager.nodeWrappers, StateManager.dfa]);

  // Check if there is a token with an empty symbol/label.
  const emptyStringToken = StateManager.alphabet.some(
    (token) => token.symbol.trim() === "",
  );

  // Keep track of if all state labels are unique, every time the
  // list of selected objects changes.
  useEffect(() => {
    const unique = StateManager.areAllLabelsUnique();
    setIsLabelUnique(unique);
  }, [selectedObjects]);

  // Keep track of if all tokens' labels are unique, every time the
  // list of selected objects changes.
  useEffect(() => {
    const unique = StateManager.areAllTokensUnique();
    setAreTokensUnique(unique);
  }, [StateManager.alphabet]);

  // React state and open/close functions for the "Settings" modal window.
  const [settingsWindowOpen, setSettingsWindowOpen] = useState(false);
  const openSettingsWindow = () => {
    setSettingsWindowOpen(true);
  };
  const closeSettingsWindow = () => {
    setSettingsWindowOpen(false);
  };

  // React state and open/close functions for the "Configure Automaton"
  // modal window.
  const [configWindowOpen, setConfigWindowOpen] = useState(false);
  const openConfigWindow = () => {
    setConfigWindowOpen(true);
  };
  const closeConfigWindow = () => {
    setConfigWindowOpen(false);
  };

  // React state and enable/disable functions for dark mode.
  const [useDarkMode, setDarkMode] = useState(defaultDarkMode);
  useEffect(() => {
    StateManager.useDarkMode = useDarkMode;
  }, [useDarkMode]);
  const darkModeToggle = {
    useDarkMode: useDarkMode,
    setDarkMode: (v: boolean) => {
      setDarkMode(v);
    },
  };

  // Create a DFA from the current state, and get the errors from it
  let dfa = StateManager.dfa;
  let dfaErrors = dfa.getErrors();

  // If the current stack location is changed, update the DFA and get errors again
  useEffect(() => {
    dfa = StateManager.dfa;
    dfaErrors = dfa.getErrors();
  }, [currentStackLocation]);

  let errorBoxes = dfaErrors.map((err) => {
    return (
      <div key={err.errorString()}>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <InformationBox infoBoxType={InformationBoxType.Error}>
            {err.errorString()}
          </InformationBox>
        </motion.div>
      </div>
    );
  });

  return (
    <div className={useDarkMode ? "dark" : ""}>
      <DarkModeContext.Provider value={darkModeToggle}>
        <NodeView />
        <div className="flex flex-row h-screen text-center">
          <div className="overflow-y-auto">
            <FloatingPanel heightPolicy="screen" style={{ width: "300px" }}>
              <DetailsBox
                selection={selectedObjects}
                startNode={startNode}
                setStartNode={setStartNode}
              />

              <div className="max-h-96 overflow-y-auto">
                <AnimatePresence>{errorBoxes}</AnimatePresence>
              </div>

              {/* Example error message boxes commented out */}
              {/*
                      <InformationBox infoBoxType={InformationBoxType.Error}>
                          State "q0" has multiple transitions for token "a"
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Error}>
                          State "q0" has no transition for token "b"
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Error}>
                          Transitions on empty string (ε) not allowed in DFA
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Error}>
                          Alphabet needs at least one token
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Error}>
                          Token "c" is repeated in alphabet
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Warning}>
                          State "q3" is inaccessible
                      </InformationBox>
                      <InformationBox infoBoxType={InformationBoxType.Warning}>
                          Accept state "q4" is inaccessible; automaton will always reject
                      </InformationBox>
                      */}

              <TestStringWindow />
              {!isLabelUnique && (
                <InformationBox infoBoxType={InformationBoxType.Error}>
                  Duplicate state labels detected. Each state must have a unique
                  label.
                </InformationBox>
              )}
              {!areTokensUnique && (
                <InformationBox infoBoxType={InformationBoxType.Error}>
                  Duplicate tokens detected. Each token must be a unique
                  character.
                </InformationBox>
              )}
              {emptyStringToken && (
                <InformationBox infoBoxType={InformationBoxType.Error}>
                  Invalid token: Empty string detected.
                </InformationBox>
              )}

              <div className="flex flex-col items-center mt-4">
                <button
                  className="rounded-full p-2 m-1 mx-2 block bg-amber-500 text-white text-center"
                  onClick={openSettingsWindow}
                >
                  <div className="flex flex-row items-center place-content-center mx-2">
                    <BsGearFill className="mr-1" />
                    Settings
                  </div>
                </button>
                <button
                  className="rounded-full p-2 m-1 mx-2 block bg-amber-500 text-white text-center"
                  onClick={openConfigWindow}
                >
                  <div className="flex flex-row items-center place-content-center mx-2">
                    <BsGearFill className="mr-1" />
                    Configure Automaton
                  </div>
                </button>
                <button
                  className="rounded-full p-2 m-1 mx-2 block bg-cyan-400 dark:bg-cyan-600 text-white text-center"
                  onClick={toggleTestsPanel}
                >
                  <div className="flex flex-row items-center place-content-center mx-2">
                    <GrTest className="mr-1" />
                    Tests
                  </div>
                </button>
              </div>
            </FloatingPanel>
            {testsPanelOpen && <TestCasesPanel />}
          </div>

          <FloatingPanel heightPolicy="screen">
            <Toolbox
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
            />
          </FloatingPanel>

          {/*Separates the left and right panels */}
          <div className="grow"></div>

          <FloatingPanel heightPolicy="screen" style={{ width: "250px" }}>
            <DetailsBox_ActionStackViewer />
          </FloatingPanel>
        </div>
        {
          <AnimatePresence>
            {configWindowOpen && (
              <motion.div>
                <ClosableModalWindow
                  title="Configure Automaton"
                  close={closeConfigWindow}
                >
                  <ConfigureAutomatonWindow />
                </ClosableModalWindow>
              </motion.div>
            )}
          </AnimatePresence>
        }
        {
          <AnimatePresence>
            {settingsWindowOpen && (
              <motion.div>
                <ClosableModalWindow
                  title="Settings"
                  close={closeSettingsWindow}
                >
                  <SettingsWindow />
                </ClosableModalWindow>
              </motion.div>
            )}
          </AnimatePresence>
        }
      </DarkModeContext.Provider>
    </div>
  );
}

// If the browser has storage available, and the user has saved their
// dark mode preference, then use that by default.
let defaultDarkMode = false;
if (StateManager.storageAvailable()) {
  if (localStorage.getItem("darkmode") == "true") {
    defaultDarkMode = true;
  }
}

const domNode = document.getElementById("react-root");
const root = createRoot(domNode);
root.render(<App defaultDarkMode={defaultDarkMode} />);
