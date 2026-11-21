import StateManager from "./StateManager";
import NodeWrapper from "../NodeWrapper";
/**
 * Resets the state diagram zoom level to 100%.
 * @returns
 */
export function resetZoom() {
  if (!StateManager.stage) {
    console.error("Stage is not initialized.");
    return;
  }
  StateManager.stage.scale({ x: 1, y: 1 });
  StateManager.stage.position({ x: 0, y: 0 });
  StateManager.stage.batchDraw();
  StateManager.drawGrid();
}

/**
 * Centers the view of the state diagram to the origin.
 * @returns
 */
export function centerStage() {
  if (!StateManager.stage) {
    console.error("Stage is not initialized.");
    return;
  }
  // Calculate the center based on the container dimensions
  const x =
    window.innerWidth / 2 -
    (StateManager.stage.width() / 2) * StateManager.stage.scaleX();
  const y =
    window.innerHeight / 2 -
    (StateManager.stage.height() / 2) * StateManager.stage.scaleY();
  StateManager.stage.position({ x, y });
  StateManager.drawGrid();
  StateManager.stage.batchDraw();
}

/**
 * Zooms the view in by 10%.
 * @returns
 */
export function zoomIn() {
  if (!StateManager.stage) {
    console.error("Stage is not initialized.");
    return;
  }
  const scaleBy = 1.1; // Increase scale by 10%
  applyZoom(scaleBy);
}

/**
 * Zooms the view out by 10%.
 * @returns
 */
export function zoomOut() {
  if (!StateManager.stage) {
    console.error("Stage is not initialized.");
    return;
  }
  const scaleBy = 0.9; // Decrease scale by 10%
  applyZoom(scaleBy);
}

/**
 * Finds the bounding box of the automaton
 * and scrolls/zooms the screen to it
 */
export function fitAutomatonOnScreen() {
  const bounds = getDiagramBounds(StateManager.stage.width() / 3, 50, 50, 50);
  // Based on window size, the smaller scalar is what we need to be scale the zoom by, and then add some padding

  let scale = Math.min(
    StateManager.stage.width() / bounds.width,
    StateManager.stage.height() / bounds.height,
  );
  const boxCenterX = bounds.x + bounds.width / 2;
  const boxCenterY = bounds.y + bounds.height / 2;
  // finally, apply the zoom and center it in the center of the bounding box
  StateManager.stage.scale({ x: scale, y: scale });
  StateManager.stage.position({
    x: StateManager.stage.width() / 2 - boxCenterX * scale,
    y: StateManager.stage.height() / 2 - boxCenterY * scale,
  });
  StateManager.stage.batchDraw();
  StateManager.drawGrid();
}

/**
 * Zooms the view in or out by a given ratio.
 * @param scaleBy The ratio to scale the view by.
 */
function applyZoom(scaleBy: number) {
  const oldScale = StateManager.stage.scaleX();
  const newScale = oldScale * scaleBy;
  StateManager.stage.scale({ x: newScale, y: newScale });

  const stageCenterX = StateManager.stage.width() / 2;
  const stageCenterY = StateManager.stage.height() / 2;
  const newPos = {
    x: stageCenterX - (stageCenterX - StateManager.stage.x()) * scaleBy,
    y: stageCenterY - (stageCenterY - StateManager.stage.y()) * scaleBy,
  };
  StateManager.stage.position(newPos);
  StateManager.stage.batchDraw();
  StateManager.drawGrid();
}

//diagram bounds to know which exact part of the canvas to export
export function getDiagramBounds(
  leftPadding: number = 150,
  bottomPadding: number = 150,
  rightPadding: number = 150,
  topPadding: number = 150,
) {
  if (
    !StateManager.nodeWrappers.length &&
    !StateManager.transitionWrappers.length
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  StateManager.nodeWrappers.forEach((node) => {
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
