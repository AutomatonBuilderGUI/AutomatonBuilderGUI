import Konva from "konva";
import TransitionWrapper from "../TransitionWrapper";
import { ChangeEvent } from "react";
import StateManager from "./StateManager";
import { SerializableAutomaton } from "./SearilizableInterfaces";
import TokenWrapper from "../TokenWrapper";
import NodeWrapper from "../NodeWrapper";
/** Everything the export needs from StateManager, supplied by the caller. */
export interface ExportContext {
  stage: Konva.Stage | null;
  gridLayer: Konva.Layer | null;
  nodeLayer: Konva.Layer | null;
  transitionLayer: Konva.Layer | null;
  transitions: TransitionWrapper[];
  bounds: { x: number; y: number; width: number; height: number };
  useDarkMode: boolean;
}

export function exportAutomatonToImage(ctx: ExportContext) {
  const { stage, gridLayer, nodeLayer, transitionLayer, bounds } = ctx;
  if (!stage || !gridLayer || !nodeLayer || !transitionLayer) {
    console.error("error: stage or layers are not initialized");
    return;
  }
  const originalScale = stage.scale();
  const originalPosition = stage.position();

  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();

  ctx.transitions.forEach((transition) => {
    transition.updatePoints();
    if (!transition.konvaGroup.getParent()) {
      transitionLayer.add(transition.konvaGroup);
    }
  });

  gridLayer.batchDraw();
  nodeLayer.batchDraw();
  transitionLayer.batchDraw();

  // Set background based on dark/light mode.
  const background: Konva.Rect = new Konva.Rect({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fill: ctx.useDarkMode ? "black" : "white",
    listening: false,
  });

  gridLayer.add(background);
  gridLayer.moveToBottom();
  gridLayer.batchDraw();

  const dataURL = stage.toDataURL({
    mimeType: "image/png",
    pixelRatio: 2,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });

  background.destroy();
  gridLayer.batchDraw();

  stage.scale(originalScale);
  stage.position(originalPosition);
  stage.batchDraw();

  const downloadLink = document.createElement("a");
  downloadLink.href = dataURL;
  downloadLink.download = "diagram.png";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Converts the current automaton to a JSON file, and downloads it to the
 * user's device.
 */
export function downloadJSON() {
  StateManager.makeClean();

  const jsonString = JSON.stringify(StateManager.toSerializable(), null, 4);

  // A hacky solution in my opinion, but apparently it works so hey.
  // Adapted from https://stackoverflow.com/a/18197341

  let el = document.createElement("a");
  el.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(jsonString),
  );
  el.setAttribute("download", "finite_automaton.json");
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

/**
 * Attempts to load an automaton JSON from a user's file.
 * @param ev
 */
export function uploadJSON(ev: ChangeEvent<HTMLInputElement>) {
  const file = ev.target.files.item(0);
  ev.target.value = null;

  const fileText = file.text().then(
    (text: string): any => {
      return JSON.parse(text);
    },
    (reject_reason: any): any => {
      console.error("could not get file text, reason was", reject_reason);
      return null;
    },
  );

  return fileText;
}

/**
 * Loads the data from a deserialized JSON automaton representation
 * into the program.
 * @param json The deserialized JSON object to load.
 */
export function loadAutomaton(json: SerializableAutomaton) {
  const { states, alphabet, transitions, startState, acceptStates } = json;

  StateManager.clearMachine();
  StateManager.makeClean();

  // Load each state
  states.forEach((state) => {
    const newState = new NodeWrapper(state.label, state.id);
    newState.createKonvaObjects(state.x, state.y);
    StateManager.addNode(newState);
  });

  acceptStates.forEach((state) => {
    const node = StateManager.findNodeById(state);
    if (node) {
      node.isAcceptNode = true;
    }
  });

  // Load the alphabet
  alphabet.forEach((tok) => {
    const newTok = new TokenWrapper(tok.symbol, tok.id);
    StateManager.pushAlphabetToken(newTok);
  });

  // Load transitions
  transitions.forEach((trans) => {
    const src = StateManager.findNodeById(trans.source);
    const dest = StateManager.findNodeById(trans.dest);
    const isEpsilonTransition = trans.isEpsilonTransition;
    const tokens = trans.tokens.map((tokID) =>
      StateManager.findTokenById(tokID),
    );
    const newTrans = new TransitionWrapper(
      src,
      dest,
      isEpsilonTransition,
      tokens,
    );

    StateManager.addStateTransition(newTrans);
  });

  // Load the start state
  const startNodeObj = StateManager.findNodeById(startState);
  if (!startNodeObj) {
    console.error("Start state not found!!");
  } else {
    StateManager.startNode = startNodeObj;
  }

  // Accept states are loaded at the same time as states themselves

  // Refresh canvas?

  StateManager.redraw();
}
