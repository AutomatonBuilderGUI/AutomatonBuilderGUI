import StateManager from "./StateManager";
import UndoRedoManager from "../UndoRedoManager";
import {
  copySelectedObjects,
  cutSelectedObjects,
  pasteClipboardObjects,
} from "./CopyPasteManager";
/**
 * Handles keyboard input, for actions like undo/redo and deleting objects.
 */
export function onKeyDown(ev: KeyboardEvent) {
  //based on the ignore shortcuts implementation in index.tsx
  const n = document.activeElement.nodeName;
  if (n === "INPUT" || n === "TEXTAREA") {
    return;
  }

  if (ev.code === "Backspace" || ev.code === "Delete") {
    StateManager.deleteAllSelectedObjects();
    return;
  }

  // https://stackoverflow.com/a/77837006
  if (
    (ev.metaKey || ev.ctrlKey) &&
    ev.key == "z" &&
    !StateManager.debugEnabled
  ) {
    ev.preventDefault();

    if (ev.shiftKey) {
      UndoRedoManager.redo();
    } else {
      UndoRedoManager.undo();
    }
    return;
  }

  // **Handle Ctrl+C (Copy)**
  if (
    (ev.metaKey || ev.ctrlKey) &&
    ev.key === "c" &&
    !StateManager.debugEnabled
  ) {
    ev.preventDefault();
    copySelectedObjects();
    return;
  }

  // **Handle Ctrl+X (Cut)**
  if (
    (ev.metaKey || ev.ctrlKey) &&
    ev.key === "x" &&
    !StateManager.debugEnabled
  ) {
    ev.preventDefault();
    cutSelectedObjects();
    return;
  }
  // **Handle Ctrl+V (Paste)**
  if (
    (ev.metaKey || ev.ctrlKey) &&
    ev.key === "v" &&
    !StateManager.debugEnabled
  ) {
    ev.preventDefault();
    pasteClipboardObjects();
    return;
  }
}
