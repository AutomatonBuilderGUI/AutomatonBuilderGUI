import { useState, useEffect } from "react";
import UndoRedoManager, { Action } from "../Managers/UndoRedoManager";

/**
 * Returns the current stack and the current stack location. In most cases,
 * you'll only need the stack location.
 */
export function useActionStack(): [Array<Action>, number] {
  const [currentStack, setCurrentStack] = useState([]);
  const [currentStackLocation, setCurrentStackLocation] = useState(-1);

  useEffect(() => {
    function handleStackChanged() {
      let newStack = UndoRedoManager.getStack()
        .map((i) => i)
        .reverse();
      setCurrentStack(newStack);
      setCurrentStackLocation(UndoRedoManager.getStackLocation());
    }
    UndoRedoManager.startListeningOnStackChanged(handleStackChanged);
    return () => {
      UndoRedoManager.stopListeningOnStackChanged(handleStackChanged);
    };
  }, []);
  return [currentStack, currentStackLocation];
}
