import { useState, useEffect } from "react";
import NodeWrapper from "../../NodeWrapper";
import SelectableObject from "../../SelectableObject";
import StateManager from "../../StateManager";
import { useActionStack } from "../../utilities/ActionStackUtilities";
import { CoreListItem, CoreListItem_Left, ListItem } from "../ListItem";

interface DetailsBox_StateSelectionProps {
  nodeWrappers: NodeWrapper[];
  startNode: NodeWrapper;
  setStartNode: React.Dispatch<React.SetStateAction<NodeWrapper>>;
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
  props: DetailsBox_StateSelectionProps,
) {
  const { nodeWrappers, startNode, setStartNode } = props;

  const nw1 = nodeWrappers[0];

  const isMultiSelection = nodeWrappers.length > 1;
  const allAccept = nodeWrappers.every((node) => node.isAcceptNode);
  const noneAccept = nodeWrappers.every((node) => !node.isAcceptNode);

  const [nodeLabelText, setLabelText] = useState(nw1.labelText);
  const [isAccept, setIsAccept] = useState(
    noneAccept ? false : allAccept || undefined,
  );
  const [isStartNodeInternal, setIsStartNodeInternal] = useState(
    StateManager.startNode === nw1,
  );

  let updateNodeName = (newName: string) => {
    setLabelText(newName);
    StateManager.setNodeName(nw1, newName);
  };

  let updateNodeIsAccept = (isAccept: boolean) => {
    setIsAccept(isAccept);
    StateManager.setNodesIsAccept(nodeWrappers, isAccept);
  };

  const [_, currentStackLocation] = useActionStack();
  useEffect(() => {
    setLabelText(nw1.labelText);
    setIsAccept(noneAccept ? false : allAccept || undefined);
    setIsStartNodeInternal(StateManager.startNode === nw1);
  }, [currentStackLocation]);

  let nodeNameInput = (
    <input
      className="float-right align-bottom bg-transparent text-right"
      type="text"
      placeholder="State name"
      value={nodeLabelText}
      onChange={(e) => updateNodeName(e.target.value)}
    ></input>
  );
  let nodeAcceptInput = (
    <input
      type="checkbox"
      id="is-accept-state"
      name="is-accept-state"
      checked={isAccept}
      ref={(input) => {
        if (input) {
          input.indeterminate = isAccept === undefined;
        }
      }}
      onChange={(e) => updateNodeIsAccept(e.target.checked)}
    ></input>
  );

  let startStateClasses = `${isStartNodeInternal ? "text-gray-700 dark:text-gray-300" : "text-blue-500 dark:text-blue-400 "} flex flex-row items-center`;
  return (
    <div className="flex flex-col">
      <div className="font-medium text-2xl mb-2">State</div>
      <div className="divide-y mb-3">
        {!isMultiSelection && (
          <ListItem title="Name" rightContent={nodeNameInput} />
        )}
        <ListItem title="Accepts" rightContent={nodeAcceptInput} />
      </div>
      {!isMultiSelection && (
        <div className="divide-y mb-3">
          <CoreListItem>
            <CoreListItem_Left>
              <button
                className={startStateClasses}
                onClick={(_) => StateManager.setNodeIsStart(nw1)}
                disabled={isStartNodeInternal}
              >
                {isStartNodeInternal
                  ? "Current Start State"
                  : "Set As Start State"}
              </button>
            </CoreListItem_Left>
          </CoreListItem>
        </div>
      )}
    </div>
  );
}
