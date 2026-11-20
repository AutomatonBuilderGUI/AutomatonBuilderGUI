import StateManager from "./StateManager";
import NodeWrapper from "../NodeWrapper";
import { PasteActionData, CutActionData } from "./StackableAction";
import UndoRedoManager, { Action } from "../UndoRedoManager";
import TransitionWrapper from "../TransitionWrapper";
import SelectableObject from "../SelectableObject";

let _clipboard: SelectableObject[] = [];

/** Returns the transitions whose source and destination are both in `nodes`. */
function transitionsBetween(nodes: NodeWrapper[]): TransitionWrapper[] {
  return StateManager.transitionWrappers.filter(
    (t) => nodes.includes(t.sourceNode) && nodes.includes(t.destNode),
  );
}

/** Copies the selected objects, including any transitions between selected nodes. */
export function copySelectedObjects() {
  const selectedNodes = StateManager.selectedObjects.filter(
    (obj): obj is NodeWrapper => obj instanceof NodeWrapper,
  );

  _clipboard = [...selectedNodes, ...transitionsBetween(selectedNodes)];
}

/** Pastes the copied objects, including transitions between pasted nodes. */
export function pasteClipboardObjects(
  offsetX: number = 20,
  offsetY: number = 20,
) {
  const clipboard = _clipboard;
  if (!clipboard.length) {
    console.warn("Clipboard is empty, nothing to paste.");
    return;
  }

  const pasteData = new PasteActionData();

  const nodeCount = clipboard.filter(
    (obj) => obj instanceof NodeWrapper,
  ).length;

  const performPasteForward = (data: PasteActionData) => {
    if (data.nodes.length === 0) {
      // First time performing paste, create nodes
      const nodeMap = new Map<string, NodeWrapper>();

      // Create new nodes and map them to the original nodes
      clipboard.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          const newNode = new NodeWrapper(`q${StateManager._nextStateId++}`);
          const position = obj.nodeGroup.position();
          newNode.createKonvaObjects(
            position.x + offsetX,
            position.y + offsetY,
          );
          newNode.labelText = obj.labelText;
          newNode.isAcceptNode = obj.isAcceptNode;
          StateManager.addNode(newNode);

          data.nodes.push(newNode);
          nodeMap.set(obj.id, newNode);
        }
      });

      // Create new transitions using the new nodes
      clipboard.forEach((obj) => {
        if (obj instanceof TransitionWrapper) {
          const sourceNode = nodeMap.get(obj.sourceNode.id);
          const destNode = nodeMap.get(obj.destNode.id);

          // Only create transitions if both source and dest nodes were copied
          if (sourceNode && destNode) {
            const newTransition = new TransitionWrapper(
              sourceNode,
              destNode,
              obj.isEpsilonTransition,
              new Set(obj.tokens),
            );
            StateManager.addStateTransition(newTransition);
            data.transitions.push(newTransition);
          }
        }
      });
    } else {
      // Redoing the paste action, reuse nodes and transitions
      data.nodes.forEach((node) => StateManager.addNode(node));
      data.transitions.forEach((t) => StateManager.addStateTransition(t));
    }

    StateManager.updateTransitions();
    StateManager.redraw();

    // Select the newly pasted nodes
    StateManager.deselectAllObjects();
    data.nodes.forEach((node) => StateManager.selectObject(node));
  };

  const performPasteBackward = (data: PasteActionData) => {
    StateManager.deselectAllObjects();

    data.transitions.forEach((t) => StateManager.detachTransition(t));
    data.nodes.forEach((node) => StateManager.detachNode(node));

    StateManager.updateTransitions();
    StateManager.redraw();
  };

  const actionDescription = `Paste ${nodeCount} Object${nodeCount !== 1 ? "s" : ""}`;
  const pasteAction = new Action(
    "pasteClipboardObjects",
    actionDescription,
    performPasteForward,
    performPasteBackward,
    pasteData,
  );

  UndoRedoManager.pushAction(pasteAction);
}

/** Cuts the selected objects, including any transitions between selected nodes. */
export function cutSelectedObjects() {
  const selected = StateManager.selectedObjects;
  if (selected.length === 0) {
    console.warn("No objects selected, nothing to cut.");
    return;
  }

  const selectedNodes = selected.filter(
    (obj): obj is NodeWrapper => obj instanceof NodeWrapper,
  );
  const selectedTransitions = selected.filter(
    (obj): obj is TransitionWrapper => obj instanceof TransitionWrapper,
  );
  const internalTransitions = transitionsBetween(selectedNodes);

  // Only nodes, selected transitions, and transitions fully inside the
  // selection go on the clipboard
  _clipboard = [
    ...selectedNodes,
    ...Array.from(new Set([...selectedTransitions, ...internalTransitions])),
  ];

  // Every transition touching a cut node must be removed (and restored on
  // undo), even ones leading to nodes that weren't selected. Otherwise
  // they'd be left pointing at a node that's no longer in the automaton.
  const transitionsToRemove = new Set<TransitionWrapper>(selectedTransitions);
  StateManager.transitionWrappers.forEach((t) => {
    if (selectedNodes.some((n) => t.involvesNode(n))) {
      transitionsToRemove.add(t);
    }
  });

  const cutData = new CutActionData();
  cutData.nodes = selectedNodes;
  cutData.transitions = Array.from(transitionsToRemove);

  // Remember exactly which node was the start node so undo restores that one
  const cutStartNode = selectedNodes.includes(StateManager.startNode)
    ? StateManager.startNode
    : null;
  cutData.wasStartNode = cutStartNode !== null;

  const totalObjects = cutData.nodes.length + cutData.transitions.length;
  const actionDescription = `Cut ${totalObjects} Object${totalObjects !== 1 ? "s" : ""}`;

  const performCutForward = (data: CutActionData) => {
    StateManager.deselectAllObjects();

    data.transitions.forEach((t) => StateManager.detachTransition(t));
    data.nodes.forEach((node) => StateManager.detachNode(node));

    StateManager.updateTransitions();
    StateManager.redraw();
  };

  const performCutBackward = (data: CutActionData) => {
    data.nodes.forEach((node) => StateManager.addNode(node));

    if (data.wasStartNode && StateManager.startNode == null) {
      StateManager.startNode = cutStartNode;
    }

    data.transitions.forEach((t) => StateManager.addStateTransition(t));

    StateManager.updateTransitions();
    StateManager.redraw();
  };

  const cutAction = new Action(
    "cutSelectedObjects",
    actionDescription,
    performCutForward,
    performCutBackward,
    cutData,
  );

  UndoRedoManager.pushAction(cutAction);
}
