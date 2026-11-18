import NodeWrapper from "../../NodeWrapper";
import SelectableObject from "../../SelectableObject";
import TransitionWrapper from "../../TransitionWrapper";
import CommentRegion from "../../CommentRegion";
import DetailsBox_NoSelection from "./DetailsBox_NoSelection";
import DetailsBox_StateSelection from "./DetailsBox_StateSelection";
import DetailsBox_TransitionSelection from "./DetailsBox_TransitionSelection";
import DetailsBox_CommentSelection from "./DetailsBox_CommentSelection";

interface DetailsBoxProps {
  selection: Array<SelectableObject>;
  startNode: NodeWrapper;
  setStartNode: React.Dispatch<React.SetStateAction<NodeWrapper>>;
  isDebugActive: boolean;
}

/**
 * Displays editors for each selected item in the left-hand panel.
 * @param props
 * @param {Array<SelectableObject>} selection An array of the currently-selected
 * objects.
 * @param {NodeWrapper} startNode The node currently selected as the start node.
 * @param {React.Dispatch<React.SetStateAction<NodeWrapper>>} setStartNode A function
 * to call for setting the start node to another node.
 * @param {boolean} isDebugActive if true, we are in debug mode.
 *
 * @returns
 */
export default function DetailsBox(props: DetailsBoxProps) {
  // seperate the selection into two, nodes and transitions
  const selectedNodes = props.selection.filter(
    (item) => item instanceof NodeWrapper,
  ) as NodeWrapper[];
  const selectedTransitions = props.selection.filter(
    (item) => item instanceof TransitionWrapper,
  ) as TransitionWrapper[];
  const selectedComments = props.selection.filter(
    (item) => item instanceof CommentRegion,
  ) as CommentRegion[];

  let selectionElements = [];

  // display a transition editor if at least one transition is selected
  if (selectedTransitions.length > 0) {
    const combinedKey = selectedTransitions.map((t) => t.id).join("-");
    selectionElements.push(
      <DetailsBox_TransitionSelection
        key={combinedKey}
        transitions={selectedTransitions}
        isDebugActive={props.isDebugActive}
      />,
    );
  }

  // display a node editor if at least one node is selected
  if (selectedNodes.length > 0) {
    const combinedKey = selectedNodes.map((node) => node.id).join("-");
    selectionElements.unshift(
      <DetailsBox_StateSelection
        key={combinedKey}
        nodeWrappers={selectedNodes}
        startNode={props.startNode}
        setStartNode={props.setStartNode}
        isDebugActive={props.isDebugActive}
      />,
    );
  }

  // display a comment region editor if at least one comment is selected
  if (selectedComments.length > 0) {
    const combinedKey = selectedComments.map((comment) => comment.id).join("-");
    selectionElements.push(
      <DetailsBox_CommentSelection
        key={combinedKey}
        comments={selectedComments}
      />,
    );
  }

  return (
    <div className="details-box flex flex-col h-min">
      <div className="flex-1 overflow-auto">
        {selectionElements.length > 0 ? (
          selectionElements
        ) : (
          <DetailsBox_NoSelection />
        )}
      </div>
    </div>
  );
}
