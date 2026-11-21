/**
 * Pushes an action to the action stack that sets the accept status of the
 * given nodes.
 * @param nodes The nodes to set the accept status of.
 * @param isAccept Whether or not the given nodes should be an accepting node.
 */
import NodeWrapper from "../NodeWrapper";
import UndoRedoManager, {
  Action,
  ActionData,
} from "../Managers/UndoRedoManager";
import StateManager from "./StateManager";
import { Vector2d } from "konva/lib/types";
import CommentRegion from "../CommentRegion";
import TransitionWrapper from "../TransitionWrapper";
import TokenWrapper from "../TokenWrapper";

import SelectableObject from "../SelectableObject";

/** Holds the data associated with a "set nodes is accept node" action. */
export class SetNodesIsAcceptActionData extends ActionData {
  /** Whether or not the old nodes were an accept node before this action. */
  public oldValues: boolean[];

  /** Whether or not the nodes were an accept node after this action. */
  public newValue: boolean;

  /** The nodes to set the accept status of in this action. */
  public nodes: NodeWrapper[];
}

/** Holds the data associated with a "move nodes" action. */
class MoveStatesActionData extends ActionData {
  /** The amount by which nodes were moved in this action. */
  public delta: Vector2d;

  /** The nodes moved in this action. */
  public states: Array<NodeWrapper>;
}

export class StackableAction {
  /** The initial position of one of the nodes when nodes are dragged. */
  static _dragStatesStartPosition: Vector2d | null = null;

  /**
   * Updates the position of the start node arrow to align with the
   * automaton's start node.
   */
  public static updateStartNodePosition() {
    StateManager._startStateLine.absolutePosition(
      StateManager._startNode.nodeGroup.absolutePosition(),
    );
  }

  public static setNodesIsAccept(nodes: NodeWrapper[], isAccept: boolean) {
    if (StateManager.isDebugEnabled()) return;
    const oldValues = nodes.map((node) => node.isAcceptNode);

    const setNodesIsAcceptForward = (data: SetNodesIsAcceptActionData) => {
      data.nodes.forEach((node) => {
        node.isAcceptNode = data.newValue;
      });
    };

    const setNodesIsAcceptBackward = (data: SetNodesIsAcceptActionData) => {
      data.nodes.forEach((node, i) => {
        node.isAcceptNode = data.oldValues[i];
      });
    };

    let actionStackLabel;

    if (nodes.length == 1) {
      actionStackLabel = `Mark "${nodes[0].labelText}" As ${isAccept ? "Accepting" : "Rejecting"}`;
    } else {
      actionStackLabel = `Mark ${nodes.length} Selected States As ${isAccept ? "Accepting" : "Rejecting"}`;
    }

    const setNodesIsAcceptAction = new Action(
      "setNodesIsAccept",
      actionStackLabel,
      setNodesIsAcceptForward,
      setNodesIsAcceptBackward,
      { oldValues: oldValues, newValue: isAccept, nodes: nodes },
    );
    UndoRedoManager.pushAction(setNodesIsAcceptAction);
  }

  /**
   * Pushes an action to the action stack that moves the selected nodes
   * by a certain amount.
   * @param finalPos The final position of the same node as was used for
   * `StateManager.startDragStatesOperation` at the beginning of this drag
   * operation.
   */
  public static completeDragStatesOperation(finalPos: Vector2d) {
    const startPos = this._dragStatesStartPosition;
    const endPos = finalPos;
    const delta: Vector2d = {
      x: endPos.x - startPos.x,
      y: endPos.y - startPos.y,
    };

    const moveStatesForward = (data: MoveStatesActionData) => {
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
    if (StateManager.selectedObjects.length > 1) {
      moveStatesString += `${StateManager.selectedObjects.length} Nodes`;
    } else if (StateManager.selectedObjects.length == 1) {
      const singleState = StateManager.selectedObjects[0] as NodeWrapper;
      moveStatesString += `"${singleState.labelText}"`;
    }

    const moveNodesAction = new Action(
      "moveStates",
      moveStatesString,
      moveStatesForward,
      moveStatesBackward,
      { delta: delta, states: [...StateManager.selectedObjects] },
    );

    UndoRedoManager.pushAction(moveNodesAction, false);
  }
}

/** Holds the data associated with a "resize comment" action. */
export class ResizeCommentActionData extends ActionData {
  /** The old size before the action was taken */
  public oldSize: Vector2d;

  /** The old position before the action was taken */
  public oldPos: Vector2d;

  /** The comment being resized in this action. */
  public comment: CommentRegion;
}

/** Holds the data associated with a "set comments text" action. */
export class SetCommentsTextActionData extends ActionData {
  /** The old texts before the action was taken */
  public oldTexts: string[];

  /** The old text after the action was taken */
  public newText: string;

  public comments: CommentRegion[];
}

/** Holds the data associated with a "move comments" action. */
export class MoveCommentsActionData extends ActionData {
  /** The amount by which comments were moved in this action. */
  public delta: Vector2d;

  /** The comments moved in this action. */
  public comments: CommentRegion[];
}

/** Holds the data associated with a "set comments color" action. */
export class SetCommentsColorActionData extends ActionData {
  /** The old colors before the action was taken */
  public oldColors: string[];

  /** The old color after the action was taken */
  public newColor: string;

  public comments: CommentRegion[];
}

/** Holds the data associated with a "paste" action. */
export class PasteActionData extends ActionData {
  /** The nodes created in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions created in this action. */
  public transitions: TransitionWrapper[] = [];
}

/** Holds the data associated with a "cut" action. */
export class CutActionData extends ActionData {
  /** The nodes removed in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions removed in this action. */
  public transitions: TransitionWrapper[] = [];

  /** Whether any of the nodes removed were the start node. */
  public wasStartNode: boolean = false;
}

/** Holds the data associated with a "create comment" action. */
export class CreateCommentActionData extends ActionData {
  /** The X coordinate where the comment region is created. */
  public x: number;

  /** The Y coordinate where the comment region is created. */
  public y: number;

  /** The comment region created in this action. */
  public commentRegion: CommentRegion;
}

/** Holds the data associated with an "add token to automaton" action. */
export class AddTokenActionData extends ActionData {
  /** The token created in this action. */
  public token: TokenWrapper;
}

/** Holds the data associated with a "remove token from automaton" action. */
export class RemoveTokenActionData extends ActionData {
  /** The token removed in this action. */
  public token: TokenWrapper;

  /**
   * Transitions using this token at the time of this action, which must
   * also have the token removed from them.
   */
  public transitionsUsingToken: TransitionWrapper[];
}

/** Holds the data associated with a "set token symbol" action. */
export class SetTokenSymbolActionData extends ActionData {
  /** The symbol for this token before this action. */
  public oldSymbol: string;

  /** The symbol for this token after this action. */
  public newSymbol: string;

  /** The token modified in this action. */
  public token: TokenWrapper;
}

/** Holds the data associated with a "create node" action. */
export class CreateNodeActionData extends ActionData {
  /** The X coordinate where the node is created. */
  public x: number;

  /** The Y coordinate where the node is created. */
  public y: number;

  /** The node created in this action. */
  public node: NodeWrapper;
}

/** Holds the data associated with a "remove node" action. */
export class RemoveNodeActionData extends ActionData {
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
export class RemoveNodeActionDataMulti extends ActionData {
  /** The nodes removed in this action. */
  public nodes: NodeWrapper[] = [];

  /** The transitions removed in this action. */
  public transitions: TransitionWrapper[] = [];

  /** The comment regions removed in this action. */
  public comments: CommentRegion[] = [];

  /**
   * The objects that were selected before removal. We need this stored because we otherwise can't tell if a transition was selected.
   */
  public originalSelected: SelectableObject[];

  /** Whether any of the nodes removed were the start node. */
  public wasStartNode: boolean = false;

  constructor(originalSelected: SelectableObject[]) {
    super();
    this.originalSelected = originalSelected;
  }
}

/** Holds the data associated with a "set node name" action. */
export class SetNodeNameActionData extends ActionData {
  /** The name of the node before this action. */
  public oldName: string;

  /** The name of the node after this action. */
  public newName: string;

  /** The node renamed in this action. */
  public node: NodeWrapper;
}

/** Holds the data associated with a "set node as start node" action. */
export class SetNodeIsStartActionData extends ActionData {
  /** The node that was the start node before this action. */
  public oldStart: NodeWrapper;

  /** The node that was the start node after this action. */
  public newStart: NodeWrapper;
}

/** Holds the data associated with an "add transition" action. */
/** Holds the data associated with an "add transition" action. */
export class AddTransitionActionData extends ActionData {
  /** The transition created in this action. */
  public transition: TransitionWrapper;

  /** Objects that were selected before the transition was added */
  public originalSelected: SelectableObject[];

  constructor(originalSelected: SelectableObject[]) {
    super();
    this.originalSelected = originalSelected;
  }
}

/** Holds the data associated with a "remove transition" action. */
export class RemoveTransitionActionData extends ActionData {
  /** The transition removed in this action. */
  public transition: TransitionWrapper;
}

/** Holds the data associated with a "add/remove token to transition" action. */
export class SetTransitionAcceptsTokenData extends ActionData {
  /** The transition modified in this action. */
  public transition: TransitionWrapper;

  /** The token added to or removed from the transition in this action. */
  public token: TokenWrapper;
}
