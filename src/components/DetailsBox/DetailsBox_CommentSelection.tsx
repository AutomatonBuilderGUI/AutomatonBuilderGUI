import { useState, useEffect } from "react";
import CommentRegion from "../../CommentRegion";
import SelectableObject from "../../SelectableObject";
import StateManager from "../../Managers/StateManager";
import { useActionStack } from "../../utilities/ActionStackUtilities";
import { CoreListItem, CoreListItem_Left, ListItem } from "../ListItem";

interface DetailsBox_CommentSelectionProps {
  comments: CommentRegion[];
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

  return (
    <div className="flex flex-col">
      <div className="font-medium text-2xl mb-2">Comment Region</div>
      <div className="divide-y mb-3">
        <ListItem title="Comment" rightContent={commentTextInput} />
        <ListItem title="Color" rightContent={regionColorInput} />
      </div>
    </div>
  );
}
