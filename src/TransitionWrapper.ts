import Konva from "konva";
import NodeWrapper from "./NodeWrapper";
import SelectableObject from "./SelectableObject";
import StateManager, { SerializableTransition } from "./StateManager";
import { Tool } from "./Tool";
import TokenWrapper from "./TokenWrapper";
import { v4 as uuidv4 } from "uuid";

/**
 * The class that holds transition information (source node, destination node,
 * and accepted tokens).
 */
export default class TransitionWrapper extends SelectableObject {
  public static readonly ExtraTransitionArrowPadding = 5;
  public static readonly LoopTransitionDist = 20;

  private arrowObject: Konva.Arrow;
  private labelObject: Konva.Text;
  private labelCenterDebugObject: Konva.Circle;
  public konvaGroup: Konva.Group;

  private _sourceNode: NodeWrapper;
  transitionId: string;
  isCurved: boolean;
  priority: string;

  /** The node that this transition is coming from. */
  public get sourceNode() {
    return this._sourceNode;
  }

  private _destNode: NodeWrapper;

  /** The node that this transition leads to. */
  public get destNode() {
    return this._destNode;
  }

  private _tokens: Set<TokenWrapper>;

  private _isEpsilonTransition: boolean;

  private readonly _id: string;

  /**
   * A unique ID which persists for this transition.
   * Useful for serialization and deserialization to maintain references.
   */
  public get id() {
    return this._id;
  }

  /** Gets the tokens associated with this transition. */
  public get tokens(): Set<TokenWrapper> {
    return this._tokens;
  }

  /**
   * Constructs a new transition wrapper that connects one node to another
   * on specific tokens.
   * @param sourceNode The node that this transition is coming from.
   * @param destNode The node that this transition leads to.
   * @param isEpsilonTransition Whether or not this transition should accept the empty string.
   * @param tokens A collection of tokens that this transition should accept.
   */
  constructor(
    sourceNode: NodeWrapper,
    destNode: NodeWrapper,
    isEpsilonTransition: boolean | null = null,
    tokens: Array<TokenWrapper> | Set<TokenWrapper> | null = null,
  ) {
    super();
    this._id = uuidv4();
    this._sourceNode = sourceNode;
    this._destNode = destNode;
    this._tokens = new Set(tokens) ?? new Set<TokenWrapper>();
    this._isEpsilonTransition = isEpsilonTransition ?? false;

    const existingTransitions = StateManager.transitions.filter(
      (t) =>
        (t.sourceNode.id === sourceNode.id && t.destNode.id === destNode.id) ||
        (t.sourceNode.id === destNode.id && t.destNode.id === sourceNode.id),
    );

    //this.priority = existingTransitions.length === 0 ? 'first' : 'second';
    if (existingTransitions.length === 0) {
      this.priority = "straight";
    } else {
      existingTransitions[0].priority = "curve";
      this.priority = "curve";
      existingTransitions[0].updatePoints();
    }

    this.konvaGroup = new Konva.Group();

    this.arrowObject = new Konva.Arrow({
      x: 0,
      y: 0,
      points: [0, 0, 0, 0],
      stroke: StateManager.colorScheme.transitionArrowColor,
      fill: StateManager.colorScheme.transitionArrowColor,
      strokeWidth: 5,
      lineJoin: "round",
      pointerLength: 10,
      pointerWidth: 10,
    });

    this.labelCenterDebugObject = new Konva.Circle({
      x: 0,
      y: 0,
      radius: 3,
      fill: "magenta",
    });

    this.labelObject = new Konva.Text({
      x: 0,
      y: 0,
      align: "center",
      verticalAlign: "middle",
      text: "label here",
      fontSize: 20,
      fill: StateManager.colorScheme.transitionLabelColor,
    });

    this.konvaGroup.add(this.arrowObject);
    this.konvaGroup.add(this.labelCenterDebugObject);
    this.konvaGroup.add(this.labelObject);

    this.updatePoints();

    this.konvaGroup.on("click", (ev) => this.onClick.call(this, ev));
    this._sourceNode.nodeGroup.on("move.transition", (ev) =>
      this.updatePoints.call(this),
    );
    this._destNode.nodeGroup.on("move.transition", (ev) =>
      this.updatePoints.call(this),
    );
  }

  /**
   * Sets the text for the token label to match the tokens the transition
   * accepts.
   */
  private resetLabel() {
    let text = [];
    if (this.isEpsilonTransition) {
      text.push("ε");
    }

    this._tokens.forEach((tok) => text.push(tok.symbol));
    this.labelObject.text(text.join(","));
  }

  /**
   * Updates the positioning of the transition's start and end points so that
   * it lines up with the nodes it is related to.
   */
  public updatePoints() {
    this.resetLabel();

    if (this._sourceNode === this._destNode) {
      this.handleSameSourceAndDest();
    } else {
      const srcPos = this._sourceNode.nodeGroup.position();
      const dstPos = this._destNode.nodeGroup.position();

      if (this.priority === "curve") {
        this.handleCurvePriority(srcPos, dstPos);
      } else {
        this.handleDefaultPriority(srcPos, dstPos);
      }
    }
  }

  /**
   * Sets up the shape of the transition arrow in the case where the source
   * and destination nodes are the same (i.e., a looping transition).
   */
  handleSameSourceAndDest() {
    const srcPos = this._sourceNode.nodeGroup.position();
    const DIST = TransitionWrapper.LoopTransitionDist;

    const centerPtX = srcPos.x;
    const centerPtY = srcPos.y - NodeWrapper.NodeRadius - DIST * 1.5;
    const pointsArray = TransitionWrapper.getLoopTransitionPoints(
      srcPos,
      centerPtX,
      centerPtY,
    );

    this.updateArrow(pointsArray, 0.5);
    this.updateLabelPosition(centerPtX, centerPtY - 20);
    this.updateLabelCenterDebugPosition(centerPtX, centerPtY);
  }

  /**
   * Calculates points for the transition arrow in the case where the source
   * and destination nodes are the same (i.e., a looping transition).
   * @param srcPos The position of the source node.
   * @param centerPtX x-val of center point of the arrow's loop (generally srcPos.x).
   * @param centerPtY y-val of center point of the arrow's loop (generally srcPos.y - NodeWrapper.NodeRadius - DIST * 1.5).
   * @returns An array of four numbers representing the points in an arrow that represents a loop transition.
   */
  static getLoopTransitionPoints(
    srcPos: { x: number; y: number },
    centerPtX: number,
    centerPtY: number,
  ): number[] {
    const ANGLE = 75.0 * (Math.PI / 180.0);
    const DIST = TransitionWrapper.LoopTransitionDist;

    const pointsArray = [
      srcPos.x + NodeWrapper.NodeRadius * Math.cos(ANGLE),
      srcPos.y - NodeWrapper.NodeRadius * Math.sin(ANGLE),
      srcPos.x +
        NodeWrapper.NodeRadius * Math.cos(ANGLE) +
        DIST * Math.cos(ANGLE),
      srcPos.y -
        NodeWrapper.NodeRadius * Math.sin(ANGLE) -
        DIST * Math.sin(ANGLE),
      centerPtX,
      centerPtY,
      srcPos.x -
        NodeWrapper.NodeRadius * Math.cos(ANGLE) -
        DIST * Math.cos(ANGLE),
      srcPos.y -
        NodeWrapper.NodeRadius * Math.sin(ANGLE) -
        DIST * Math.sin(ANGLE),
      srcPos.x -
        NodeWrapper.NodeRadius * Math.cos(ANGLE) -
        TransitionWrapper.ExtraTransitionArrowPadding * Math.cos(ANGLE),
      srcPos.y -
        NodeWrapper.NodeRadius * Math.sin(ANGLE) -
        TransitionWrapper.ExtraTransitionArrowPadding * Math.sin(ANGLE),
    ];
    return pointsArray;
  }

  /**
   * Updates the transition arrow when there are two transitions between the
   * source and destination node, like a two-node-loop. In this case, the
   * transition arrows are curved so they don't overlap.
   * @param srcPos The position of the source node.
   * @param dstPos The position of the destination node.
   */
  handleCurvePriority(
    srcPos: { x: number; y: number },
    dstPos: { x: number; y: number },
  ) {
    const angle = Math.atan2(dstPos.y - srcPos.y, dstPos.x - srcPos.x);
    const curveSize = 40;
    const textOffset = curveSize + 20;
    const midPoint = {
      x: (srcPos.x + dstPos.x) / 2,
      y: (srcPos.y + dstPos.y) / 2,
    };
    const normalVectorXComponent = Math.cos(angle + Math.PI / 2);
    const normalVectorYComponent = Math.sin(angle + Math.PI / 2);

    const pointsArray = [
      srcPos.x + NodeWrapper.NodeRadius * Math.cos(angle + Math.PI / 8),
      srcPos.y + NodeWrapper.NodeRadius * Math.sin(angle + Math.PI / 8),
      midPoint.x + curveSize * normalVectorXComponent,
      midPoint.y + curveSize * normalVectorYComponent,
      dstPos.x -
        (NodeWrapper.NodeRadius +
          TransitionWrapper.ExtraTransitionArrowPadding) *
          Math.cos(angle - Math.PI / 8),
      dstPos.y -
        (NodeWrapper.NodeRadius +
          TransitionWrapper.ExtraTransitionArrowPadding) *
          Math.sin(angle - Math.PI / 8),
    ];

    this.updateArrow(pointsArray, 0.5);
    this.updateLabelPosition(
      midPoint.x + textOffset * normalVectorXComponent,
      midPoint.y + textOffset * normalVectorYComponent,
    );
    this.updateLabelCenterDebugPosition(
      midPoint.x + curveSize * normalVectorXComponent,
      midPoint.y + curveSize * normalVectorYComponent,
    );
  }

  /**
   * Updates the transition arrow in the "default" case (i.e., no loop and no
   * back-and-forth). In this case, the arrow can just go straight from the
   * source node to the destination node.
   * @param srcPos The position of the source node.
   * @param dstPos The position of the destination node.
   */
  handleDefaultPriority(
    srcPos: { x: number; y: number },
    dstPos: { x: number; y: number },
  ) {
    const unitVector = this.calculateUnitVectorTowardsSrc(srcPos, dstPos);
    const xAvg = (srcPos.x + unitVector.x + (dstPos.x - unitVector.x)) / 2;
    const yAvg = (srcPos.y + unitVector.y + (dstPos.y - unitVector.y)) / 2;

    this.updateArrow(
      [srcPos.x, srcPos.y, dstPos.x - unitVector.x, dstPos.y - unitVector.y],
      0,
    );
    this.updateLabelPosition(xAvg, yAvg);
    this.updateLabelCenterDebugPosition(xAvg, yAvg);
  }

  /**
   * Calculates a vector pointing towards the source node(?)
   * @param srcPos The position of the source node.
   * @param dstPos The position of the destination node.
   * @returns A vector of magnitude 1(?) pointing towards the source node.
   */
  calculateUnitVectorTowardsSrc(
    srcPos: { x: number; y: number },
    dstPos: { x: number; y: number },
  ) {
    const xDestRelativeToSrc = dstPos.x - srcPos.x;
    const yDestRelativeToSrc = dstPos.y - srcPos.y;
    const magnitude = Math.sqrt(
      xDestRelativeToSrc * xDestRelativeToSrc +
        yDestRelativeToSrc * yDestRelativeToSrc,
    );
    const newMag =
      NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding;
    const xUnitTowardsSrc = (xDestRelativeToSrc / magnitude) * newMag;
    const yUnitTowardsSrc = (yDestRelativeToSrc / magnitude) * newMag;

    return { x: xUnitTowardsSrc, y: yUnitTowardsSrc };
  }

  /**
   * Updates the transition arrow to pass through the given points.
   * @param pointsArray An array of points that the arrow passes through.
   * @param tension
   */
  updateArrow(pointsArray: number[], tension: number) {
    this.arrowObject.points(pointsArray);
    this.arrowObject.tension(tension);
  }

  /** Updates the position of the token label to the given position. */
  updateLabelPosition(x: number, y: number) {
    this.labelObject.position({ x, y });
  }

  /**
   * Updates the position of the label-center debug object to the given
   * position.
   */
  updateLabelCenterDebugPosition(x: number, y: number) {
    this.labelCenterDebugObject.position({ x, y });
  }

  /**
   * Checks if a given node is either the source or destination node for this
   * transition.
   * @param node The node to check for a relationship to.
   * @returns {boolean} `true` if the given node is either the source or
   * destination node for this transition, and `false` otherwise.
   */
  public involvesNode(node: NodeWrapper): boolean {
    return this._sourceNode === node || this._destNode === node;
  }

  /**
   * Handles the transition being clicked on.
   * @param ev
   */
  public onClick(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Select) {
      // If shift isn't being held, then clear all previous selection
      if (!ev.evt.shiftKey) {
        StateManager.deselectAllObjects();
      }
      StateManager.selectObject(this);
    }
  }

  /**
   * Updates the appearance of the transition to be selected (i.e., in light
   * mode, the arrow and labels appear red).
   */
  public select(): void {
    this.arrowObject.fill(
      StateManager.colorScheme.transitionSelectedArrowColor,
    );
    this.arrowObject.stroke(
      StateManager.colorScheme.transitionSelectedArrowColor,
    );
  }

  /**
   * Updates the appearance of the transition to be unselected (i.e., in
   * light mode, the arrow and labels appear dark.)
   */
  public deselect(): void {
    this.arrowObject.fill(StateManager.colorScheme.transitionArrowColor);
    this.arrowObject.stroke(StateManager.colorScheme.transitionArrowColor);
  }

  /**
   * Returns the Konva group that visualizes this transition, including
   * the arrow and token labels.
   * @returns {Konva.Node}
   */
  public get konvaObject(): Konva.Node {
    return this.konvaGroup;
  }

  /**
   * Deletes the Konva group that visualizes this transition.
   *
   * **NOTE:** If they are destroyed, they will need to be recreated next time
   * we want to place them on the canvas. Chances are this shouldn't need
   * to be called.
   */
  public deleteKonvaObjects(): void {
    this.konvaGroup.destroy();
  }

  /**
   * Makes this transition accept the given token.
   * @param tok The token to add.
   */
  public addToken(tok: TokenWrapper) {
    this._tokens.add(tok);
    this.updatePoints();
  }

  /**
   * Makes this transition not accept the given token.
   * @param tok The token to remove.
   */
  public removeToken(tok: TokenWrapper) {
    this._tokens.delete(tok);
    this.updatePoints();
  }

  /**
   * Checks if this transition accepts the given token.
   * @param tok The token to check for acceptance of.
   */
  public hasToken(tok: TokenWrapper): boolean {
    return this._tokens.has(tok);
  }

  /**
   * Makes this transition accept or not accept an empty string.
   */
  public set isEpsilonTransition(value: boolean) {
    this._isEpsilonTransition = value;
    this.updatePoints();
  }

  /**
   * Checks if this transition accepts the empty string.
   */
  public get isEpsilonTransition(): boolean {
    return this._isEpsilonTransition;
  }

  /**
   * Converts this transition wrapper into an object that can be serialized.
   * @returns {SerializableTransition} The serializable transition object.
   */
  public toSerializable(): SerializableTransition {
    return {
      id: this.id,
      source: this._sourceNode.id,
      dest: this._destNode.id,
      isEpsilonTransition: this.isEpsilonTransition,
      tokens: Array.from(this._tokens.values()).map((tok) => tok.id),
    };
  }

  /**
   * Updates the transition arrow and token labels to match the current
   * color scheme (light/dark mode).
   */
  public updateColorScheme() {
    this.arrowObject.fill(StateManager.colorScheme.transitionArrowColor);
    this.arrowObject.stroke(StateManager.colorScheme.transitionArrowColor);
    this.labelObject.fill(StateManager.colorScheme.transitionLabelColor);
  }
}
