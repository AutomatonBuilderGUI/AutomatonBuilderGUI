import NodeWrapper from "../NodeWrapper";
import CommentRegion from "../CommentRegion";
import { Tool } from "../Tool";
import Konva from "konva";
import TransitionWrapper from "../TransitionWrapper";
import SelectableObject from "../SelectableObject";
import TokenWrapper from "../TokenWrapper";
import { LightColorScheme, DarkColorScheme } from "../ColorSchemes";
import DFA from "automaton-kit/lib/dfa/DFA";
import DFATransition from "automaton-kit/lib/dfa/DFATransition";
import DFAState from "automaton-kit/lib/dfa/DFAState";
import { convertIDtoLabelOrSymbol } from "../utilities/AutomatonUtilities";
import UndoRedoManager, { Action, ActionData } from "../UndoRedoManager";
import { exportAutomatonToImage } from "./ExportFile";
import { Vector2d } from "konva/lib/types";
import { KonvaEventObject } from "konva/lib/Node";
import { handleWheelEvent, getDiagramBounds } from "./ZoomManager";
import {
  StackableAction,
  SetNodesIsAcceptActionData,
  ResizeCommentActionData,
  SetCommentsTextActionData,
  MoveCommentsActionData,
  SetCommentsColorActionData,
  PasteActionData,
  CutActionData,
  CreateCommentActionData,
  AddTokenActionData,
  RemoveTokenActionData,
  SetTokenSymbolActionData,
  CreateNodeActionData,
  RemoveNodeActionData,
  RemoveNodeActionDataMulti,
  SetNodeNameActionData,
  SetNodeIsStartActionData,
  AddTransitionActionData,
  RemoveTransitionActionData,
  SetTransitionAcceptsTokenData,
} from "./StackableAction";

import { onKeyDown } from "./InputManager";

import {
  SerializableAutomaton,
  SerializableState,
  SerializableToken,
  SerializableTransition,
} from "./SearilizableInterfaces";

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

  /**
   * Stores a list of the objects that were selected when debug mode was enabled.
   */
  static _selectedBeforeDebug: SelectableObject[] = [];

  /** Returns the current start node for the automaton. */
  public static get startNode(): NodeWrapper | null {
    return StateManager._startNode;
  }
  static _startNode: NodeWrapper | null = null;

  /** Holds all of the node wrappers in the automaton. */
  private static _nodeWrappers: Array<NodeWrapper> = [];

  /** Holds all of the transition wrappers in the automaton. */
  private static _transitionWrappers: Array<TransitionWrapper> = [];

  /** Holds all of the comment regions in the grid */
  private static _commentRegions: Array<CommentRegion> = [];

  /** Holds all of the tokens in the automaton. */
  private static _alphabet: Array<TokenWrapper> = [];

  /** Holds all of the currently selected objects (nodes and transitions). */
  private static _selectedObjects: Array<SelectableObject> = [];

  private static _resizeComment: CommentRegion | null = null;

  /**
   * When the selection box is being used, this stores the corner where the user started dragging.
   */
  private static _selectBoxStart: Vector2d | null = null;

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

  private static lockExtras: boolean = false;

  /** The stage, or canvas, where the state machine is drawn. */
  private static _stage: Konva.Stage | null = null;

  /** The arrow used to represent a transition being created by the user. */
  private static _tentConnectionLine: Konva.Arrow | null = null;

  /** The arrow used to represent the start node. */
  static _startStateLine: Konva.Arrow | null = null;

  /** The layer of the Konva stage that draws the selection box (and perhaps other temporary constructs)*/
  private static _selectBoxLayer: Konva.Layer | null = null;

  /** The layer of the Konva stage where nodes are drawn. */
  private static _nodeLayer: Konva.Layer | null = null;

  /** The layer of the Konva stage where transitions are drawn. */
  private static _transitionLayer: Konva.Layer | null = null;

  /** The layer of the Konva stage where comment regions are drawn */
  private static _commentLayer: Konva.Layer | null = null;

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
  private static debugActive: boolean = false;

  public static isDebugEnabled(): boolean {
    return this.debugActive;
  }

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

  /** Marks the file as clean. */
  static listeners = new Set<() => void>();

  static setDebug() {
    if (this.debugActive) {
      StateManager.notifyListeners();
    }

    StateManager.debugActive = !StateManager.debugActive;
  }

  static addNode(node: NodeWrapper) {
    this._nodeWrappers.push(node);
    this._nodeLayer.add(node.nodeGroup);
  }

  static findNodeById(id: string) {
    return this._nodeWrappers.find((n) => n.id === id);
  }

  static addStateTransition(t: TransitionWrapper) {
    this._transitionWrappers.push(t);
    this._transitionLayer.add(t.konvaGroup);
  }

  /**
   * Immediately removes a node from the automaton. Does not touch
   * transitions attached to it; callers detach those separately.
   *
   * Only meant to be used from inside CopyPasteManager
   */
  static detachNode(node: NodeWrapper) {
    this._nodeWrappers = this._nodeWrappers.filter((n) => n !== node);
    node.deselect();
    node.nodeGroup.remove();
    if (this._startNode === node) {
      this.startNode = null;
    }
  }

  /**
   * Immediately removes a transition from the automaton.
   *
   * **NOTE:** Not undo/redo safe on its own. Meant to be called from inside
   * an Action's forward/backward functions. For a user-facing delete, use
   * `StateManager.removeTransition`.
   */
  static detachTransition(t: TransitionWrapper) {
    this._transitionWrappers = this._transitionWrappers.filter((x) => x !== t);
    t.deselect();
    t.konvaGroup.remove();
  }

  static findTokenById(tokId: string): TokenWrapper | undefined {
    return this._alphabet.find((tok) => tok.id === tokId);
  }

  static pushAlphabetToken(token: TokenWrapper) {
    this._alphabet.push(token);
  }

  static redraw() {
    this._stage?.draw();
  }

  static get clipboard(): ReadonlyArray<SelectableObject> {
    return this._clipboard;
  }
  static set clipboard(items: SelectableObject[]) {
    this._clipboard = [...items];
  }

  public static get stage(): Konva.Stage {
    if (!this._stage) throw new Error("Stage is not initialized.");
    return this._stage;
  }
  public static get nodeWrappers(): ReadonlyArray<NodeWrapper> {
    return this._nodeWrappers;
  }
  public static get transitionWrappers(): ReadonlyArray<TransitionWrapper> {
    return this._transitionWrappers;
  }

  static notifyListeners() {
    Array.from(StateManager.listeners).forEach((listener) => listener());
  }

  static subscribe(listener: () => void) {
    StateManager.listeners.add(listener);
  }

  static unsubscribe(listener: () => void) {
    StateManager.listeners.delete(listener);
  }
  static debugOptions = {
    Left: -1,
    Right: 1,
    KillDebug: -10,
    Other: 0,
  } as const;

  /** Returns the the curent clean state of the file */

  public static checkDebug() {
    return StateManager.debugActive;
  }
  public static get debugEnabled(): boolean {
    return StateManager.debugActive;
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
    this._commentRegions = [];

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
    this._stage.on("wheel", handleWheelEvent);
    this._stage.on("dragmove", StateManager.onDragMove);
    this._stage.on("pointerdown", StateManager.onPointerDown);
    this._stage.on("pointermove", StateManager.onPointerMove);
    this._stage.on("pointerup", StateManager.onPointerUp);

    this._selectBoxLayer = new Konva.Layer();
    this._nodeLayer = new Konva.Layer();
    this._transitionLayer = new Konva.Layer();
    this._gridLayer = new Konva.Layer();
    this._commentLayer = new Konva.Layer();
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
      listening: false,
    });
    this._transitionLayer.add(this._startStateLine);

    this._stage.add(this._commentLayer);
    this._stage.add(this._transitionLayer);
    this._stage.add(this._nodeLayer);
    this._stage.add(this._selectBoxLayer);

    this._stage.on("mousemove", () => {
      if (StateManager._resizeComment == null) {
        return;
      }
      StateManager._resizeComment.resize();
    });
    this._stage.on("mouseup", (e) => {
      if (StateManager._resizeComment == null) {
        return;
      }
      e.target.getStage().container().style.cursor = "default";
      StateManager.endResizeCommentOperation();
    });

    addEventListener("keydown", onKeyDown);
    addEventListener("resize", this.handleResize);
    StateManager.makeClean();
  }

  public static storageAvailable() {
    return typeof Storage != "undefined";
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

  public static blockOtherActions() {
    StateManager.lockExtras = true;
  }
  public static allowOtherActions() {
    StateManager.lockExtras = false;
  }
  public static get safeToAct(): boolean {
    return !StateManager.lockExtras;
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

  /** Exports the diagram as a PNG. Thin wrapper that hands private state to ExportFile. */
  /** Now lives in the ExportFile.ts under Components **/
  public static exportAutomatonToImage() {
    exportAutomatonToImage({
      stage: StateManager._stage,
      gridLayer: StateManager._gridLayer,
      nodeLayer: StateManager._nodeLayer,
      transitionLayer: StateManager._transitionLayer,
      transitions: StateManager.transitions,
      bounds: getDiagramBounds(),
      useDarkMode: StateManager.useDarkMode,
    });
  }

  /** Gets the current tool. */
  public static get currentTool() {
    return StateManager._currentTool;
  }

  /** Sets the current tool. */
  public static set currentTool(tool: Tool) {
    if (!StateManager.safeToAct) return;
    StateManager._currentTool = tool;
  }

  /** Gets the resize comment. */
  public static get resizeComment() {
    return StateManager._resizeComment;
  }

  /** Returns true if the selection box is active. */
  public static isSelectBoxActive(): boolean {
    return StateManager._selectBoxStart != null;
  }

  /** Creates a selection box. */
  public static startSelectBox(start: Vector2d) {
    StateManager.blockOtherActions();
    StateManager._selectBoxStart = start;
    StateManager._stage?.setDraggable(false);
  }

  /**
   * Deletes and cleans up the selection box.
   */
  public static killSelectBox() {
    StateManager.allowOtherActions();
    StateManager._selectBoxStart = null;
    StateManager._stage?.setDraggable(true);
    StateManager.drawSelectBox();
  }

  /**
   * Selects all the nodes inside the box and kills the selection box.
   */
  public static completeSelectBox(evt: KonvaEventObject<PointerEvent>) {
    const [min_x, min_y, max_x, max_y] = this.getSelectBoxBounds();
    const selectedNodes: NodeWrapper[] = StateManager._nodeWrappers.filter(
      (node: NodeWrapper) => {
        const x = node.nodeGroup.getPosition().x;
        const y = node.nodeGroup.getPosition().y;
        return min_x <= x && min_y <= y && max_x >= x && max_y >= y;
      },
    );
    if (!evt.evt.shiftKey) {
      StateManager.setSelection(selectedNodes);
    } else {
      StateManager.addToSelection(selectedNodes);
    }
    StateManager.killSelectBox();
  }

  /**
   * Returns the bounds of the selection box. returns null if there isn't one.
   * @returns [min_x,min_y,max_x,max_y] or null
   */
  public static getSelectBoxBounds(): null | [number, number, number, number] {
    if (!StateManager.isSelectBoxActive()) return null;

    const corner1: Vector2d = StateManager.toStageSpace(
      StateManager._selectBoxStart,
    );
    let x_min = corner1.x;
    let y_min = corner1.y;

    const corner2: Vector2d = StateManager.toStageSpace(
      StateManager._stage?.getPointerPosition(),
    );
    const x_other = corner2.x;
    const y_other = corner2.y;

    let x_max: number;
    let y_max: number;

    if (x_min > x_other) {
      x_max = x_min;
      x_min = x_other;
    } else {
      x_max = x_other;
    }
    if (y_min > y_other) {
      y_max = y_min;
      y_min = y_other;
    } else {
      y_max = y_other;
    }
    return [x_min, y_min, x_max, y_max];
  }

  /**
   * Called when the mouse button is depressed
   */
  private static onPointerDown(evt: Konva.KonvaEventObject<PointerEvent>) {
    if (StateManager.currentTool === Tool.SelectBox) {
      StateManager.startSelectBox(StateManager._stage?.pointerPos);
    }
  }

  /**
   * Called when the mouse pointer is moved
   */
  private static onPointerMove(evt: Konva.KonvaEventObject<PointerEvent>) {
    if (
      StateManager.currentTool !== Tool.SelectBox &&
      StateManager.isSelectBoxActive()
    ) {
      StateManager.killSelectBox();
    }
    StateManager.drawSelectBox();
  }

  /** Called when the mouse is released. Note: this should always occur right before onClick().  */
  private static onPointerUp(evt: KonvaEventObject<PointerEvent>) {
    if (StateManager.isSelectBoxActive()) {
      StateManager.completeSelectBox(evt);
    }
  }

  /** Draw temporary annotations. */
  private static drawSelectBox() {
    StateManager._selectBoxLayer?.destroyChildren();
    if (StateManager.isSelectBoxActive()) {
      const [min_x, min_y, max_x, max_y] = StateManager.getSelectBoxBounds();
      StateManager._selectBoxLayer?.add(
        new Konva.Rect({
          x: min_x,
          y: min_y,
          fill: this.colorScheme.selectedNodeStrokeColor,
          opacity: 0.5,
          width: max_x - min_x,
          height: max_y - min_y,
        }),
      );
    }
    StateManager._selectBoxLayer?.batchDraw();
  }

  /** Called when the user pans the view. */
  private static onDragMove(evt: Konva.KonvaEventObject<MouseEvent>) {
    StateManager.drawGrid();
  }

  /** Called when the user clicks on the background. */
  private static onClick(evt: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.SelectBox) {
      return;
    }
    let thingUnderMouse = StateManager._stage.getIntersection(
      StateManager._stage.getPointerPosition(),
    );
    if (!thingUnderMouse && !evt.evt.shiftKey) {
      StateManager.clearSelection();
    }
  }

  /**
   * Called when the user double-clicks on the view. When the user is using
   * the State tool, this adds a new node at the cursor's position.
   */
  private static onDoubleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool == Tool.States) {
      StateManager.addStateAtDoubleClickPos(evt);
    } else if (StateManager.currentTool == Tool.Comment) {
      StateManager.addCommentAtDoubleClickPos(evt);
    }
  }

  /** Transforms a vector from absolute to stage space (assumes _stage is a valid Konva.Stage) */
  private static toStageSpace(vec: Vector2d): Vector2d {
    // Convert the pointer position to the stage's coordinate space
    const scale = StateManager._stage.scaleX(); // Assuming uniform scaling for X and Y
    const stagePos = StateManager._stage.position();

    // Adjusting for the stage's position and scale
    let x = (vec.x - stagePos.x) / scale;
    let y = (vec.y - stagePos.y) / scale;

    return {
      x: (vec.x - stagePos.x) / scale,
      y: (vec.y - stagePos.y) / scale,
    };
  }

  /** Snaps a stage space vector to the grid */
  private static snapStageVectorToGrid(vec: Vector2d): Vector2d {
    const gridSpacing = 50; // Define your grid spacing value here

    // No need to normalize the coordinates here since they're already in "stage space"
    return {
      x: Math.round(vec.x / gridSpacing) * gridSpacing,
      y: Math.round(vec.y / gridSpacing) * gridSpacing,
    };
  }

  /**
   * Pushes an action to the action stack that adds a comment region to the automaton.
   */
  private static addCommentAtDoubleClickPos(
    evt: Konva.KonvaEventObject<MouseEvent>,
  ) {
    if (!StateManager._stage) return;

    const stage = StateManager._stage;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    let pos = StateManager.toStageSpace(pointerPosition);

    // Snap to grid if enabled
    if (StateManager._snapToGridEnabled) {
      pos = StateManager.snapStageVectorToGrid(pos);
    }

    const newCommentRegion = new CommentRegion();
    let addCommentForward = (data: CreateCommentActionData) => {
      newCommentRegion.createKonvaObjects(
        data.x,
        data.y,
        CommentRegion.InitialWidth,
        CommentRegion.InitialHeight,
      );
      StateManager._commentRegions.push(newCommentRegion);
      StateManager._commentLayer?.add(newCommentRegion.nodeGroup);
      StateManager._commentLayer?.draw();

      data.commentRegion = newCommentRegion;
    };

    let addCommentBackward = (data: CreateCommentActionData) => {
      this.deleteCommentRegion(data.commentRegion);
    };

    let addCommentAction = new Action(
      "addCommentRegion",
      `Add Comment Region`,
      addCommentForward,
      addCommentBackward,
      { x: pos.x, y: pos.y, commentRegion: null },
      true,
    );
    UndoRedoManager.pushAction(addCommentAction);
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

    let pos = StateManager.toStageSpace(pointerPosition);

    // Snap to grid if enabled
    if (StateManager._snapToGridEnabled) {
      pos = StateManager.snapStageVectorToGrid(pos);
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
      { x: pos.x, y: pos.y, node: null },
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
      // Remove all transitions involving this node, then the node itself
      // (detachNode also clears the start state if needed)
      data.transitions.forEach((t) => StateManager.detachTransition(t));
      StateManager.detachNode(data.node);
      StateManager.updateTransitions();
    };

    let removeNodeBackward = (data: RemoveNodeActionData) => {
      StateManager.addNode(data.node);

      if (data.isStart) {
        StateManager.startNode = data.node;
      }

      data.transitions.forEach((t) => StateManager.addStateTransition(t));
      StateManager.updateTransitions();
      StateManager.selectObject(data.node);
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
        StackableAction.updateStartNodePosition(),
      );
      StackableAction.updateStartNodePosition();
      StateManager._startStateLine.visible(true);
    } else {
      StateManager._startStateLine.visible(false);
    }
  }

  public static setCommentRegionColor(
    comments: CommentRegion[],
    newColor: string,
  ) {
    let oldColors = comments.map((c) => c.color);

    let setColorForward = (data: SetCommentsColorActionData) => {
      data.comments.forEach((c) => {
        c.color = data.newColor;
      });
    };

    let setColorBackward = (data: SetCommentsColorActionData) => {
      data.comments.forEach((c, i) => {
        c.color = data.oldColors[i];
      });
    };

    let maybeS = comments.length == 1 ? "" : "s";
    let setCommentsColorAction = new Action(
      "setCommentRegionColor",
      `Set Color Of ${comments.length} Comment${maybeS}`,
      setColorForward,
      setColorBackward,
      { oldColors, newColor, comments },
      true,
    );

    UndoRedoManager.pushAction(setCommentsColorAction);
  }

  public static setCommentRegionText(
    comments: CommentRegion[],
    newText: string,
  ) {
    let oldTexts = comments.map((c) => c.text);

    let setTextForward = (data: SetCommentsTextActionData) => {
      data.comments.forEach((c) => {
        c.text = data.newText;
      });
    };

    let setTextBackward = (data: SetCommentsTextActionData) => {
      data.comments.forEach((c, i) => {
        c.text = data.oldTexts[i];
      });
    };

    let maybeS = comments.length == 1 ? "" : "s";
    let setCommentsTextAction = new Action(
      "setCommentRegionText",
      `Set Text Of ${comments.length} Comment${maybeS}`,
      setTextForward,
      setTextBackward,
      { oldTexts, newText, comments },
      true,
    );

    UndoRedoManager.pushAction(setCommentsTextAction);
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
      StateManager._tentConnectionLine.dash([20, 20]);
    } else if (
      StateManager.tentativeTransitionTarget ===
      StateManager._tentativeTransitionSource
    ) {
      // Set arrow to preview the loop transition
      StateManager._tentConnectionLine.points(
        TransitionWrapper.getLoopTransitionPoints(
          { x: 0, y: 0 },
          0,
          0 -
            NodeWrapper.NodeRadius -
            TransitionWrapper.LoopTransitionDist * 1.5,
        ),
      );
      StateManager._tentConnectionLine.tension(0.5);
      StateManager._tentConnectionLine.dash([9, 9]);
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
      StateManager._tentConnectionLine.dash([20, 20]);
    }
  }

  /**
   * Called when the user ends a tentative transition by releasing the mouse
   * button.
   * - If they were not hovering over a node, then the tentative
   * transition is simply discarded.
   * - If they were hovering over a node, and no transition previously existed
   * between the two nodes, then such a new transition is created and selected.
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
        StateManager.setSelection([existingTransition]);
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
    const originalSelected: SelectableObject[] = StateManager.selectedObjects;

    let addTransitionForward = (data: AddTransitionActionData) => {
      StateManager._transitionWrappers.push(data.transition);
      StateManager._transitionLayer.add(data.transition.konvaGroup);
      StateManager.deselectAllObjects();
      StateManager.selectObject(data.transition);
      StateManager.updateTransitions();
    };

    let addTransitionBackward = (data: AddTransitionActionData) => {
      StateManager._transitionWrappers =
        StateManager._transitionWrappers.filter((i) => i !== data.transition);
      data.transition.konvaGroup.remove();
      StateManager.deselectAllObjects();
      data.originalSelected.forEach(StateManager.selectObject);
      StateManager.updateTransitions();
    };

    let newData = new AddTransitionActionData(originalSelected);
    newData.transition = newTransition;

    let addTransitionAction = new Action(
      "addTransition",
      `Add Transition from "${source.labelText}" to "${dest.labelText}"`,
      addTransitionForward,
      addTransitionBackward,
      newData,
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
      StateManager.detachTransition(data.transition);
      StateManager.updateTransitions();
    };

    let removeTransitionBackward = (data: RemoveTransitionActionData) => {
      StateManager.addStateTransition(data.transition);
      StateManager.updateTransitions();
    };

    let removeTransitionAction = new Action(
      "removeTransition",
      `Remove Transition From "${transition.sourceNode.labelText}" To "${transition.destNode.labelText}"`,
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
   * Pushes actions to the action stack that add new tokens with symbols to
   * the automaton.
   * @param newSymbols An array of symbols to create new tokens for.
   */
  public static addTokensWithSymbols(newSymbols: string[]) {
    for (let i = 0; i < newSymbols.length; i++) {
      const newSymbol = newSymbols[i];

      // Check if the symbol is empty
      if (newSymbol === "") {
        continue;
      }

      // Check if the symbol already exists
      if (StateManager._alphabet.some((token) => token.symbol === newSymbol)) {
        continue;
      }

      // Create a new token and set its symbol
      const newToken = new TokenWrapper();
      newToken.symbol = newSymbol;

      // Define forward and backward actions for undo/redo
      let addTokenForward = (data: AddTokenActionData) => {
        StateManager._alphabet.push(data.token);
      };

      let addTokenBackward = (data: AddTokenActionData) => {
        StateManager._alphabet = StateManager._alphabet.filter(
          (i) => i !== data.token,
        );
      };

      // Create an action for adding the token
      let addTokenAction = new Action(
        "addToken",
        `Add Token "${newSymbol}"`,
        addTokenForward,
        addTokenBackward,
        { token: newToken, oldSymbol: "", newSymbol: newSymbol },
      );

      // Push the action to the undo/redo manager
      UndoRedoManager.pushAction(addTokenAction);
    }
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
      this.updateTransitions();
    };

    let setTokenSymbolBackward = (data: SetTokenSymbolActionData) => {
      data.token.symbol = data.oldSymbol;
      this.updateTransitions();
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

  /** Augments the selection in a way supported by the UndoRedoManager */
  public static addToSelection(objs: SelectableObject[]) {
    if (objs.length == 0) return;
    StateManager.setSelection(objs.concat(StateManager._selectedObjects));
  }
  /** Clears the selection in a way supported by the UndoRedoManager */
  public static clearSelection() {
    if (StateManager.selectedObjects.length == 0) return;
    StateManager.setSelection([]);
  }

  /** Sets the selection in a way supported by the UndoRedoManager */
  public static setSelection(objs: SelectableObject[]) {
    if (
      objs.concat(StateManager.selectedObjects).every((e: SelectableObject) => {
        return (
          objs.indexOf(e) > -1 && StateManager.selectedObjects.indexOf(e) > -1
        );
      })
    ) {
      return; //if the selection is the same, we don't do anything.
    }

    const forward = (data: ChangeSelectionActionData) => {
      StateManager._selectedObjects = data.newSelection;
      StateManager.setSelectedObjects(data.newSelection);

      data.oldSelection.forEach((e: SelectableObject) => {
        e.deselect();
      });
      data.newSelection.forEach((e: SelectableObject) => {
        e.select();
      });
    };
    const backward = (data: ChangeSelectionActionData) => {
      StateManager.setSelectedObjects(data.oldSelection);
      StateManager._selectedObjects = data.oldSelection;
      data.newSelection.forEach((e: SelectableObject) => {
        e.deselect();
      });
      data.oldSelection.forEach((e: SelectableObject) => {
        e.select();
      });
    };
    let action = new Action(
      "changeSelection",
      "Change Selection",
      forward,
      backward,
      { oldSelection: StateManager._selectedObjects, newSelection: objs },
      true,
    );
    UndoRedoManager.pushAction(action);
  }

  /**
   * Adds a given object directly to the current selection. Be wary, this is not undo-redo safe. Use addToSelection or setSelection instead if you want undo-redo safety.
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

  /** Directly removes all objects from the current selection. Be wary, this is not undo-redo safe. Use clearSelection or setSelection instead if you want undo-redo safety.*/
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

    // Copy selected comments
    const selectedComments = this._selectedObjects.filter(
      (obj) => obj instanceof CommentRegion,
    ) as CommentRegion[];

    const onlyComments: boolean =
      selectedNodes.length == 0 && selectedTransitions.length == 0;

    // Create an action to remove the selected objects
    let removeData = new RemoveNodeActionDataMulti(
      StateManager.selectedObjects,
    );

    removeData.nodes = selectedNodes;
    removeData.transitions = [
      ...selectedTransitions,
      ...transitionsInvolvingSelectedNodes.filter(
        (transition) => !selectedTransitions.includes(transition),
      ),
    ];
    removeData.comments = selectedComments;

    // Save start node if it's being removed
    removeData.wasStartNode = removeData.nodes.includes(StateManager.startNode);

    let totalObjects =
      removeData.nodes.length +
      removeData.transitions.length +
      removeData.comments.length;
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

      // Remove comment regions
      StateManager._commentRegions = StateManager._commentRegions.filter(
        (comment) => !data.comments.includes(comment),
      );
      data.comments.forEach((comment) => comment.nodeGroup.remove());

      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager._commentLayer?.draw();
      StateManager.updateTransitions();

      // Deselect all objects
      StateManager.deselectAllObjects();
    };

    let performRemoveBackward = (data: RemoveNodeActionDataMulti) => {
      // Add comment regions back
      StateManager._commentRegions.push(...data.comments);
      data.comments.forEach((comment) => {
        StateManager._commentLayer.add(comment.nodeGroup);
      });

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
      StateManager.deselectAllObjects();
      data.originalSelected.forEach(StateManager.selectObject);
      StateManager._nodeLayer?.draw();
      StateManager._transitionLayer?.draw();
      StateManager._commentLayer?.draw();
      StateManager.updateTransitions();
    };

    let removeAction = new Action(
      "deleteObjects",
      actionDescription,
      performRemoveForward,
      performRemoveBackward,
      removeData,
      onlyComments,
    );

    UndoRedoManager.pushAction(removeAction);
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
      (i) => !transitionsDependentOnDeletedNode.includes(i),
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
   * Immediately deletes the given commentRegion from the automaton
   *
   * **NOTE:** This method is *not* undo/redo safe.
   * @param comment The CommentRegion to remove.
   */
  public static deleteCommentRegion(comment: CommentRegion) {
    const index = StateManager._commentRegions.indexOf(comment);
    if (index > -1) StateManager._commentRegions.splice(index, 1);

    comment.nodeGroup.remove();
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

  static async waitForLeftOrRightKey(): Promise<number> {
    return new Promise((resolve) => {
      function keyHandler(event: KeyboardEvent) {
        if (event.code === "ArrowLeft") {
          resolve(StateManager.debugOptions.Left);
          cleanup();
        } else if (event.code === "ArrowRight") {
          resolve(StateManager.debugOptions.Right);
          cleanup();
        } else if (event.code === "Enter") {
          resolve(StateManager.debugOptions.KillDebug);
          cleanup();
        } else {
          resolve(StateManager.debugOptions.Other);
          cleanup();
        }
      }

      function buttonHandler() {
        resolve(StateManager.debugOptions.KillDebug);
        cleanup();
      }

      function debugChangeHandler() {
        resolve(StateManager.debugOptions.KillDebug);
        cleanup();
      }

      function cleanup() {
        window.removeEventListener("keydown", keyHandler);
        StateManager.unsubscribe(debugChangeHandler);
        if (testMachineButton) {
          testMachineButton.removeEventListener("click", buttonHandler);
        }
      }

      const testMachineButton = document.getElementById("testMachineButton");

      if (testMachineButton) {
        testMachineButton.addEventListener("click", buttonHandler);
      }

      window.addEventListener("keydown", keyHandler);
      StateManager.subscribe(debugChangeHandler); // Listen for debug mode changes
    });
  }

  public static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static unDebugHighlightAllObjects() {
    StateManager.nodeWrappers.forEach((e: NodeWrapper) => {
      e.debugUnHighlight();
    });
    StateManager.transitions.forEach((e: TransitionWrapper) => {
      e.debugUnHighlight();
    });
  }

  public static debugHighlightObject(object: NodeWrapper | TransitionWrapper) {
    if (object instanceof NodeWrapper) {
      object.debugHighlight();
    } else if (object instanceof TransitionWrapper) {
      object.debugHighlight();
    }
  }

  public static async debugMachine(path: string[]) {
    let LegalMoveFlag = 1;
    let pos = 0;

    while (1 == 1) {
      if (pos >= path.length) {
        pos = path.length - 1;
        LegalMoveFlag = 0;
      }
      if (pos < 0) {
        pos = 0;
        LegalMoveFlag = 0;
      }
      for (const n of StateManager._nodeWrappers) {
        if (n.labelText === path[pos] && LegalMoveFlag == 1) {
          StateManager.unDebugHighlightAllObjects();
          await StateManager.delay(100);
          StateManager.debugHighlightObject(n);
        }
      }
      let moveVal = await StateManager.waitForLeftOrRightKey();
      LegalMoveFlag = 1;
      if (moveVal == StateManager.debugOptions.KillDebug) {
        StateManager.unDebugHighlightAllObjects();
        break;
      } else {
        pos += moveVal;
      }
    }
  }

  /** Returns whether or not all node labels in the automaton are unique. */
  public static areAllLabelsUnique(): boolean {
    const labels = StateManager._nodeWrappers.map((node) => node.labelText);
    const uniqueLabels = new Set(labels);
    return labels.length === uniqueLabels.size;
  }

  /* Returns whether or not all tokens in the alphabet are unique */
  public static areAllTokensUnique(): boolean {
    const tokenSymbols = StateManager._alphabet.map((token) =>
      token.symbol.trim(),
    );
    const uniqueSymbols = new Set(tokenSymbols);
    return uniqueSymbols.size === tokenSymbols.length;
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
      return [false, "This automaton could not be read."];
    }

    if (!json.states.every((state) => this.isValidState(state))) {
      console.error("states not properly formatted");
      return [false, "This automaton's states could not be read."];
    }

    if (!json.alphabet.every((token) => this.isValidToken(token))) {
      console.error("alphabet not properly formatted");
      return [false, "This automaton's alphabet could not be read."];
    }

    if (
      !json.transitions.every((transition) =>
        this.isValidTransition(transition, json),
      )
    ) {
      console.error("Invalid 'transitions' format.");
      return [false, "This automaton's transitions could not be read."];
    }

    if (
      typeof json.startState !== "string" ||
      !json.states.some((state) => state.id === json.startState)
    ) {
      console.error("Invalid 'startState' format.");
      return [false, "This automaton's start state could not be read."];
    }

    if (!this.isArrayOfStrings(json.acceptStates)) {
      console.error("Invalid 'acceptStates' format.");
      return [false, "This automaton's accept states could not be read."];
    }

    return [true, ""];
  }

  private static isValidState(state: SerializableState): boolean {
    return (
      typeof state.id === "string" &&
      typeof state.x === "number" &&
      typeof state.y === "number" &&
      typeof state.label === "string"
    );
  }

  private static isValidToken(token: SerializableToken): boolean {
    return typeof token.id === "string" && typeof token.symbol === "string";
  }

  private static isValidTransition(
    transition: SerializableTransition,
    json: SerializableAutomaton,
  ): boolean {
    if (
      typeof transition.id !== "string" ||
      typeof transition.source !== "string" ||
      typeof transition.dest !== "string" ||
      typeof transition.isEpsilonTransition !== "boolean" ||
      !this.isArrayOfStrings(transition.tokens)
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

  private static isArrayOfStrings(value: any): boolean {
    return (
      Array.isArray(value) && value.every((item) => typeof item === "string")
    );
  }

  /** Sets whether or not dark mode is enabled. */
  public static set useDarkMode(val: boolean) {
    StateManager.makeClean();
    // Save new value
    this._useDarkMode = val;
    // Save value to storage
    if (StateManager.storageAvailable()) {
      localStorage.setItem("darkmode", val.toString());
    }

    this._nodeWrappers.forEach((n) => n.updateColorScheme());
    this._transitionWrappers.forEach((t) => t.updateColorScheme());
    this._commentRegions.forEach((c) => c.updateColorScheme());

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

  /**
   * Stores the initial position of one of the nodes at the beginning of a
   * node-dragging operation. This value is compared to the same node's
   * position as the drag operation continues, so that the same offset is
   * applied to all selected nodes and it appears the user is dragging all
   * nodes at once.
   * @param startPos The initial position of one of the nodes.
   */
  public static startDragStatesOperation(startPos: Vector2d) {
    StackableAction._dragStatesStartPosition = startPos;
  }

  /** The initial position of one of the comment regions when comments are dragged. */
  private static _dragCommentsStartPosition: Vector2d | null = null;

  /**
   * Stores the initial position of one of the comments being dragged. Use for
   * undo / redo operations for moving comment regions.
   * @param startPos The initial position of one of the comments.
   */
  public static startDragCommentsOperation(startPos: Vector2d) {
    this._dragCommentsStartPosition = startPos;
  }

  /**
   * Pushes an action to the action stack that moves the selected comments
   * by a certain amount.
   * @param finalPos The final position of the same comment as was used for
   * `StateManager.startDragCommentsOperation` at the beginning of this drag
   * operation.
   */
  public static completeDragCommentsOperation(finalPos: Vector2d) {
    let startPos = this._dragCommentsStartPosition;
    let endPos = finalPos;
    let delta: Vector2d = {
      x: endPos.x - startPos.x,
      y: endPos.y - startPos.y,
    };

    let moveCommentsForward = (data: MoveCommentsActionData) => {
      data.comments.forEach((comment) => {
        comment.setPosition({
          x: comment.nodeGroup.position().x + delta.x,
          y: comment.nodeGroup.position().y + delta.y,
        });
      });
    };

    let moveCommentsBackward = (data: MoveCommentsActionData) => {
      data.comments.forEach((comment) => {
        comment.setPosition({
          x: comment.nodeGroup.position().x - delta.x,
          y: comment.nodeGroup.position().y - delta.y,
        });
      });
    };

    let maybeS = this.selectedObjects.length == 1 ? "" : "s";
    let moveCommentsAction = new Action(
      "moveComments",
      `Move ${this.selectedObjects.length} Comment${maybeS}`,
      moveCommentsForward,
      moveCommentsBackward,
      { delta: delta, comments: [...this.selectedObjects] },
      true,
    );

    UndoRedoManager.pushAction(moveCommentsAction, false);
  }

  /** The initial position of the comment region when resized. */
  private static _resizeCommentStartPosition: Vector2d | null = null;

  /** The initial size of the comment region when resized. */
  private static _resizeCommentStartSize: Vector2d | null = null;

  public static startResizeCommentOperation(comment: CommentRegion) {
    comment.nodeGroup.draggable(false);
    StateManager._resizeComment = comment;
    StateManager._resizeCommentStartSize = comment.getSize();
    StateManager._resizeCommentStartPosition = comment.konvaObject.position();
  }

  public static endResizeCommentOperation() {
    let endSize = StateManager._resizeComment.getSize();
    let endPos = StateManager._resizeComment.konvaObject.position();

    let resizeCommentForward = (data: ResizeCommentActionData) => {
      data.comment.konvaObject.position(endPos);
      data.comment.setSize(endSize);
    };

    let resizeCommentBackward = (data: ResizeCommentActionData) => {
      data.comment.konvaObject.position(data.oldPos);
      data.comment.setSize(data.oldSize);
    };

    let resizeCommentAction = new Action(
      "resizeComment",
      `Resize Comment`,
      resizeCommentForward,
      resizeCommentBackward,
      {
        oldPos: StateManager._resizeCommentStartPosition,
        oldSize: StateManager._resizeCommentStartSize,
        comment: StateManager._resizeComment,
      },
      true,
    );

    UndoRedoManager.pushAction(resizeCommentAction, false);

    StateManager._resizeComment.nodeGroup.draggable(true);
    StateManager._resizeComment.resizing = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    // make sure comment stays selected
    StateManager.selectObject(StateManager._resizeComment);
    StateManager._resizeComment = null;
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
}

/** Holds the data associated with a "change selection" action */
class ChangeSelectionActionData extends ActionData {
  /** The old selection set before the action was taken */
  public oldSelection: SelectableObject[] = [];

  /** The new selection set after the action was taken */
  public newSelection: SelectableObject[] = [];
}
