/**
 * The colors and visual parameters to use when dark mode is disabled.
 */
export const LightColorScheme: ColorScheme = {
  tentativeTransitionArrowColor: "red",
  selectedNodeStrokeColor: "#018ED5",

  nodeFill: "white",
  nodeStrokeColor: "black",

  nodeAcceptStrokeColor: "black",

  nodeLabelColor: "black",

  newConnectionGlowColor: "red",
  newConnectionShadowOpacity: 1,
  newConnectionShadowBlur: 10,

  hoverNodeGlowColor: "#2FDFFB",
  hoverNodeShadowOpacity: 1,
  hoverNodeShadowBlur: 10,

  hoverTransitionGlowColor: "red",

  nodeDragDropShadowColor: "#000000",
  nodeDragDropShadowOpacity: 0.2,
  nodeDragDropShadowBlur: 10,

  nodeDebugHighlightColor: "#ffee00",

  transitionDebugColor: " #ffee00",
  transitionSelectedArrowColor: "red",
  transitionArrowColor: "black",
  transitionLabelColor: "black",
  transitionLabelStrokeColor: "white",

  gridColor: "lightgrey",

  errorNodeFillColor: "rgb(254, 226, 225)", // Light red
  errorNodeStrokeColor: "rgb(220, 38, 37)", // Dark red
  errorIconFillColor: "rgb(220, 38, 37)", // Dark red
  errorIconTextColor: "white",
};

/**
 * The colors and visual parameters to use when dark mode is enabled.
 */
export const DarkColorScheme: ColorScheme = {
  tentativeTransitionArrowColor: "red",
  selectedNodeStrokeColor: "#018ED5",

  nodeFill: "#2F2F2F",
  nodeStrokeColor: "#F0F0F0",

  nodeAcceptStrokeColor: "#F0F0F0",

  nodeLabelColor: "white",

  newConnectionGlowColor: "red",
  newConnectionShadowOpacity: 1,
  newConnectionShadowBlur: 10,

  hoverNodeGlowColor: "#2FDFFB",
  hoverNodeShadowOpacity: 1,
  hoverNodeShadowBlur: 10,

  hoverTransitionGlowColor: "red",

  nodeDragDropShadowColor: "#FFFFFF",
  nodeDragDropShadowOpacity: 0.3,
  nodeDragDropShadowBlur: 10,

  nodeDebugHighlightColor: "#7c7401",

  transitionDebugColor: "#ffee00",
  transitionSelectedArrowColor: "red",
  transitionArrowColor: "#E0E0E0",
  transitionLabelColor: "white",
  transitionLabelStrokeColor: "black",

  gridColor: "#303030",

  errorNodeFillColor: "#4f0203",
  errorNodeStrokeColor: "red",
  errorIconFillColor: "red",
  errorIconTextColor: "white",
};

/**
 * The colors and visual parameters that can be configured for the color mode.
 */
export interface ColorScheme {
  tentativeTransitionArrowColor: string;
  selectedNodeStrokeColor: string;

  nodeFill: string;
  nodeStrokeColor: string;

  nodeAcceptStrokeColor: string;

  nodeLabelColor: string;

  newConnectionGlowColor: string;
  newConnectionShadowOpacity: number;
  newConnectionShadowBlur: number;

  nodeDragDropShadowColor: string;
  nodeDragDropShadowOpacity: number;
  nodeDragDropShadowBlur: number;

  hoverNodeGlowColor: string;
  hoverNodeShadowOpacity: number;
  hoverNodeShadowBlur: number;

  hoverTransitionGlowColor: string;

  nodeDebugHighlightColor: string;
  transitionDebugColor: string;

  transitionSelectedArrowColor: string;
  transitionArrowColor: string;
  transitionLabelColor: string;
  transitionLabelStrokeColor: string;

  gridColor: string;

  errorNodeFillColor: string;
  errorNodeStrokeColor: string;
  errorIconFillColor: string;
  errorIconTextColor: string;
}
