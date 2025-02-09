import NodeWrapper from "./NodeWrapper";
import { Tool } from "./Tool";
import Konva from "konva";
import TransitionWrapper from "./TransitionWrapper";
import SelectableObject from "./SelectableObject";
import TokenWrapper from "./TokenWrapper";
import { ChangeEvent } from "react";
import { LightColorScheme, DarkColorScheme } from "./ColorSchemes";
import DFA from "automaton-kit/lib/dfa/DFA";
import DFATransition from "automaton-kit/lib/dfa/DFATransition";
import DFAState from "automaton-kit/lib/dfa/DFAState";
import { convertIDtoLabelOrSymbol } from "./utilities/AutomatonUtilities";
import UndoRedoManager, { Action, ActionData } from "./UndoRedoManager";
import { Vector2d } from "konva/lib/types";

/**
 * The "engine" behind the Automaton Builder GUI. It handles a lot of the
 * program's functionality, and (as the name implies) holds the overall state
 * of the automaton itself.
 */
export default class StateManager {
  /**
   * The index of the next state to be created. States are named as q0, q1,
   * q2, etc by default, and this value keeps track of which number we're on.
   */
  static _nextStateId = 0;

  /** Returns the current start node for the automaton. */
  public static get startNode(): NodeWrapper | null {
    return StateManager._startNode;
  }
  private static _startNode: NodeWrapper | null = null;

  /** Holds all of the node wrappers in the automaton. */
  private static _nodeWrappers: Array<NodeWrapper> = [];

  /** Holds all of the transition wrappers in the automaton. */
  private static _transitionWrappers: Array<TransitionWrapper> = [];

  /** Holds all of the tokens in the automaton. */
  private static _alphabet: Array<TokenWrapper> = [];

  /** Holds all of the currently selected objects (nodes and transitions). */
  private static _selectedObjects: Array<SelectableObject> = [];

  /**
   * When the user is in the process of creating a transition, holds the
   * node that will be the transition's source.
   */
  private static _tentativeTransitionSource: NodeWrapper | null = null;

  /**
   * When the user is in the process of creating a transition, holds the
   * node that will be the transition's destination.
   */
  private static _tentativeTransitionTarget: NodeWrapper | null = null;

  /** Keeps track of the current tool being used by the user. */
  private static _currentTool: Tool = Tool.States;

  /** The stage, or canvas, where the state machine is drawn. */
  private static _stage: Konva.Stage | null = null;

  /** The arrow used to represent a transition being created by the user. */
  private static _tentConnectionLine: Konva.Arrow | null = null;

  /** The arrow used to represent the start node. */
  private static _startStateLine: Konva.Arrow | null = null;

  /** The layer of the Konva stage where nodes are drawn. */
  private static _nodeLayer: Konva.Layer | null = null;

  /** The layer of the Konva stage where transitions are drawn. */
  private static _transitionLayer: Konva.Layer | null = null;

  /** The layer of the Konva stage where the grid is drawn. */
  private static _gridLayer: Konva.Layer | null = null;

  /** A function to call when the selected objects are changed. */
  public static setSelectedObjects: React.Dispatch<
    React.SetStateAction<SelectableObject[]>
  > | null = null;

  /**
   * Whether or not the app is in dark mode. This should not be modified or
   * read from directly; instead, use `StateManager.useDarkMode`.
   */
  private static _useDarkMode: boolean = false;

  /** Whether or not to snap nodes to the grid. */
  private static _snapToGridEnabled: boolean = false;

  /** Keeps track of the current file to see if it has had changes without saves. */
  private static clean: boolean = true;

  /** Returns UI configuration information for the current color scheme. */
  public static get colorScheme() {
    if (this._useDarkMode) {
      return DarkColorScheme;
    } else {
      return LightColorScheme;
    }
  }

  private constructor() {}
  /** Marks the file as dirty. */
  public static makeDirty() {
    StateManager.clean = false;
  }
  /** Marks the file as clean. */
  public static makeClean() {
    StateManager.clean = true;
  }

  /** Returns the the curent clean state of the file */
  public static cleanState() {
    return StateManager.clean;
  }

  /** Toggles whether or not nodes snap to the grid. */
  public static toggleSnapToGrid() {
    StateManager._snapToGridEnabled = !StateManager._snapToGridEnabled;
  }

  /** Returns whether or not nodes snap to the grid. */
  public static get snapToGridEnabled(): boolean {
    return StateManager._snapToGridEnabled;
  }

  /** Returns whether or not nodes snap to the grid. */
  public static set snapToGridEnabled(newValue: boolean) {
    StateManager._snapToGridEnabled = newValue;
  }

  /** Stores the currently copied or cut selectable objects for clipboard operations. */
  private static _clipboard: Array<SelectableObject> = [];

  /** Sets up the state manager and an empty automaton. */
  public static initialize() {
    this._startNode = null;
    this._nodeWrappers = [];
    this._transitionWrappers = [];

    Konva.hitOnDragEnabled = true;

    this._stage = new Konva.Stage({
      container: "graphics-container",
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: true,
    });
    this._stage.on("dblclick", (ev) =>
      StateManager.onDoubleClick.call(this, ev),
    );
    this._stage.on("click", (ev) => StateManager.onClick.call(this, ev));
    this._stage.on("wheel", StateManager.handleWheelEvent);
    this._stage.on("dragmove", StateManager.onDragMove);

    this._nodeLayer = new Konva.Layer();
    this._transitionLayer = new Konva.Layer();
    this._gridLayer = new Konva.Layer();
    this._stage.add(this._gridLayer);
    this.drawGrid(); // Draw the initial grid

    this._tentConnectionLine = new Konva.Arrow({
      x: 0,
      y: 0,
      points: [0, 0, 20, 40],
      stroke: "red",
      fill: "red",
      strokeWidth: 5,
      lineJoin: "round",
      dash: [20, 20],
      pointerLength: 10,
      pointerWidth: 10,
      visible: false,
    });
    this._transitionLayer.add(this._tentConnectionLine);

    this._startStateLine = new Konva.Arrow({
      x: 0,
      y: 0,
      points: [
        -100,
        0,
        0 -
          NodeWrapper.NodeRadius -
          TransitionWrapper.ExtraTransitionArrowPadding,
        0,
      ],
      stroke: "black",
      fill: "black",
      strokeWidth: 5,
      lineJoin: "round",
      pointerLength: 10,
      pointerWidth: 10,
      visible: false,
    });
    this._transitionLayer.add(this._startStateLine);

    this._stage.add(this._transitionLayer);
    this._stage.add(this._nodeLayer);

    addEventListener("keydown", this.onKeyDown);
    addEventListener("resize", this.handleResize);
    StateManager.makeClean();
  }

  /** Gets the array of transitions for the automaton. */
  public static get transitions(): Array<TransitionWrapper> {
    return StateManager._transitionWrappers;
  }

  /**
   * Handles resizing the canvas when the window is resized using an event
   * listener.
   */
  private static handleResize() {
    if (StateManager._stage) {
      StateManager._stage.width(window.innerWidth);
      StateManager._stage.height(window.innerHeight);

      const gridLayer = StateManager._stage.findOne(".gridLayer");
      if (gridLayer) {
        gridLayer.destroy();
      }
      StateManager.drawGrid();

      StateManager._stage.draw();
    }
  }

  /**
   * Gets the current position of the stage (panning the view is, technically,
   * dragging the entire stage around).
   */
  public static getStagePosition(): { x: number; y: number } {
    return this._stage
      ? { x: this._stage.x(), y: this._stage.y() }
      : { x: 0, y: 0 };
  }

  /**
   * Gets the current scale of the stage (zooming the view is, technically,
   * scaling the entire stage).
   */
  public static getStageScale(): { scaleX: number; scaleY: number } {
    if (this._stage) {
      return { scaleX: this._stage.scaleX(), scaleY: this._stage.scaleY() };
    }
    // Default scale is 1 if the stage is not initialized
    return { scaleX: 1, scaleY: 1 };
  }

  /** Draws the grid. */
  public static drawGrid() {
    if (!StateManager._gridLayer || !StateManager._stage) {
      console.error("Grid layer or stage is not initialized.");
      return;
    }

    // Clear any previous grid lines
    StateManager._gridLayer.destroyChildren();

    const gridCellSize = 50; // Size of each cell in the grid
    const scale = StateManager._stage.scaleX(); // Current scale of the stage
    const stageWidth = StateManager._stage.width() / scale; // Visible width
    const stageHeight = StateManager._stage.height() / scale; // Visible height
    const stagePos = StateManager._stage.position(); // Current position of the stage

    // Adjust the start positions to account for stage position
    const startX =
      -1 * (Math.round(stagePos.x / scale / gridCellSize) * gridCellSize);
    const startY =
      -1 * (Math.round(stagePos.y / scale / gridCellSize) * gridCellSize);

    // Calculate the number of lines needed based on the stage size and scale
    const linesX = Math.ceil(stageWidth / gridCellSize) + 2; // Extra lines to fill the space during drag
    const linesY = Math.ceil(stageHeight / gridCellSize) + 2; // Extra lines to fill the space during drag

    // Create vertical lines
    for (let i = 0; i < linesX; i++) {
      let posX = startX + i * gridCellSize;
      StateManager._gridLayer.add(
        new Konva.Line({
          points: [posX, startY, posX, startY + linesY * gridCellSize],
          stroke: this.colorScheme.gridColor,
          strokeWidth: 1,
          listening: false,
        }),
      );
    }

    // Create horizontal lines
    for (let j = 0; j < linesY; j++) {
      let posY = startY + j * gridCellSize;
      StateManager._gridLayer.add(
        new Konva.Line({
          points: [startX, posY, startX + linesX * gridCellSize, posY],
          stroke: this.colorScheme.gridColor,
          strokeWidth: 1,
          listening: false,
        }),
      );
    }
    // Draw the grid
    StateManager._gridLayer.batchDraw();
  }

  //diagram bounds to know which exact part of the canvas to export
  private static getDiagramBounds(
    leftPadding: number = 150,
    bottomPadding: number = 150,
    rightPadding: number = 150,
    topPadding: number = 150,
  ) {
    if (
      !StateManager._nodeWrappers.length &&
      !StateManager._transitionWrappers.length
    ) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    StateManager._nodeWrappers.forEach((node) => {
      const { x, y } = node.nodeGroup.position();
      const radius = NodeWrapper.NodeRadius;
      minX = Math.min(minX, x - radius);
      minY = Math.min(minY, y - radius);
      maxX = Math.max(maxX, x + radius);
      maxY = Math.max(maxY, y + radius);
    });

    minX -= leftPadding;
    minY -= bottomPadding;
    maxX += rightPadding;
    maxY += topPadding;
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  public static exportAutomatonToImage() {
    if (!StateManager._stage) {
      console.error("error: _stage is not initialized");
      return;
    }
    const originalScale = StateManager._stage.scale();
    const originalPosition = StateManager._stage.position();

    StateManager._stage.scale({ x: 1, y: 1 });
    StateManager._stage.position({ x: 0, y: 0 });
    StateManager._stage.batchDraw();

    StateManager.transitions.forEach((transition) => {
      transition.updatePoints();
      if (!transition.konvaGroup.getParent()) {
        StateManager._transitionLayer.add(transition.konvaGroup);
      }
    });

    StateManager._gridLayer.batchDraw();
    StateManager._nodeLayer.batchDraw();
    StateManager._transitionLayer.batchDraw();

    const bounds = StateManager.getDiagramBounds();

    //add temporary white background
    const background = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      fill: "white",
      listening: false,
    });
    StateManager._gridLayer.add(background);
    StateManager._gridLayer.moveToBottom();
    StateManager._gridLayer.batchDraw();

    const dataURL = StateManager._stage.toDataURL({
      mimeType: "image/png",
      pixelRatio: 2,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });

    background.destroy();
    StateManager._gridLayer.batchDraw();

    StateManager._stage.scale(originalScale);
    StateManager._stage.position(originalPosition);
    StateManager._stage.batchDraw();

    const downloadLink = document.createElement("a");
    downloadLink.href = dataURL;
    downloadLink.download = "diagram.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  /** Gets the current tool. */
  public static get currentTool() {
    return StateManager._currentTool;
  }

  /** Sets the current tool. */
  public static set currentTool(tool: Tool) {
    StateManager._currentTool = tool;
  }

  /** Called when the user pans the view. */
  private static onDragMove(evt: Konva.KonvaEventObject<MouseEvent>) {
    StateManager.drawGrid();
  }

  /** Called when the user clicks on the background. */
  private static onClick(evt: Konva.KonvaEventObject<MouseEvent>) {
    let thingUnderMouse = StateManager._stage.getIntersection(
      StateManager._stage.getPointerPosition(),
    );
    if (!thingUnderMouse) {
      StateManager.deselectAllObjects();
    }
  }

  /**
   * Called when the user double-clicks on the view. When the user is using
   * the State tool, this adds a new node at the cursor's position.
   */
  private static onDoubleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool == Tool.States) {
      StateManager.addStateAtDoubleClickPos(evt);
    }
  }

  /**
   * Pushes an action to the action stack that adds a node to the automaton.
   */
  private static addStateAtDoubleClickPos(
    evt: Konva.KonvaEventObject<MouseEvent>,
  ) {
    if (!StateManager._stage) return;

    const stage = StateManager._stage;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    // Convert the pointer position to the stage's coordinate space
    const scale = stage.scaleX(); // Assuming uniform scaling for X and Y
    const stagePos = stage.position();

    // Adjusting for the stage's position and scale
    let x = (pointerPosition.x - stagePos.x) / scale;
    let y = (pointerPosition.y - stagePos.y) / scale;

    // Snap to grid if enabled
    if (StateManager._snapToGridEnabled) {
      const gridSpacing = 50; // Define your grid spacing value here

      // No need to normalize the coordinates here since they're already in "stage space"
      x = Math.round(x / gridSpacing) * gridSpacing;
      y = Math.round(y / gridSpacing) * gridSpacing;
    }

    let highestNumber = 0;
    StateManager._nodeWrappers.forEach((node) => {
      const match = node.labelText.match(/^q(\d+)$/);
      if (match === null) return;
      const num = parseInt(match[1]);
      if (num >= highestNumber) {
        StateManager._nextStateId = num + 1;
        highestNumber = num + 1;
      }
    });
    let newStateWrapperName = `q${StateManager._nextStateId}`;

    const newStateWrapper = new NodeWrapper(newStateWrapperName);
    let addNodeForward = (data: CreateNodeActionData) => {
      newStateWrapper.createKonvaObjects(data.x, data.y);
      StateManager._nodeWrappers.push(newStateWrapper);
      StateManager._nodeLayer?.add(newStateWrapper.nodeGroup);

      if (StateManager._startNode === null) {
        StateManager.startNode = newStateWrapper;
      }

      StateManager._nodeLayer?.draw();

      data.node = newStateWrapper;
    };

    let addNodeBackward = (data: CreateNodeActionData) => {
      this.deleteNode(data.node);
    };

    let addNodeAction = new Action(
      "addNode",
      `Add "${newStateWrapperName}"`,
      addNodeForward,
      addNodeBackward,
      { x: x, y: y, node: null },
    );
    UndoRedoManager.pushAction(addNodeAction);
  }

  /**
   * Pushes an action to the action stack that removes the given node from
   * the automaton.
   * @param node The node to remove.
   */
  public static removeNode(node: NodeWrapper) {
    // Find all transitions involving this node, save those
    let transitionsInvolvingThisNode = new Set(
      this._transitionWrappers.filter((i) => i.involvesNode(node)),
    );

    // Save this node's start state status
    let isStart = StateManager.startNode === node;

    let removeNodeForward = (data: RemoveNodeActionData) => {
      // Remove all transitions involving this node from the current state machine
      StateManager._transitionWrappers =
        StateManager._transitionWrappers.filter((transition) => {
          return !transitionsInvolvingThisNode.has(transition);
        });

      data.transitions.forEach((transition) => {
        transition.deselect();
        transition.konvaGroup.remove();
      });

      StateManager.updateTransitions();

      // Disable the node's selected appearance
      data.node.deselect();

      // Remove the node itself
      StateManager._nodeWrappers = StateManager._nodeWrappers.filter(
        (toDelete) => {
          return node !== toDelete;
        },
      );
      data.node.nodeGroup.remove();

      // Clear start state, if this node was the start state
      if (data.isStart) {
        StateManager.startNode = null;
      }
    };

    let removeNodeBackward = (data: RemoveNodeActionData) => {
      // Add the node itself
      StateManager._nodeWrappers.push(data.node);

      // Create Konva objects
      StateManager._nodeLayer.add(data.node.nodeGroup);

      // Set state start
      if (data.isStart) {
        StateManager.startNode = data.node;
      }

      // Add all transitions involving this node to the current state machine
      data.transitions.forEach((transition) => {
        StateManager._transitionWrappers.push(transition);
        StateManager._transitionLayer.add(transition.konvaGroup);
      });
      StateManager.updateTransitions();
    };
    let removeNodeAction = new Action(
      "removeNode",
      `Delete Node "${node.labelText}"`,
      removeNodeForward,
      removeNodeBackward,
      {
        node: node,
        transitions: transitionsInvolvingThisNode,
        isStart: isStart,
      },
    );
    UndoRedoManager.pushAction(removeNodeAction);
  }

  /**
   * Pushes an action to the action stack that renames the given node.
   * @param node The node to rename.
   * @param newName The new name to give to the node.
   */
  public static setNodeName(node: NodeWrapper, newName: string) {
    let oldName = node.labelText;

    let setNodeNameForward = (data: SetNodeNameActionData) => {
      data.node.labelText = data.newName;
    };

    let setNodeNameBackward = (data: SetNodeNameActionData) => {
      data.node.labelText = data.oldName;
    };
    let setNodeNameAction = new Action(
      "setNodeName",
      `Rename "${oldName}" To "${newName}"`,
      setNodeNameForward,
      setNodeNameBackward,
      { oldName: oldName, newName: newName, node: node },
    );
    UndoRedoManager.pushAction(setNodeNameAction);
  }

  /**
   * Pushes an action to the action stack that sets the accept status of the
   * given node.
   * @param node The node to set the accept status of.
   * @param isAccept Whether or not the given node should be an accepting node.
   */
  public static setNodeIsAccept(node: NodeWrapper, isAccept: boolean) {
    let oldValue = node.isAcceptNode;

    let setNodeIsAcceptForward = (data: SetNodeIsAcceptActionData) => {
      data.node.isAcceptNode = data.newValue;
    };

    let setNodeIsAcceptBackward = (data: SetNodeIsAcceptActionData) => {
      data.node.isAcceptNode = data.oldValue;
    };
    let setNodeIsAcceptAction = new Action(
      "setNodeIsAccept",
      `Mark "${node.labelText}" as ${isAccept ? "Accepting" : "Rejecting"}`,
      setNodeIsAcceptForward,
      setNodeIsAcceptBackward,
      { oldValue: oldValue, newValue: isAccept, node: node },
    );
    UndoRedoManager.pushAction(setNodeIsAcceptAction);
  }

  /**
   * Pushes an action to the action stack that sets the given node to be the
   * automaton's start node.
   * @param node The node to set as the start node.
   */
  public static setNodeIsStart(node: NodeWrapper) {
    let oldStart = StateManager._startNode;

    let setNodeIsStartForward = (data: SetNodeIsStartActionData) => {
      StateManager.startNode = data.newStart;
    };

    let setNodeIsStartBackward = (data: SetNodeIsStartActionData) => {
      StateManager.startNode = data.oldStart;
    };
    let setNodeIsStartAction = new Action(
      "setNodeIsStart",
      `Set "${node?.labelText ?? "none"}" As Initial Node`,
      setNodeIsStartForward,
      setNodeIsStartBackward,
      { oldStart: oldStart, newStart: node },
    );
    UndoRedoManager.pushAction(setNodeIsStartAction);
    // Makes it clean to start after the inital node.
    StateManager.makeClean();
  }

  /** Sets the automaton's start node.
   *
   * **NOTE:** This function is *not* undo/redo safe! In most cases, if you
   * want to set the accept status of a node, you should use the
   * `StateManager.setNodeIsStart` method instead.
   */
  public static set startNode(node: NodeWrapper | null) {
    if (StateManager._startNode) {
      StateManager._startNode.nodeGroup.off("move.startstate");
    }
    StateManager._startNode = node;

    if (node) {
      node.nodeGroup.on("move.startstate", (ev) =>
        StateManager.updateStartNodePosition(),
      );
      StateManager.updateStartNodePosition();
      StateManager._startStateLine.visible(true);
    } else {
      StateManager._startStateLine.visible(false);
    }
  }

  /**
   * Updates the position of the start node arrow to align with the
   * automaton's start node.
   */
  public static updateStartNodePosition() {
    StateManager._startStateLine.absolutePosition(
      StateManager._startNode.nodeGroup.absolutePosition(),
    );
  }

  /**
   * Handles keyboard input, for actions like undo/redo and deleting objects.
   */
  private static onKeyDown(ev: KeyboardEvent) {
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
    if ((ev.metaKey || ev.ctrlKey) && ev.key == "z") {
      ev.preventDefault();

      if (ev.shiftKey) {
        UndoRedoManager.redo();
      } else {
        UndoRedoManager.undo();
      }
      return;
    }

    // **Handle Ctrl+C (Copy)**
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "c") {
      ev.preventDefault();
      StateManager.copySelectedObjects();
      return;
    }

    // **Handle Ctrl+X (Cut)**
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "x") {
      ev.preventDefault();
      StateManager.cutSelectedObjects();
      return;
    }
    // **Handle Ctrl+V (Paste)**
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "v") {
      ev.preventDefault();
      StateManager.pasteClipboardObjects();
      return;
    }
  }

  /** Copies the selected objects, including any transitions between selected nodes. */
  public static copySelectedObjects() {
    // Copy selected nodes
    const selectedNodes = this._selectedObjects.filter(
      (obj) => obj instanceof NodeWrapper,
    ) as NodeWrapper[];

    // Find transitions between selected nodes
    const transitionsBetweenSelectedNodes = this._transitionWrappers.filter(
      (transition) =>
        selectedNodes.includes(transition.sourceNode) &&
        selectedNodes.includes(transition.destNode),
    );

    // Combine selected nodes and transitions between them
    this._clipboard = [...selectedNodes, ...transitionsBetweenSelectedNodes];
  }

  /** Pastes the copied objects, including transitions between pasted nodes. */
  public static pasteClipboardObjects(
    offsetX: number = 20,
    offsetY: number = 20,
  ) {
    if (!this._clipboard.length) {
      console.warn("Clipboard is empty, nothing to paste.");
      return;
    }

    let pasteData = new PasteActionData();

    // Count the number of nodes to be pasted for action description
    let nodeCount = this._clipboard.filter(
      (obj) => obj instanceof NodeWrapper,
    ).length;
    let actionDescription = `Paste ${nodeCount} Object${nodeCount !== 1 ? "s" : ""}`;

    let performPasteForward = (data: PasteActionData) => {
      if (data.nodes.length === 0) {
        // First time performing paste, create nodes
        const nodeMap = new Map<string, NodeWrapper>();

        // Create new nodes and map them to the original nodes
        this._clipboard.forEach((obj) => {
          if (obj instanceof NodeWrapper) {
            const newNode = new NodeWrapper(`q${StateManager._nextStateId++}`);
            const position = obj.nodeGroup.position();
            newNode.createKonvaObjects(
              position.x + offsetX,
              position.y + offsetY,
            );
            newNode.labelText = obj.labelText; // Copy label
            newNode.isAcceptNode = obj.isAcceptNode; // Copy accept state status
            StateManager._nodeWrappers.push(newNode);
            StateManager._nodeLayer.add(newNode.nodeGroup);

            data.nodes.push(newNode);
            nodeMap.set(obj.id, newNode);
          }
        });

        // Create new transitions using the new nodes
        this._clipboard.forEach((obj) => {
          if (obj instanceof TransitionWrapper) {
            const sourceNode = nodeMap.get(obj.sourceNode.id);
            const destNode = nodeMap.get(obj.destNode.id);

            // Only create transitions if both source and dest nodes were copied
            if (sourceNode && destNode) {
              const newTransition = new TransitionWrapper(
                sourceNode,
                destNode,
                obj.isEpsilonTransition,
                new Set(obj.tokens), // Copy tokens
              );

              StateManager._transitionWrappers.push(newTransition);
              StateManager._transitionLayer.add(newTransition.konvaGroup);

              data.transitions.push(newTransition);
            }
          }
        });
      } else {
        // Redoing the paste action, reuse nodes and transitions
        data.nodes.forEach((node) => {
          StateManager._nodeWrappers.push(node);
          StateManager._nodeLayer.add(node.nodeGroup);
        });

        data.transitions.forEach((transition) => {
          StateManager._transitionWrappers.push(transition);
          StateManager._transitionLayer.add(transition.konvaGroup);
        });
      }

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();

      // Select the newly pasted nodes
      StateManager.deselectAllObjects();
      data.nodes.forEach((node) => StateManager.selectObject(node));
    };

    let performPasteBackward = (data: PasteActionData) => {
      // Deselect all objects
      StateManager.deselectAllObjects();

      // Remove transitions
      data.transitions.forEach((transition) => {
        StateManager._transitionWrappers =
          StateManager._transitionWrappers.filter((t) => t !== transition);
        transition.konvaGroup.remove();
      });

      // Remove nodes
      data.nodes.forEach((node) => {
        StateManager._nodeWrappers = StateManager._nodeWrappers.filter(
          (n) => n !== node,
        );
        node.nodeGroup.remove();

        // If any of the nodes were the start node, reset the start node
        if (StateManager.startNode === node) {
          StateManager.startNode = null;
        }
      });

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();
    };
    let pasteAction = new Action(
      "pasteClipboardObjects",
      actionDescription,
      performPasteForward,
      performPasteBackward,
      pasteData,
    );

    UndoRedoManager.pushAction(pasteAction);
  }

  /** Cuts the selected objects, including any transitions between selected nodes. */
  public static cutSelectedObjects() {
    if (this._selectedObjects.length === 0) {
      console.warn("No objects selected, nothing to cut.");
      return;
    }

    // Copy selected nodes
    const selectedNodes = this._selectedObjects.filter(
      (obj) => obj instanceof NodeWrapper,
    ) as NodeWrapper[];

    // Find transitions between selected nodes
    const transitionsBetweenSelectedNodes = this._transitionWrappers.filter(
      (transition) =>
        selectedNodes.includes(transition.sourceNode) &&
        selectedNodes.includes(transition.destNode),
    );

    // Copy selected transitions
    const selectedTransitions = this._selectedObjects.filter(
      (obj) => obj instanceof TransitionWrapper,
    ) as TransitionWrapper[];

    // Combine selected nodes and transitions
    this._clipboard = [
      ...selectedNodes,
      ...selectedTransitions,
      ...transitionsBetweenSelectedNodes,
    ];

    // Create an action to remove the selected objects
    let cutData = new CutActionData();

    cutData.nodes = selectedNodes;
    cutData.transitions = [
      ...selectedTransitions,
      ...transitionsBetweenSelectedNodes,
    ];

    // Save start node if it's being cut
    cutData.wasStartNode = cutData.nodes.includes(StateManager.startNode);

    let totalObjects = cutData.nodes.length + cutData.transitions.length;
    let actionDescription = `Cut ${totalObjects} Object${totalObjects !== 1 ? "s" : ""}`;

    let performCutForward = (data: CutActionData) => {
      // Remove transitions
      data.transitions.forEach((transition) => {
        StateManager._transitionWrappers =
          StateManager._transitionWrappers.filter((t) => t !== transition);
        transition.konvaGroup.remove();
      });

      // Remove nodes
      data.nodes.forEach((node) => {
        StateManager._nodeWrappers = StateManager._nodeWrappers.filter(
          (n) => n !== node,
        );
        node.nodeGroup.remove();

        // Reset start node if necessary
        if (StateManager.startNode === node) {
          StateManager.startNode = null;
        }
      });

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();

      // Deselect all objects
      StateManager.deselectAllObjects();
    };

    let performCutBackward = (data: CutActionData) => {
      // Add nodes back
      data.nodes.forEach((node) => {
        StateManager._nodeWrappers.push(node);
        StateManager._nodeLayer.add(node.nodeGroup);

        // Restore start node if necessary
        if (data.wasStartNode && StateManager.startNode == null) {
          StateManager.startNode = node;
        }
      });

      // Add transitions back
      data.transitions.forEach((transition) => {
        StateManager._transitionWrappers.push(transition);
        StateManager._transitionLayer.add(transition.konvaGroup);
      });

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();
    };

    let cutAction = new Action(
      "cutSelectedObjects",
      actionDescription,
      performCutForward,
      performCutBackward,
      cutData,
    );

    UndoRedoManager.pushAction(cutAction);

    StateManager.deselectAllObjects();
  }

  /**
   * Starts the creation of a new transition from a given source node.
   * @param sourceNode The node being dragged from, which will become the
   * source node in this transition if it is completed.
   */
  public static startTentativeTransition(sourceNode: NodeWrapper) {
    StateManager._tentativeTransitionSource = sourceNode;
    StateManager._tentConnectionLine.visible(true);
    StateManager._tentConnectionLine.setAbsolutePosition(
      sourceNode.nodeGroup.absolutePosition(),
    );
  }

  /**
   * Changes the position of the tentative transition arrow head. If the
   * cursor is not currently over a node, the head will follow the cursor
   * directly. If the cursor is currently over a node, the head will point
   * to the node as if it was connected.
   * @param x The X coordinate of the cursor, where the tentative transition
   * head should point.
   * @param y The Y coordinate of the cursor, where the tentative transition
   * head should point.
   */
  public static updateTentativeTransitionHead(x: number, y: number) {
    if (
      !StateManager._stage ||
      !StateManager._tentativeTransitionSource ||
      !StateManager._tentConnectionLine
    )
      return;

    // Get the current scale of the stage
    const scale = StateManager._stage.scaleX();

    // Get the source node's absolute position
    let srcPos =
      StateManager._tentativeTransitionSource.nodeGroup.absolutePosition();

    if (StateManager.tentativeTransitionTarget === null) {
      // Calculate the delta, taking the scale into account
      let xDelta = (x - srcPos.x) / scale;
      let yDelta = (y - srcPos.y) / scale;

      // Update the points for the tentative transition line
      StateManager._tentConnectionLine.points([0, 0, xDelta, yDelta]);
    } else {
      let dstPos =
        StateManager.tentativeTransitionTarget.nodeGroup.absolutePosition();

      let xDestRelativeToSrc = (dstPos.x - srcPos.x) / scale;
      let yDestRelativeToSrc = (dstPos.y - srcPos.y) / scale;

      let magnitude = Math.sqrt(
        xDestRelativeToSrc * xDestRelativeToSrc +
          yDestRelativeToSrc * yDestRelativeToSrc,
      );

      let newMag =
        NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding;
      let xUnitTowardsSrc = (xDestRelativeToSrc / magnitude) * newMag;
      let yUnitTowardsSrc = (yDestRelativeToSrc / magnitude) * newMag;

      // Update the arrow points to end just before the target node, adjusted for scale
      StateManager._tentConnectionLine.points([
        0,
        0,
        xDestRelativeToSrc - xUnitTowardsSrc,
        yDestRelativeToSrc - yUnitTowardsSrc,
      ]);
    }
  }

  /**
   * Called when the user ends a tentative transition by releasing the mouse
   * button.
   * - If they were not hovering over a node, then the tentative
   * transition is simply discarded.
   * - If they were hovering over a node, and no transition previously existed
   * between the two nodes, then such a new transition is created.
   * - If they were hovering over a node that was already connected to the
   * source node, then the existing transition is selected.
   */
  public static endTentativeTransition() {
    if (
      StateManager._tentativeTransitionSource !== null &&
      StateManager.tentativeTransitionTarget !== null
    ) {
      const existingTransition = StateManager.transitions.find(
        (t) =>
          t.sourceNode.id === StateManager._tentativeTransitionSource.id &&
          t.destNode.id === StateManager.tentativeTransitionTarget.id,
      );
      if (existingTransition) {
        StateManager.deselectAllObjects();
        StateManager.selectObject(existingTransition);
      } else {
        StateManager.addTransition(
          StateManager._tentativeTransitionSource,
          StateManager._tentativeTransitionTarget,
        );
      }
    }

    StateManager._tentativeTransitionSource?.disableShadowEffects();
    StateManager._tentativeTransitionTarget?.disableShadowEffects();

    StateManager._tentativeTransitionSource = null;
    StateManager._tentativeTransitionTarget = null;
    StateManager._tentConnectionLine.visible(false);
  }

  /**
   * Pushes an action to the action stack that adds a new transition with
   * the given source and destination nodes.
   * @param source The source node for this transition.
   * @param dest The destination node for this transition.
   */
  public static addTransition(source: NodeWrapper, dest: NodeWrapper) {
    const newTransition = new TransitionWrapper(source, dest);

    let addTransitionForward = (data: AddTransitionActionData) => {
      StateManager._transitionWrappers.push(data.transition);
      StateManager._transitionLayer.add(data.transition.konvaGroup);
      StateManager.updateTransitions();
    };

    let addTransitionBackward = (data: AddTransitionActionData) => {
      StateManager._transitionWrappers =
        StateManager._transitionWrappers.filter((i) => i !== data.transition);
      data.transition.konvaGroup.remove();
      StateManager.updateTransitions();
    };

    let addTransitionAction = new Action(
      "addTransition",
      `Add Transition from "${source.labelText}" to "${dest.labelText}"`,
      addTransitionForward,
      addTransitionBackward,
      { transition: newTransition },
    );
    UndoRedoManager.pushAction(addTransitionAction);
  }

  /**
   * Pushes an action to the action stack that removes the given transition
   * from the automaton.
   * @param transition The transition to remove.
   */
  public static removeTransition(transition: TransitionWrapper) {
    let removeTransitionForward = (data: RemoveTransitionActionData) => {
      StateManager._transitionWrappers =
        StateManager._transitionWrappers.filter(
          (otherTransition) => otherTransition !== data.transition,
        );

      data.transition.deselect();
      data.transition.konvaGroup.remove();
      StateManager.updateTransitions();
    };

    let removeTransitionBackward = (data: RemoveTransitionActionData) => {
      StateManager._transitionWrappers.push(data.transition);

      StateManager._transitionLayer.add(data.transition.konvaGroup);
      StateManager.updateTransitions();
    };

    let removeTransitionAction = new Action(
      "removeTransition",
      `Remove Transition "${transition.sourceNode.labelText}" to "${transition.destNode.labelText}"`,
      removeTransitionForward,
      removeTransitionBackward,
      { transition: transition },
    );
    UndoRedoManager.pushAction(removeTransitionAction);
  }

  /**
   * Pushes an action to the action stack that adds a new token with an
   * empty symbol to the automaton.
   */
  public static addToken() {
    // TODO: logic for removing tokens needs to be modified - right now
    // it looks like it does some checks that we may no longer want, now
    // that we have undo/redo!
    const newToken = new TokenWrapper();
    let addTokenForward = (data: AddTokenActionData) => {
      StateManager._alphabet.push(data.token);
    };
    let addTokenBackward = (data: AddTokenActionData) => {
      StateManager._alphabet = StateManager._alphabet.filter(
        (i) => i !== data.token,
      );
    };

    let addTokenAction = new Action(
      "addToken",
      "Add Token",
      addTokenForward,
      addTokenBackward,
      { token: newToken },
    );
    UndoRedoManager.pushAction(addTokenAction);
  }

  /**
   * Pushes an action to the action stack that removes the given token from
   * the automaton.
   * @param token The token to remove.
   */
  public static removeToken(token: TokenWrapper) {
    let transitionsUsingToken = StateManager._transitionWrappers.filter(
      (trans) => trans.hasToken(token),
    );

    let removeTokenForward = (data: RemoveTokenActionData) => {
      StateManager._alphabet = StateManager._alphabet.filter(
        (i) => i !== data.token,
      );
      transitionsUsingToken.forEach((trans) => trans.removeToken(token));
    };

    let removeTokenBackward = (data: RemoveTokenActionData) => {
      StateManager._alphabet.push(data.token);
      transitionsUsingToken.forEach((trans) => trans.addToken(token));
    };

    let removeTokenAction = new Action(
      "removeToken",
      `Remove Token "${token.symbol}"`,
      removeTokenForward,
      removeTokenBackward,
      { token: token, transitionsUsingToken: transitionsUsingToken },
    );
    UndoRedoManager.pushAction(removeTokenAction);
  }

  /**
   * Pushes an action to the action stack that sets the given token's symbol
   * to the provided symbol.
   * @param token The token to set the symbol/label of.
   * @param newSymbol The new symbol/label for the token.
   */
  public static setTokenSymbol(token: TokenWrapper, newSymbol: string) {
    let oldSymbol = token.symbol;

    let setTokenSymbolForward = (data: SetTokenSymbolActionData) => {
      data.token.symbol = data.newSymbol;
    };

    let setTokenSymbolBackward = (data: SetTokenSymbolActionData) => {
      data.token.symbol = data.oldSymbol;
    };

    let setTokenSymbolAction = new Action(
      "setTokenSymbol",
      `Rename Token "${oldSymbol}" To "${newSymbol}"`,
      setTokenSymbolForward,
      setTokenSymbolBackward,
      { oldSymbol: oldSymbol, newSymbol: newSymbol, token: token },
    );
    UndoRedoManager.pushAction(setTokenSymbolAction);
  }

  /**
   * Pushes an action to the action stack that adds the given token as an
   * accepted token by the given transition.
   * @param transition The transition to add the token to.
   * @param token The token to add to the transition.
   */
  public static setTransitionAcceptsToken(
    transition: TransitionWrapper,
    token: TokenWrapper,
  ) {
    let hadTokenBefore = transition.hasToken(token);
    let setTransitionAcceptsTokenForward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.addToken(data.token);
    };

    let setTransitionAcceptsTokenBackward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      if (hadTokenBefore) {
        data.transition.addToken(data.token);
      } else {
        data.transition.removeToken(data.token);
      }
    };

    let setTransitionAcceptsTokenAction = new Action(
      "setTransitionAcceptsToken",
      `Use Token "${token.symbol}" For Transition "${transition.sourceNode.labelText}" To "${transition.destNode.labelText}"`,
      setTransitionAcceptsTokenForward,
      setTransitionAcceptsTokenBackward,
      { transition: transition, token: token },
    );
    UndoRedoManager.pushAction(setTransitionAcceptsTokenAction);
  }

  /**
   * Pushes an action to the action stack that removes the given token as an
   * accepted token by the given transition.
   * @param transition The transition to remove the token from.
   * @param token The token to remove from the transition.
   */
  public static setTransitionDoesntAcceptToken(
    transition: TransitionWrapper,
    token: TokenWrapper,
  ) {
    let hadTokenBefore = transition.hasToken(token);
    let setTransitionDoesntAcceptTokenForward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.removeToken(data.token);
    };

    let setTransitionDoesntAcceptTokenBackward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      if (hadTokenBefore) {
        data.transition.addToken(data.token);
      } else {
        data.transition.removeToken(data.token);
      }
    };

    let setTransitionDoesntAcceptTokenAction = new Action(
      "setTransitionDoesntAcceptToken",
      `Don't Use Token "${token.symbol}" For Transition "${transition.sourceNode.labelText}" To "${transition.destNode.labelText}"`,
      setTransitionDoesntAcceptTokenForward,
      setTransitionDoesntAcceptTokenBackward,
      { transition: transition, token: token },
    );
    UndoRedoManager.pushAction(setTransitionDoesntAcceptTokenAction);
  }

  /**
   * Pushes an action to the action stack that makes the given transition
   * accept the empty string.
   * @param transition The transition to make accept the empty string.
   */
  public static setTransitionAcceptsEpsilon(transition: TransitionWrapper) {
    let hadEpsilonBefore = transition.isEpsilonTransition;

    let setTransitionAcceptsEpsilonForward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.isEpsilonTransition = true;
    };

    let setTransitionAcceptsEpsilonBackward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.isEpsilonTransition = hadEpsilonBefore;
    };
    let setTransitionAcceptsTokenAction = new Action(
      "setTransitionAcceptsEpsilon",
      `Use ε For Transition "${transition.sourceNode.labelText}" To "${transition.destNode.labelText}"`,
      setTransitionAcceptsEpsilonForward,
      setTransitionAcceptsEpsilonBackward,
      { transition: transition, token: null },
    );
    UndoRedoManager.pushAction(setTransitionAcceptsTokenAction);
  }

  /**
   * Pushes an action to the action stack that makes the given transition
   * not accept the empty string.
   * @param transition The transition to make not accept the empty string.
   */
  public static setTransitionDoesntAcceptEpsilon(
    transition: TransitionWrapper,
  ) {
    let hadEpsilonBefore = transition.isEpsilonTransition;

    let setTransitionDoesntAcceptEpsilonForward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.isEpsilonTransition = false;
    };

    let setTransitionDoesntAcceptEpsilonBackward = (
      data: SetTransitionAcceptsTokenData,
    ) => {
      data.transition.isEpsilonTransition = hadEpsilonBefore;
    };
    let setTransitionDoesntAcceptTokenAction = new Action(
      "setTransitionDoesntAcceptEpsilon",
      `Don't Use ε For Transition "${transition.sourceNode.labelText}" To "${transition.destNode.labelText}"`,
      setTransitionDoesntAcceptEpsilonForward,
      setTransitionDoesntAcceptEpsilonBackward,
      { transition: transition, token: null },
    );
    UndoRedoManager.pushAction(setTransitionDoesntAcceptTokenAction);
  }

  /**
   * Gets whether or not the user is currently attempting to create a
   * transition (i.e., have they clicked and dragged on a node while using
   * the Transition tool?)
   */
  public static get tentativeTransitionInProgress() {
    return StateManager._tentativeTransitionSource !== null;
  }

  /**
   * Gets the current target node for a tentative transition, assuming that
   * the user is currently attempting to create one (i.e., they have the
   * Transition tool selected, have clicked and dragged off of one node and
   * are currently hovering over another.)
   */
  public static get tentativeTransitionTarget() {
    return StateManager._tentativeTransitionTarget;
  }

  /**
   * Sets the current tentative transition's target node. If the user released
   * the mouse after setting this, a transition would be created from the
   * source node to this node.
   */
  public static set tentativeTransitionTarget(newTarget: NodeWrapper | null) {
    StateManager._tentativeTransitionTarget = newTarget;
  }

  /** Sets the array of selected objects. */
  public static set selectedObjects(newArray: Array<SelectableObject>) {
    StateManager._selectedObjects = newArray;
  }

  /** Gets a copy of the array of selected objects. */
  public static get selectedObjects() {
    return [...StateManager._selectedObjects];
  }

  /**
   * Adds a given object to the current selection.
   * @param obj The object to select.
   * @returns
   */
  public static selectObject(obj: SelectableObject) {
    if (StateManager._selectedObjects.includes(obj)) {
      return;
    }
    const currentSelectedObjects = [...StateManager._selectedObjects, obj];
    StateManager.setSelectedObjects(currentSelectedObjects);
    StateManager._selectedObjects = currentSelectedObjects;
    obj.select();
  }

  /** Removes all objects from the current selection. */
  public static deselectAllObjects() {
    StateManager._selectedObjects.forEach((obj) => obj.deselect());
    StateManager.setSelectedObjects([]);
    StateManager._selectedObjects = [];
  }

  /**
   * Removes all currently-selected objects from the automaton, in an
   * undo/redo safe manner.
   */
  public static deleteAllSelectedObjects() {
    if (this._selectedObjects.length === 0) {
      return;
    }

    // Copy selected nodes
    const selectedNodes = this._selectedObjects.filter(
      (obj) => obj instanceof NodeWrapper,
    ) as NodeWrapper[];
    const prevStartNode = StateManager.startNode;

    // Find transitions between selected nodes
    const transitionsInvolvingSelectedNodes = this._transitionWrappers.filter(
      (transition) =>
        selectedNodes.includes(transition.sourceNode) ||
        selectedNodes.includes(transition.destNode),
    );

    // Copy selected transitions
    const selectedTransitions = this._selectedObjects.filter(
      (obj) => obj instanceof TransitionWrapper,
    ) as TransitionWrapper[];

    // Create an action to remove the selected objects
    let removeData = new RemoveNodeActionDataMulti();

    removeData.nodes = selectedNodes;
    removeData.transitions = [
      ...selectedTransitions,
      ...transitionsInvolvingSelectedNodes,
    ];

    // Save start node if it's being removed
    removeData.wasStartNode = removeData.nodes.includes(StateManager.startNode);

    let totalObjects = removeData.nodes.length + removeData.transitions.length;
    let actionDescription = `Delete ${totalObjects} Object${totalObjects !== 1 ? "s" : ""}`;

    let performRemoveForward = (data: RemoveNodeActionDataMulti) => {
      // Remove transitions
      data.transitions.forEach((transition) => {
        StateManager._transitionWrappers =
          StateManager._transitionWrappers.filter((t) => t !== transition);
        transition.konvaGroup.remove();

        var sourceNode = transition.sourceNode;
        var destNode = transition.destNode;

        var remainingTransition = StateManager.transitions.find(
          (t) =>
            (t.sourceNode.id === sourceNode.id &&
              t.destNode.id === destNode.id) ||
            (t.sourceNode.id === destNode.id &&
              t.destNode.id === sourceNode.id &&
              // we don't want to change the state of a node thats going to be deleted
              !data.transitions.includes(t)),
        );

        //stop curving if remaining adjacent transition exists
        if (remainingTransition) {
          remainingTransition.priority = "default";
          remainingTransition.updatePoints();
        }
      });

      // Remove nodes
      data.nodes.forEach((node) => {
        StateManager._nodeWrappers = StateManager._nodeWrappers.filter(
          (n) => n !== node,
        );
        node.nodeGroup.remove();

        // Reset start node if necessary
        if (StateManager.startNode === node) {
          StateManager.startNode = null;
        }
      });

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();

      // Deselect all objects
      StateManager.deselectAllObjects();
    };

    let performRemoveBackward = (data: RemoveNodeActionDataMulti) => {
      // Add nodes back
      data.nodes.forEach((node) => {
        StateManager._nodeWrappers.push(node);
        StateManager._nodeLayer.add(node.nodeGroup);

        // Restore start node if necessary
        if (
          data.wasStartNode &&
          StateManager.startNode == null &&
          node === prevStartNode
        ) {
          StateManager.startNode = node;
        }
      });
      // Add transitions back
      data.transitions.forEach((transition) => {
        var sourceNode = transition.sourceNode;
        var destNode = transition.destNode;

        var adjacentTransitionInScene = StateManager.transitions.find(
          (t) =>
            (t.sourceNode.id === sourceNode.id &&
              t.destNode.id === destNode.id) ||
            (t.sourceNode.id === destNode.id &&
              t.destNode.id === sourceNode.id),
        );

        // set curve back if adjacent node exists
        if (adjacentTransitionInScene) {
          adjacentTransitionInScene.priority = "curve";
          adjacentTransitionInScene.updatePoints();
        }

        StateManager._transitionWrappers.push(transition);
        StateManager._transitionLayer.add(transition.konvaGroup);
      });

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager.updateTransitions();
    };

    let removeAction = new Action(
      "deleteObjects",
      actionDescription,
      performRemoveForward,
      performRemoveBackward,
      removeData,
    );

    UndoRedoManager.pushAction(removeAction);

    StateManager.deselectAllObjects();
  }

  /**
   * Immediately deletes the given node from the automaton, and any
   * transitions associated with it.
   *
   * **NOTE:** This method is *not* undo/redo safe. In most cases, you should
   * instead use `StateManager.removeNode`. We may want to rename this
   * function or remove it entirely to avoid confusion.
   * @param node The node to remove.
   */
  public static deleteNode(node: NodeWrapper) {
    const transitionsDependentOnDeletedNode: Array<TransitionWrapper> = [];
    StateManager._transitionWrappers.forEach((trans) => {
      if (
        trans.involvesNode(node) &&
        !transitionsDependentOnDeletedNode.includes(trans)
      ) {
        transitionsDependentOnDeletedNode.push(trans);
      }
    });

    StateManager._transitionWrappers = StateManager._transitionWrappers.filter(
      (i) => {
        !transitionsDependentOnDeletedNode.includes(i);
      },
    );

    StateManager._nodeWrappers = StateManager._nodeWrappers.filter(
      (i) => node != i,
    );
    // node.deleteKonvaObjects();
    node.nodeGroup.remove();
    transitionsDependentOnDeletedNode.forEach((obj) => obj.konvaGroup.remove());

    if (node == StateManager._startNode) {
      StateManager.startNode = null;
    }
  }

  /**
   * Called when the user uses the mouse scroll wheel.
   * This causes the state diagram view to be zoomed in or out.
   * @param ev
   */
  private static handleWheelEvent(ev: any) {
    ev.evt.preventDefault();
    var oldScale = StateManager._stage.scaleX();

    var pointer = StateManager._stage.getPointerPosition();

    var mousePointer = {
      x: (pointer.x - StateManager._stage.x()) / oldScale,
      y: (pointer.y - StateManager._stage.y()) / oldScale,
    };

    var newScale = ev.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    StateManager._stage.scale({ x: newScale, y: newScale });

    var newPos = {
      x: pointer.x - mousePointer.x * newScale,
      y: pointer.y - mousePointer.y * newScale,
    };
    StateManager._stage.position(newPos);
    StateManager._stage.batchDraw();
    StateManager.drawGrid();
  }

  /**
   * Resets the state diagram zoom level to 100%.
   * @returns
   */
  public static resetZoom() {
    if (!StateManager._stage) {
      console.error("Stage is not initialized.");
      return;
    }
    StateManager._stage.scale({ x: 1, y: 1 });
    StateManager._stage.position({ x: 0, y: 0 });
    StateManager._stage.batchDraw();
    StateManager.drawGrid();
  }

  /**
   * Centers the view of the state diagram to the origin.
   * @returns
   */
  public static centerStage() {
    if (!StateManager._stage) {
      console.error("Stage is not initialized.");
      return;
    }
    // Calculate the center based on the container dimensions
    const x =
      window.innerWidth / 2 -
      (StateManager._stage.width() / 2) * StateManager._stage.scaleX();
    const y =
      window.innerHeight / 2 -
      (StateManager._stage.height() / 2) * StateManager._stage.scaleY();
    StateManager._stage.position({ x, y });
    StateManager.drawGrid();
    StateManager._stage.batchDraw();
  }

  /**
   * Zooms the view in by 10%.
   * @returns
   */
  public static zoomIn() {
    if (!StateManager._stage) {
      console.error("Stage is not initialized.");
      return;
    }
    const scaleBy = 1.1; // Increase scale by 10%
    StateManager.applyZoom(scaleBy);
  }

  /**
   * Zooms the view out by 10%.
   * @returns
   */
  public static zoomOut() {
    if (!StateManager._stage) {
      console.error("Stage is not initialized.");
      return;
    }
    const scaleBy = 0.9; // Decrease scale by 10%
    StateManager.applyZoom(scaleBy);
  }

  /**
   * Finds the bounding box of the automaton
   * and scrolls/zooms the screen to it
   */
  public static fitAutomatonOnScreen() {
    const bounds = StateManager.getDiagramBounds(
      StateManager._stage.width() / 3,
      50,
      50,
      50,
    );
    // Based on window size, the smaller scalar is what we need to be scale the zoom by, and then add some padding

    let scale = Math.min(
      StateManager._stage.width() / bounds.width,
      StateManager._stage.height() / bounds.height,
    );
    const boxCenterX = bounds.x + bounds.width / 2;
    const boxCenterY = bounds.y + bounds.height / 2;
    // finally, apply the zoom and center it in the center of the bounding box
    StateManager._stage.scale({ x: scale, y: scale });
    StateManager._stage.position({
      x: StateManager._stage.width() / 2 - boxCenterX * scale,
      y: StateManager._stage.height() / 2 - boxCenterY * scale,
    });
    StateManager._stage.batchDraw();
    StateManager.drawGrid();
  }

  /**
   * Clear out the automaton and alphabet
   * then reset state ID to 0
   * then reset action stack
   *
   *
   */
  public static clearMachine() {
    //StateManager.deselectAllObjects();
    StateManager._nodeWrappers.forEach((n) => StateManager.selectObject(n));
    StateManager.deleteAllSelectedObjects();
    StateManager._alphabet.forEach((t) => StateManager.removeToken(t));
    StateManager._nextStateId = 0;
    UndoRedoManager.reset();
  }

  /**
   * Zooms the view in or out by a given ratio.
   * @param scaleBy The ratio to scale the view by.
   */
  private static applyZoom(scaleBy: number) {
    const oldScale = StateManager._stage.scaleX();
    const newScale = oldScale * scaleBy;
    StateManager._stage.scale({ x: newScale, y: newScale });

    const stageCenterX = StateManager._stage.width() / 2;
    const stageCenterY = StateManager._stage.height() / 2;
    const newPos = {
      x: stageCenterX - (stageCenterX - StateManager._stage.x()) * scaleBy,
      y: stageCenterY - (stageCenterY - StateManager._stage.y()) * scaleBy,
    };
    StateManager._stage.position(newPos);
    StateManager._stage.batchDraw();
    StateManager.drawGrid();
  }

  /** Returns whether or not all node labels in the automaton are unique. */
  public static areAllLabelsUnique(): boolean {
    const labels = StateManager._nodeWrappers.map((node) => node.labelText);
    const uniqueLabels = new Set(labels);
    return labels.length === uniqueLabels.size;
  }

  /** Sets the array of tokens for the automaton. */
  public static set alphabet(newAlphabet: Array<TokenWrapper>) {
    StateManager._alphabet = newAlphabet;
  }

  /**
   * Gets a copy of the array of tokens for the automaton. Modifying this
   * array (such as adding or removing elements) won't change the automaton's
   * alphabet, but modifying the `TokenWrapper` objects inside of it will.
   */
  public static get alphabet() {
    return [...StateManager._alphabet];
  }

  /** Gets a runnable DFA object from the current automaton. */
  public static get dfa(): DFA {
    let outputDFA = new DFA();
    const stateManagerData = StateManager.toSerializable();
    outputDFA.inputAlphabet = stateManagerData.alphabet.map((s) => s.symbol);
    outputDFA.states = stateManagerData.states.map(
      (s) => new DFAState(s.label),
    );
    outputDFA.acceptStates = stateManagerData.acceptStates.map((s) => {
      const label = convertIDtoLabelOrSymbol(s, stateManagerData);
      return outputDFA.states.find((state) => state.label === label);
    });

    outputDFA.startState = outputDFA.states.find(
      (s) =>
        s.label ===
        convertIDtoLabelOrSymbol(stateManagerData.startState, stateManagerData),
    );

    outputDFA.transitions = stateManagerData.transitions.flatMap((t) =>
      t.tokens.map((tokenID) => {
        const sourceLabel = convertIDtoLabelOrSymbol(
          t.source,
          stateManagerData,
        );
        const tokenSymbol = convertIDtoLabelOrSymbol(tokenID, stateManagerData);
        const destLabel = convertIDtoLabelOrSymbol(t.dest, stateManagerData);

        return new DFATransition(
          outputDFA.states.find((s) => s.label === sourceLabel),
          tokenSymbol,
          outputDFA.states.find((s) => s.label === destLabel),
        );
      }),
    );

    return outputDFA;
  }

  /**
   * Converts the current automaton into an object that can be
   * serialized.
   * @returns {SerializableAutomaton} A serializable automaton object.
   */
  public static toSerializable(): SerializableAutomaton {
    return {
      states: StateManager._nodeWrappers.map((node) => node.toSerializable()),
      alphabet: StateManager._alphabet.map((tok) => tok.toSerializable()),
      transitions: StateManager._transitionWrappers.map((trans) =>
        trans.toSerializable(),
      ),
      startState:
        StateManager._startNode != null ? StateManager._startNode.id : null,
      acceptStates: StateManager._nodeWrappers
        .filter((node) => node.isAcceptNode)
        .map((node) => node.id),
    };
  }

  /**
   * Converts the current automaton to a JSON file, and downloads it to the
   * user's device.
   */
  public static downloadJSON() {
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
  public static uploadJSON(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files.item(0);
    ev.target.value = null;

    const fileText = file.text().then(
      (text) => {
        return JSON.parse(text);
      },
      (reject_reason) => {
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
  public static loadAutomaton(json: SerializableAutomaton) {
    const { states, alphabet, transitions, startState, acceptStates } = json;

    StateManager.clearMachine();
    StateManager.makeClean();

    // Load each state
    states.forEach((state) => {
      const newState = new NodeWrapper(state.label, state.id);
      newState.createKonvaObjects(state.x, state.y);
      StateManager._nodeWrappers.push(newState);
      StateManager._nodeLayer.add(newState.nodeGroup);
    });

    acceptStates.forEach((state) => {
      const node = StateManager._nodeWrappers.find((n) => n.id === state);
      if (node) {
        node.isAcceptNode = true;
      }
    });

    // Load the alphabet
    alphabet.forEach((tok) => {
      const newTok = new TokenWrapper(tok.symbol, tok.id);
      StateManager._alphabet.push(newTok);
    });

    // Load transitions
    transitions.forEach((trans) => {
      const src = StateManager._nodeWrappers.find((n) => n.id === trans.source);
      const dest = StateManager._nodeWrappers.find((n) => n.id === trans.dest);
      const isEpsilonTransition = trans.isEpsilonTransition;
      const tokens = trans.tokens.map((tokID) =>
        StateManager._alphabet.find((tok) => tok.id === tokID),
      );
      const newTrans = new TransitionWrapper(
        src,
        dest,
        isEpsilonTransition,
        tokens,
      );

      StateManager._transitionWrappers.push(newTrans);
      StateManager._transitionLayer.add(newTrans.konvaGroup);
    });

    // Load the start state
    const startNodeObj = StateManager._nodeWrappers.filter(
      (n) => n.id === startState,
    );
    if (startNodeObj.length <= 0) {
      console.error("Start state not found!!");
    } else {
      StateManager.startNode = startNodeObj[0];
    }

    // Accept states are loaded at the same time as states themselves

    // Refresh canvas?

    this._stage.draw();
  }

  public static isValidAutomaton(
    json: SerializableAutomaton,
  ): [boolean, string] {
    // for now just console log, not sure how to desiplay window
    if (
      !json ||
      !json.states ||
      !json.alphabet ||
      !json.transitions ||
      !json.startState ||
      !json.acceptStates
    ) {
      console.error("Missing required fields");
      return [false, "Missing required fields"];
    }

    if (!json.states.every((state) => this.isValidState(state))) {
      console.error("states not properly formatted");
      return [false, "states not properly formatted"];
    }

    if (!json.alphabet.every((token) => this.isValidToken(token))) {
      console.error("alphabet not properly formatted");
      return [false, "alphabet not properly formatted"];
    }

    if (
      !json.transitions.every((transition) =>
        this.isValidTransition(transition, json),
      )
    ) {
      console.error("Invalid 'transitions' format.");
      return [false, "Invalid 'transitions' format."];
    }

    if (json.startState === undefined) {
      console.log(json.startState);
      console.error("Invalid 'startState' format.");
      return [false, "Invalid 'startState' format."];
    }

    if (json.acceptStates.every((state) => state === undefined)) {
      console.error("Invalid 'acceptStates' format.");
      return [false, "Invalid 'acceptStates' format."];
    }

    return [true, ""];
  }

  private static isValidState(state: SerializableState): boolean {
    return (
      state.id !== undefined &&
      state.x !== undefined &&
      state.y !== undefined &&
      state.label !== undefined
    );
  }

  private static isValidToken(token: SerializableToken): boolean {
    return token.id !== undefined && token.symbol !== undefined;
  }

  private static isValidTransition(
    transition: SerializableTransition,
    json: SerializableAutomaton,
  ): boolean {
    console.log(transition);

    if (
      transition.id === undefined ||
      transition.source === undefined ||
      transition.dest === undefined ||
      transition.isEpsilonTransition === undefined ||
      transition.tokens === undefined ||
      transition.tokens.every((tok) => tok === undefined)
    ) {
      return false;
    }

    const stateIds = new Set(json.states?.map((state: any) => state.id) || []);
    const tokenIds = new Set(
      json.alphabet?.map((token: any) => token.id) || [],
    );

    return (
      stateIds.has(transition.source) &&
      stateIds.has(transition.dest) &&
      transition.tokens.every((tok) => tokenIds.has(tok))
    );
  }

  /** Sets whether or not dark mode is enabled. */
  public static set useDarkMode(val: boolean) {
    StateManager.makeClean();
    // Save new value
    this._useDarkMode = val;

    this._nodeWrappers.forEach((n) => n.updateColorScheme());
    this._transitionWrappers.forEach((t) => t.updateColorScheme());

    // We need to re-trigger the "selected object" drawing code
    // for selected objects
    this._selectedObjects.forEach((o) => o.select());

    this._startStateLine.fill(this.colorScheme.transitionArrowColor);
    this._startStateLine.stroke(this.colorScheme.transitionArrowColor);

    this._tentConnectionLine.fill(
      this.colorScheme.tentativeTransitionArrowColor,
    );
    this._tentConnectionLine.stroke(
      this.colorScheme.tentativeTransitionArrowColor,
    );

    const gridLayer = StateManager._stage.findOne(".gridLayer");
    if (gridLayer) {
      gridLayer.destroy();
    }
    StateManager.drawGrid();

    StateManager._stage.draw();
  }

  /** Gets whether or not dark mode is enabled. */
  public static get useDarkMode() {
    return this._useDarkMode;
  }

  /** The initial position of one of the nodes when nodes are dragged. */
  private static _dragStatesStartPosition: Vector2d | null = null;

  /**
   * Stores the initial position of one of the nodes at the beginning of a
   * node-dragging operation. This value is compared to the same node's
   * position as the drag operation continues, so that the same offset is
   * applied to all selected nodes and it appears the user is dragging all
   * nodes at once.
   * @param startPos The initial position of one of the nodes.
   */
  public static startDragStatesOperation(startPos: Vector2d) {
    this._dragStatesStartPosition = startPos;
  }

  /**
   * Pushes an action to the action stack that moves the selected nodes
   * by a certain amount.
   * @param finalPos The final position of the same node as was used for
   * `StateManager.startDragStatesOperation` at the beginning of this drag
   * operation.
   */
  public static completeDragStatesOperation(finalPos: Vector2d) {
    let startPos = this._dragStatesStartPosition;
    let endPos = finalPos;
    let delta: Vector2d = {
      x: endPos.x - startPos.x,
      y: endPos.y - startPos.y,
    };

    let moveStatesForward = (data: MoveStatesActionData) => {
      data.states.forEach((state) => {
        state.setPosition({
          x: state.nodeGroup.position().x + delta.x,
          y: state.nodeGroup.position().y + delta.y,
        });

        if (StateManager.startNode === state) {
          this.updateStartNodePosition();
        }
      });
      StateManager.updateTransitions();
    };

    let moveStatesBackward = (data: MoveStatesActionData) => {
      data.states.forEach((state) => {
        state.setPosition({
          x: state.nodeGroup.position().x - delta.x,
          y: state.nodeGroup.position().y - delta.y,
        });

        if (StateManager.startNode === state) {
          this.updateStartNodePosition();
        }
      });
      StateManager.updateTransitions();
    };

    let moveStatesString = "Move ";
    if (this.selectedObjects.length > 1) {
      moveStatesString += `${this.selectedObjects.length} Nodes`;
    } else if (this.selectedObjects.length == 1) {
      let singleState = this.selectedObjects[0] as NodeWrapper;
      moveStatesString += `"${singleState.labelText}"`;
    }

    let moveNodesAction = new Action(
      "moveStates",
      moveStatesString,
      moveStatesForward,
      moveStatesBackward,
      { delta: delta, states: [...this.selectedObjects] },
    );

    UndoRedoManager.pushAction(moveNodesAction, false);
  }

  /**
   * Updates the transition arrows for all of the transitions in the
   * automaton.
   */
  public static updateTransitions() {
    StateManager._transitionWrappers.forEach((trans) => {
      trans.updatePoints();
    });
    StateManager._transitionLayer.draw();
  }
  /**
   * Wrapper function for the undoredomanager.undo to be accessed via a button and update properly
   */
  public static undoState() {
    UndoRedoManager.undo();
    return;
  }
  /**
   * Wrapper function for the undoredomanager.redo to be accessed via a button and update properly
   */
  public static redoState() {
    UndoRedoManager.redo();
    return;
  }

  //StateManager._nodeWrappers is a private property I provided a public getter to access the nodes
  public static get nodeWrappers(): Array<NodeWrapper> {
    return [...StateManager._nodeWrappers];
  }
}

/**
 * A representation of an automaton that can be converted to and from a JSON
 * string.
 */
interface SerializableAutomaton {
  states: Array<SerializableState>;
  alphabet: Array<SerializableToken>;
  transitions: Array<SerializableTransition>;
  startState: string;
  acceptStates: Array<string>;
}

/**
 * A representation of a node that can be converted to and from a JSON string.
 */
export interface SerializableState {
  id: string;
  x: number;
  y: number;
  label: string;
}

/**
 * A representation of a token that can be converted to and from a JSON string.
 */
export interface SerializableToken {
  id: string;
  symbol: string;
}

/**
 * A representation of a transition that can be converted to and from a JSON
 * string.
 */
export interface SerializableTransition {
  id: string;
  source: string;
  dest: string;
  isEpsilonTransition: boolean;
  tokens: Array<string>;
}

/** Holds the data associated with a "create node" action. */
class CreateNodeActionData extends ActionData {
  /** The X coordinate where the node is created. */
  public x: number;

  /** The Y coordinate where the node is created. */
  public y: number;

  /** The node created in this action. */
  public node: NodeWrapper;
}

/** Holds the data associated with a "remove node" action. */
class RemoveNodeActionData extends ActionData {
  /** The node removed in this action. */
  public node: NodeWrapper;

  /**
   * Transitions associated with the node removed in this action, which
   * also must be removed as part of the action.
   */
  public transitions: Set<TransitionWrapper>;

  /**
   * Whether or not the node removed in this action was the automaton's
   * start node.
   */
  public isStart: boolean;
}

/** Holds the data associated with a delete all selected objects action. */
class RemoveNodeActionDataMulti extends ActionData {
  /** The nodes removed in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions removed in this action. */
  public transitions: TransitionWrapper[] = [];

  /** Whether any of the nodes removed were the start node. */
  public wasStartNode: boolean = false;
}

/** Holds the data associated with a "move nodes" action. */
class MoveStatesActionData extends ActionData {
  /** The amount by which nodes were moved in this action. */
  public delta: Vector2d;

  /** The nodes moved in this action. */
  public states: Array<NodeWrapper>;
}

/** Holds the data associated with a "set node name" action. */
class SetNodeNameActionData extends ActionData {
  /** The name of the node before this action. */
  public oldName: string;

  /** The name of the node after this action. */
  public newName: string;

  /** The node renamed in this action. */
  public node: NodeWrapper;
}

/** Holds the data associated with a "set node is accept node" action. */
class SetNodeIsAcceptActionData extends ActionData {
  /** Whether or not the node was an accept node before this action. */
  public oldValue: boolean;

  /** Whether or not the node was an accept node after this action. */
  public newValue: boolean;

  /** The node to set the accept status of in this action. */
  public node: NodeWrapper;
}

/** Holds the data associated with a "set node as start node" action. */
class SetNodeIsStartActionData extends ActionData {
  /** The node that was the start node before this action. */
  public oldStart: NodeWrapper;

  /** The node that was the start node after this action. */
  public newStart: NodeWrapper;
}

/** Holds the data associated with an "add transition" action. */
class AddTransitionActionData extends ActionData {
  /** The transition created in this action. */
  public transition: TransitionWrapper;
}

/** Holds the data associated with a "remove transition" action. */
class RemoveTransitionActionData extends ActionData {
  /** The transition removed in this action. */
  public transition: TransitionWrapper;
}

/** Holds the data associated with a "add/remove token to transition" action. */
class SetTransitionAcceptsTokenData extends ActionData {
  /** The transition modified in this action. */
  public transition: TransitionWrapper;

  /** The token added to or removed from the transition in this action. */
  public token: TokenWrapper;
}

/** Holds the data associated with an "add token to automaton" action. */
class AddTokenActionData extends ActionData {
  /** The token created in this action. */
  public token: TokenWrapper;
}

/** Holds the data associated with a "remove token from automaton" action. */
class RemoveTokenActionData extends ActionData {
  /** The token removed in this action. */
  public token: TokenWrapper;

  /**
   * Transitions using this token at the time of this action, which must
   * also have the token removed from them.
   */
  public transitionsUsingToken: TransitionWrapper[];
}

/** Holds the data associated with a "set token symbol" action. */
class SetTokenSymbolActionData extends ActionData {
  /** The symbol for this token before this action. */
  public oldSymbol: string;

  /** The symbol for this token after this action. */
  public newSymbol: string;

  /** The token modified in this action. */
  public token: TokenWrapper;
}

/** Holds the data associated with a "paste" action. */
class PasteActionData extends ActionData {
  /** The nodes created in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions created in this action. */
  public transitions: TransitionWrapper[] = [];
}

/** Holds the data associated with a "cut" action. */
class CutActionData extends ActionData {
  /** The nodes removed in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions removed in this action. */
  public transitions: TransitionWrapper[] = [];

  /** Whether any of the nodes removed were the start node. */
  public wasStartNode: boolean = false;
}
