import StateManager from "./StateManager";
import UndoRedoManager from "../UndoRedoManager";
import {
  copySelectedObjects,
  cutSelectedObjects,
  pasteClipboardObjects,
} from "./CopyPasteManager";

/**
 * Called when the user uses the mouse scroll wheel.
 * This causes the state diagram view to be zoomed in or out.
 * @param ev
 */
export function handleWheelEvent(ev: any) {
  ev.evt.preventDefault();
  const oldScale = StateManager.stage.scaleX();

  var pointer = StateManager.stage.getPointerPosition();

  var mousePointer = {
    x: (pointer.x - StateManager.stage.x()) / oldScale,
    y: (pointer.y - StateManager.stage.y()) / oldScale,
  };

  var newScale = ev.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
  StateManager.stage.scale({ x: newScale, y: newScale });

  var newPos = {
    x: pointer.x - mousePointer.x * newScale,
    y: pointer.y - mousePointer.y * newScale,
  };
  StateManager.stage.position(newPos);
  StateManager.stage.batchDraw();
  StateManager.drawGrid();
}

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
