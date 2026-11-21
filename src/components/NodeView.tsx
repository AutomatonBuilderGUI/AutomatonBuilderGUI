import { useState, useEffect } from "react";
import StateManager from "../Managers/StateManager";

interface NodeViewProps {}

/**
 * The container in which the state machine itself is drawn.
 */
export default function NodeView(
  props: React.PropsWithChildren<NodeViewProps>,
) {
  useEffect(() => {
    StateManager.initialize();
  }, []);
  return (
    <div
      className="z-0 absolute left-0 top-0 dark:bg-neutral-900"
      id="graphics-container"
    ></div>
  );
}
