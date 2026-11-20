import { useState, useEffect } from "react";
import CommentRegion from "../../CommentRegion";
import SelectableObject from "../../SelectableObject";
import StateManager from "../../StateManager";
import { useActionStack } from "../../utilities/ActionStackUtilities";
import { CoreListItem, CoreListItem_Left, ListItem } from "../ListItem";
import NodeWrapper from "../../NodeWrapper";

interface DetailsBox_CommentSelectionProps {
  comments: CommentRegion[];
}

interface DetailsBox_CommentNodeProps {
  comments: CommentRegion[];
  node: NodeWrapper;
}

function DetailsBox_CommentNode(props: DetailsBox_CommentNodeProps) {
  const node: NodeWrapper = props.node;
  const comments: CommentRegion[] = props.comments;

  const allInclude: boolean = comments.every((comment: CommentRegion) => {
    return comment.isNodeInCommentGroup(node);
  });
  const noneInclude: boolean = comments.every((comment: CommentRegion) => {
    return !comment.isNodeInCommentGroup(node);
  });

  const [nodeIsIncluded, setNodeIsIncluded] = useState(
    noneInclude ? false : allInclude || undefined,
  );

  let updateNodeIsIncluded = (isIncluded: boolean) => {
    setNodeIsIncluded(isIncluded);

    if (isIncluded) {
      comments.forEach((t: CommentRegion) => {
        if (t.isNodeInCommentGroup(node)) return;
        StateManager.addNodeToComment(t, node);
      });
    } else {
      comments.forEach((t: CommentRegion) => {
        if (!t.isNodeInCommentGroup(node)) return;
        StateManager.removeNodeFromComment(t, node);
      });
    }
  };

  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setNodeIsIncluded(noneInclude ? false : allInclude || undefined);
  }, [currentStackLocation]);

  let includeNodeInput = (
    <input
      type="checkbox"
      id="is-epsilon-transition"
      name="is-epsilon-transition"
      checked={nodeIsIncluded}
      ref={(input) => {
        if (input) {
          input.indeterminate = nodeIsIncluded === undefined;
        }
      }}
      onChange={(e) => updateNodeIsIncluded(e.target.checked)}
    ></input>
  );

  return (
    <ListItem
      key={node.id}
      title={node.labelText}
      rightContent={includeNodeInput}
    />
  );
}

/**
 * Creates the UI for modifying one or more nodes, including its label, whether it is an
 * accepting node, and whether it is the designated start node.
 * @param props
 * @param {NodeWrapper} props.nodeWrapper The node that this editor will modify.
 * @param {NodeWrapper} props.startNode The node currently marked as the start node.
 * @param {React.Dispatch<React.SetStateAction<NodeWrapper>>} props.setStartNode
 * A function for setting the start node.
 * @returns
 */
export default function DetailsBox_StateSelection(
  props: DetailsBox_CommentSelectionProps,
) {
  const comments = props.comments as CommentRegion[];

  const isMultiSelection = comments.length > 1;

  const [commentText, setCommentText] = useState(comments[0].text);
  const [regionColor, setRegionColor] = useState(comments[0].color);

  let updateText = (newText: string) => {
    setCommentText(newText);
    StateManager.setCommentRegionText(comments, newText);
  };

  let updateColor = (newColor: string) => {
    setRegionColor(newColor);
    comments.forEach((c) => c.setKonvaColors(newColor));
  };

  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setCommentText(comments[0].text);
    setRegionColor(comments[0].color);
  }, [currentStackLocation]);

  let commentTextInput = (
    <input
      className="float-right align-bottom bg-transparent text-right"
      type="text"
      placeholder="description"
      value={commentText}
      onChange={(e) => updateText(e.target.value)}
    ></input>
  );

  let regionColorInput = (
    <input
      className="float-right align-bottom bg-transparent text-right"
      type="color"
      value={regionColor}
      onChange={(e) => updateColor(e.target.value)}
      onBlur={() => StateManager.setCommentRegionColor(comments, regionColor)}
    ></input>
  );

  let allInsideNodes: NodeWrapper[] = StateManager.nodeWrappers.filter(
    (node: NodeWrapper) => {
      return comments.every((comment: CommentRegion) => {
        return comment.isNodeInCommentArea(node);
      });
    },
  );

  return (
    <div className="flex flex-col">
      <div className="font-medium text-2xl mb-2">Comment Region</div>
      <div className="divide-y mb-3">
        <ListItem title="Comment" rightContent={commentTextInput} />
        <ListItem title="Color" rightContent={regionColorInput} />
      </div>

      <div className="mt-3 ml-1 mb-1 text-left">Associated Nodes</div>
      <div className="divide-y mb-3">
        {allInsideNodes.map((node: NodeWrapper) => (
          <DetailsBox_CommentNode comments={comments} node={node} />
        ))}
      </div>
    </div>
  );
}
