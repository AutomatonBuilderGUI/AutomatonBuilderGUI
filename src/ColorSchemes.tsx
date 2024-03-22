export const LightColorScheme = {
    tentativeTransitionArrowColor: 'red',
    selectedNodeStrokeColor: '#018ED5',

    nodeFill: 'white',
    nodeStrokeColor: 'black',

    nodeAcceptStrokeColor: 'black',

    nodeLabelColor: 'black',

    newConnectionGlowColor: '#2FDFFB',
    newConnectionShadowOpacity: 1,
    newConnectionShadowBlur: 10,

    nodeDragDropShadowColor: '#000000',
    nodeDragDropShadowOpacity: 0.2,
    nodeDragDropShadowBlur: 10,
    
    transitionSelectedArrowColor: 'red',
    transitionArrowColor: 'black',
    transitionLabelColor: 'black',

    gridColor: "lightgrey",
};

export const DarkColorScheme = {
    tentativeTransitionArrowColor: 'red',
    selectedNodeStrokeColor: '#018ED5',

    nodeFill: '#2F2F2F',
    nodeStrokeColor: '#F0F0F0',

    nodeAcceptStrokeColor: '#F0F0F0',

    nodeLabelColor: 'white',

    newConnectionGlowColor: '#2FDFFB',
    newConnectionShadowOpacity: 1,
    newConnectionShadowBlur: 10,

    nodeDragDropShadowColor: '#FFFFFF',
    nodeDragDropShadowOpacity: 0.3,
    nodeDragDropShadowBlur: 10,
    
    transitionSelectedArrowColor: 'red',
    transitionArrowColor: '#E0E0E0',
    transitionLabelColor: 'white',

    gridColor: "#303030",
};

export interface ColorScheme {
    tentativeTransitionArrowColor: string,
    selectedNodeStrokeColor: string,

    nodeFill: string,
    nodeStrokeColor: string,

    nodeAcceptStrokeColor: string,

    nodeLabelColor: string,

    newConnectionGlowColor: string,
    newConnectionShadowOpacity: number,
    newConnectionShadowBlur: number,

    nodeDragDropShadowColor: string,
    nodeDragDropShadowOpacity: number,
    nodeDragDropShadowBlur: number,
    
    transitionSelectedArrowColor: string,
    transitionArrowColor: string,
    transitionLabelColor: string,

    gridColor: string,
}