import NodeWrapper from "./NodeWrapper";
import { Tool } from "./Tool";
import Konva from "konva";
import TransitionWrapper from "./TransitionWrapper";
import SelectableObject from "./SelectableObject";
import TokenWrapper from "./TokenWrapper";
import { ChangeEvent, ChangeEventHandler } from "react";
import { LightColorScheme, DarkColorScheme, ColorScheme } from "./ColorSchemes";

export default class StateManager {
    static _nextStateId = 0;
    public static get startNode(): NodeWrapper | null { return StateManager._startNode; }
    private static _startNode: NodeWrapper | null = null;

    private static _nodeWrappers: Array<NodeWrapper> = [];
    private static _transitionWrappers: Array<TransitionWrapper> = [];
    private static _alphabet: Array<TokenWrapper> = [];

    private static _selectedObjects: Array<SelectableObject> = [];

    private static _tentativeTransitionSource: NodeWrapper | null = null;
    private static _tentativeTransitionTarget: NodeWrapper | null = null;

    private static _currentTool: Tool = Tool.States;

    private static _stage: Konva.Stage | null = null;
    private static _tentConnectionLine: Konva.Arrow | null = null;
    private static _startStateLine: Konva.Arrow | null = null;
    private static _nodeLayer: Konva.Layer | null = null;
    private static _transitionLayer: Konva.Layer | null = null;
    private static _gridLayer: Konva.Layer | null = null;

    public static setSelectedObjects: React.Dispatch<React.SetStateAction<SelectableObject[]>> | null = null;

    private static _useDarkMode: boolean = false;
    private static _snapToGridEnabled: boolean = false;

    public static get colorScheme() {
        if (this._useDarkMode) {
            return DarkColorScheme;
        }
        else {
            return LightColorScheme;
        }
    }

    private constructor() {
    }

    public static toggleSnapToGrid() {
        StateManager._snapToGridEnabled = !StateManager._snapToGridEnabled;
    }

    public static isSnapToGridEnabled(): boolean {
        return StateManager._snapToGridEnabled;
    }

    public static initialize() {
        this._startNode = null;
        this._nodeWrappers = [];
        this._transitionWrappers = [];

        Konva.hitOnDragEnabled = true;

        this._stage = new Konva.Stage({
            container: 'graphics-container',
            width: window.innerWidth,
            height: window.innerHeight,
            draggable: true
        });
        this._stage.on('dblclick', (ev) => StateManager.onDoubleClick.call(this, ev));
        this._stage.on('click', (ev) => StateManager.onClick.call(this, ev));
        this._stage.on('wheel', StateManager.handleWheelEvent);
        this._stage.on('dragmove', StateManager.onDragMove);

        this._nodeLayer = new Konva.Layer();
        this._transitionLayer = new Konva.Layer();
        this._gridLayer = new Konva.Layer();
        this._stage.add(this._gridLayer);
        this.drawGrid(); // Draw the initial grid

        this._tentConnectionLine = new Konva.Arrow({
            x: 0,
            y: 0,
            points: [0, 0, 20, 40],
            stroke: 'red',
            fill: 'red',
            strokeWidth: 5,
            lineJoin: 'round',
            dash: [20, 20],
            pointerLength: 10,
            pointerWidth: 10,
            visible: false
        });
        this._transitionLayer.add(this._tentConnectionLine);

        this._startStateLine = new Konva.Arrow({
            x: 0,
            y: 0,
            points: [
                -100, 0, 0 - NodeWrapper.NodeRadius - TransitionWrapper.ExtraTransitionArrowPadding, 0
            ],
            stroke: 'black',
            fill: 'black',
            strokeWidth: 5,
            lineJoin: 'round',
            pointerLength: 10,
            pointerWidth: 10,
            visible: false
        });
        this._transitionLayer.add(this._startStateLine);

        
        this._stage.add(this._transitionLayer);
        this._stage.add(this._nodeLayer);
        
        addEventListener('keydown', this.onKeyDown);
        addEventListener('resize', this.handleResize);
    }
    public static get transitions(): Array<TransitionWrapper> {
        return StateManager._transitionWrappers;
      }

    //handles resizing the canvas when the window is resized using an event listener
    private static handleResize() {
        if (StateManager._stage) {
            StateManager._stage.width(window.innerWidth);
            StateManager._stage.height(window.innerHeight);

            const gridLayer = StateManager._stage.findOne('.gridLayer');
            if(gridLayer){
                gridLayer.destroy() ;
            }
            StateManager.drawGrid();

            StateManager._stage.draw();
        }
    }

    // getter for the stage position
    public static getStagePosition(): { x: number; y: number } {
        return this._stage ? { x: this._stage.x(), y: this._stage.y() } : { x: 0, y: 0 };
    }
    
    // getter for the scale of the stage so it can be used in other classes
    public static getStageScale(): { scaleX: number; scaleY: number } {
        if (this._stage) {
            return { scaleX: this._stage.scaleX(), scaleY: this._stage.scaleY() };
        }
        // Default scale is 1 if the stage is not initialized
        return { scaleX: 1, scaleY: 1 };
    }
    
    public static drawGrid() {
        if (!StateManager._gridLayer || !StateManager._stage) {
            console.error('Grid layer or stage is not initialized.');
            return;
        }
    
        // Clear any previous grid lines
        StateManager._gridLayer.destroyChildren();
    
        const gridCellSize = 50; // Size of each cell in the grid
        const scale = StateManager._stage.scaleX(); // Current scale of the stage
        const stageWidth = StateManager._stage.width() / scale; // Visible width
        const stageHeight = StateManager._stage.height() / scale; // Visible height
        const stagePos = StateManager._stage.position(); // Current position of the stage
    
        // Adjust the start positions to account for stage position
        const startX = -1 * (Math.round(stagePos.x / scale / gridCellSize) * gridCellSize);
        const startY = -1 * (Math.round(stagePos.y / scale / gridCellSize) * gridCellSize);
    
        // Calculate the number of lines needed based on the stage size and scale
        const linesX = Math.ceil(stageWidth / gridCellSize) + 2; // Extra lines to fill the space during drag
        const linesY = Math.ceil(stageHeight / gridCellSize) + 2; // Extra lines to fill the space during drag
    
        // Create vertical lines
        for (let i = 0; i < linesX; i++) {
            let posX = startX + i * gridCellSize;
            StateManager._gridLayer.add(new Konva.Line({
                points: [posX, startY, posX, startY + linesY * gridCellSize],
                stroke: this.colorScheme.gridColor,
                strokeWidth: 1,
                listening: false,
            }));
        }
    
        // Create horizontal lines
        for (let j = 0; j < linesY; j++) {
            let posY = startY + j * gridCellSize;
            StateManager._gridLayer.add(new Konva.Line({
                points: [startX, posY, startX + linesX * gridCellSize, posY],
                stroke: this.colorScheme.gridColor,
                strokeWidth: 1,
                listening: false,
            }));
        }
    
        // Draw the grid
        StateManager._gridLayer.batchDraw();
    }
    
    public static get currentTool() {
        return StateManager._currentTool;
    }

    public static set currentTool(tool: Tool) {
        StateManager._currentTool = tool;
    }

    private static onDragMove(evt: Konva.KonvaEventObject<MouseEvent>) {
        console.log('Stage is being dragged. Redrawing grid.'); // This line logs to the console
        StateManager.drawGrid();
    }
    
    

    private static onClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        let thingUnderMouse = StateManager._stage.getIntersection(StateManager._stage.getPointerPosition());
        if (!thingUnderMouse) {
            StateManager.deselectAllObjects();
        }
    }

    private static onDoubleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        if (StateManager.currentTool == Tool.States) {
            StateManager.addStateAtDoubleClickPos(evt);
            
        }
        else if (StateManager.currentTool == Tool.Transitions) {
            console.log('in transition tool mode, so don\'t do anything');
        }
    }

    private static addStateAtDoubleClickPos(evt: Konva.KonvaEventObject<MouseEvent>) {
        if (!StateManager._stage) return;
    
        const stage = StateManager._stage;
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;
    
        // Convert the pointer position to the stage's coordinate space
        const scale = stage.scaleX(); // Assuming uniform scaling for X and Y
        const stagePos = stage.position();
    
        // Adjusting for the stage's position and scale
        let x = (pointerPosition.x - stagePos.x) / scale;
        let y = (pointerPosition.y - stagePos.y) / scale;
    
        // Snap to grid if enabled
        if (StateManager._snapToGridEnabled) {
            const gridSpacing = 50; // Define your grid spacing value here
    
            // No need to normalize the coordinates here since they're already in "stage space"
            x = Math.round(x / gridSpacing) * gridSpacing;
            y = Math.round(y / gridSpacing) * gridSpacing;
        }
    
        const newStateWrapper = new NodeWrapper(x, y);
        StateManager._nodeWrappers.push(newStateWrapper);
        StateManager._nodeLayer?.add(newStateWrapper.nodeGroup);
    
        if (StateManager._startNode === null) {
            StateManager.startNode = newStateWrapper;
        }
    
        StateManager._nodeLayer?.draw();
    }
    
    

    public static addTransition(transition: TransitionWrapper) {
        console.log('Adding transition to the array');
        StateManager._transitionWrappers.push(transition);
      }

    public static set startNode(node: NodeWrapper | null) {
        if (StateManager._startNode) {
            StateManager._startNode.nodeGroup.off('move.startstate');
        }
        StateManager._startNode = node;

        if (node) {
            node.nodeGroup.on('move.startstate', (ev) => StateManager.updateStartNodePosition());
            StateManager.updateStartNodePosition();
            StateManager._startStateLine.visible(true);
        }
        else {
            StateManager._startStateLine.visible(false);
        }


    }

    public static updateStartNodePosition() {
        StateManager._startStateLine.absolutePosition(StateManager._startNode.nodeGroup.absolutePosition());
    }

    private static onKeyDown(ev: KeyboardEvent) {
        //based on the ignore shortcuts implementation in index.tsx
        const n = document.activeElement.nodeName;
        if (n === 'INPUT' || n === 'TEXTAREA')
        {
            return;
        }
        if (ev.code === "Backspace" || ev.code === "Delete") 
        {
            StateManager.deleteAllSelectedObjects();
        }

    }

    public static startTentativeTransition(sourceNode: NodeWrapper) {
        StateManager._tentativeTransitionSource = sourceNode;
        StateManager._tentConnectionLine.visible(true);
        StateManager._tentConnectionLine.setAbsolutePosition(sourceNode.nodeGroup.absolutePosition());
    }

    public static updateTentativeTransitionHead(x: number, y: number) {
        if (!StateManager._stage || !StateManager._tentativeTransitionSource || !StateManager._tentConnectionLine) return;
    
        // Get the current scale of the stage
        const scale = StateManager._stage.scaleX();
    
        // Get the source node's absolute position
        let srcPos = StateManager._tentativeTransitionSource.nodeGroup.absolutePosition();
    
        if (StateManager.tentativeTransitionTarget === null) {
            // Calculate the delta, taking the scale into account
            let xDelta = (x - srcPos.x) / scale;
            let yDelta = (y - srcPos.y) / scale;
    
            // Update the points for the tentative transition line
            StateManager._tentConnectionLine.points([0, 0, xDelta, yDelta]);
        } else {
            
            let dstPos = StateManager.tentativeTransitionTarget.nodeGroup.absolutePosition();
            
            let xDestRelativeToSrc = (dstPos.x - srcPos.x) / scale;
            let yDestRelativeToSrc = (dstPos.y - srcPos.y) / scale;
    
            let magnitude = Math.sqrt(xDestRelativeToSrc * xDestRelativeToSrc + yDestRelativeToSrc * yDestRelativeToSrc);
            
            let newMag = (NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding);
            let xUnitTowardsSrc = xDestRelativeToSrc / magnitude * newMag;
            let yUnitTowardsSrc = yDestRelativeToSrc / magnitude * newMag;
    
            // Update the arrow points to end just before the target node, adjusted for scale
            StateManager._tentConnectionLine.points([0, 0, xDestRelativeToSrc - xUnitTowardsSrc, yDestRelativeToSrc - yUnitTowardsSrc]);
        }
    }

    
    
    public static endTentativeTransition() {


        if (StateManager._tentativeTransitionSource !== null && StateManager.tentativeTransitionTarget !== null) {
            const newTransitionWrapper = new TransitionWrapper(StateManager._tentativeTransitionSource, StateManager._tentativeTransitionTarget);
            StateManager._transitionWrappers.push(newTransitionWrapper);
            StateManager._transitionLayer.add(newTransitionWrapper.konvaGroup);
            StateManager._transitionLayer.draw();
        }

        StateManager._tentativeTransitionSource?.disableShadowEffects();
        StateManager._tentativeTransitionTarget?.disableShadowEffects();

        StateManager._tentativeTransitionSource = null;
        StateManager._tentativeTransitionTarget = null;
        StateManager._tentConnectionLine.visible(false);
    }

    public static get tentativeTransitionInProgress() {
        return StateManager._tentativeTransitionSource !== null;
    }

    public static get tentativeTransitionTarget() {
        return StateManager._tentativeTransitionTarget;
    }

    public static set tentativeTransitionTarget(newTarget: NodeWrapper | null) {
        StateManager._tentativeTransitionTarget = newTarget;
    }

    public static set selectedObjects(newArray: Array<SelectableObject>) {
        StateManager._selectedObjects = newArray;
    }

    public static get selectedObjects() {
        return [...StateManager._selectedObjects];
    }

    public static selectObject(obj: SelectableObject) {
        if (StateManager._selectedObjects.includes(obj)) {
            return;
        }
        const currentSelectedObjects = [...StateManager._selectedObjects, obj];
        StateManager.setSelectedObjects(currentSelectedObjects);
        StateManager._selectedObjects = currentSelectedObjects;
        obj.select();
    }

    public static deselectAllObjects() {
        StateManager._selectedObjects.forEach((obj) => obj.deselect());
        StateManager.setSelectedObjects([]);
        StateManager._selectedObjects = [];
    }

    public static deleteAllSelectedObjects() {
        // Find all transitions dependent on selected nodes
        const nodesToRemove = StateManager._nodeWrappers.filter((i) => StateManager._selectedObjects.includes(i));
        const transitionsDependentOnDeletedNodes: Array<TransitionWrapper> = [];
        nodesToRemove.forEach((node) => {
            StateManager._transitionWrappers.forEach((trans) => {
                if (trans.involvesNode(node) && !transitionsDependentOnDeletedNodes.includes(trans)) {
                    transitionsDependentOnDeletedNodes.push(trans);
                }
            });
        });
        // Keep transitions that aren't in the selected objects, AND aren't dependent on selected objects
        StateManager._transitionWrappers = StateManager._transitionWrappers.filter((i) => !StateManager._selectedObjects.includes(i) && !transitionsDependentOnDeletedNodes.includes(i));

        // Next, delete all selected nodes
        StateManager._nodeWrappers = StateManager._nodeWrappers.filter((i) => !StateManager._selectedObjects.includes(i));

        StateManager._selectedObjects.forEach((obj) => obj.deleteKonvaObjects());
        transitionsDependentOnDeletedNodes.forEach((obj) => obj.deleteKonvaObjects());

        if (nodesToRemove.includes(StateManager._startNode)) {
            StateManager.startNode = null;
        }

        StateManager.setSelectedObjects([]);
        StateManager._selectedObjects = [];
    }

    // method to zoom in or out when the mouse wheel is scrolled.
    private static handleWheelEvent(ev: any) {
        ev.evt.preventDefault();
        var oldScale = StateManager._stage.scaleX();
    
        var pointer = StateManager._stage.getPointerPosition();
    
        var mousePointer = {
            x: (pointer.x - StateManager._stage.x()) / oldScale,
            y: (pointer.y - StateManager._stage.y()) / oldScale,
        };
    
        var newScale = ev.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
        StateManager._stage.scale({ x: newScale, y: newScale });
    
        var newPos = {
            x: pointer.x - mousePointer.x * newScale,
            y: pointer.y - mousePointer.y * newScale,
        };
        StateManager._stage.position(newPos);
        StateManager._stage.batchDraw();
        StateManager.drawGrid();
    }

    public static areAllLabelsUnique(): boolean {
        const labels = StateManager._nodeWrappers.map(node => node.labelText);
        const uniqueLabels = new Set(labels);
        return labels.length === uniqueLabels.size;
    }

    
    public static set alphabet(newAlphabet: Array<TokenWrapper>) {
        const oldAlphabet = StateManager._alphabet;
        StateManager._alphabet = newAlphabet;

        oldAlphabet.forEach(tok => {
            if (!newAlphabet.includes(tok)) {
                // The token tok was removed from the alphabet, so we need
                // to remove it from any transitions!
                StateManager._transitionWrappers.forEach(transition => {
                    transition.removeToken(tok);
                });
            }
        });

        console.log('alphabet is', StateManager._alphabet);
    }

    public static get alphabet() {
        console.log('alphabet is', StateManager._alphabet);
        return [...StateManager._alphabet];
    }

    public static toJSON() {
        return {
            states: StateManager._nodeWrappers.map(node => node.toJSON()),
            alphabet: StateManager._alphabet.map(tok => tok.toJSON()),
            transitions: StateManager._transitionWrappers.map(trans => trans.toJSON()),
            startState: StateManager._startNode.id,
            acceptStates: StateManager._nodeWrappers.filter(node => node.isAcceptNode).map(node => node.id)
        };
    }

    public static downloadJSON() {
        const jsonString = JSON.stringify(StateManager.toJSON(), null, 4);

        // A hacky solution in my opinion, but apparently it works so hey.
        // Adapted from https://stackoverflow.com/a/18197341

        let el = document.createElement('a');
        el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonString));
        el.setAttribute('download', 'finite_automaton.json');
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    }

    public static uploadJSON(ev: ChangeEvent<HTMLInputElement>) {
        console.log(ev);
        const file = ev.target.files.item(0);
        
        const fileText = file.text()
        .then(text => {
            console.log('success getting the file text!', JSON.parse(text));
            StateManager.loadAutomaton(JSON.parse(text));
        },
        reject_reason => {
            console.log('could not get file text, reason was', reject_reason);
        });
    }

    public static loadAutomaton(json: SerializedAutomaton) {
        const { states, alphabet, transitions, startState, acceptStates } = json;

        // TODO: Clear all current stuff

        // Load each state
        states.forEach(state => {
            const newState = new NodeWrapper(state.x, state.y, state.label, acceptStates.includes(state.id), state.id);
            StateManager._nodeWrappers.push(newState);
            StateManager._nodeLayer.add(newState.nodeGroup);
        });

        // Load the alphabet
        alphabet.forEach(tok => {
            const newTok = new TokenWrapper(tok.symbol, tok.id);
            StateManager._alphabet.push(newTok);
        });

        // Load transitions
        transitions.forEach(trans => {
            const src = StateManager._nodeWrappers.find(n => n.id === trans.source);
            const dest = StateManager._nodeWrappers.find(n => n.id === trans.dest);
            const isEpsilonTransition = trans.isEpsilonTransition;
            const tokens = trans.tokens.map(tokID => StateManager._alphabet.find(tok => tok.id === tokID));
            const newTrans = new TransitionWrapper(src, dest, isEpsilonTransition, tokens);
            
            StateManager._transitionWrappers.push(newTrans);
            StateManager._transitionLayer.add(newTrans.konvaGroup);
        })

        // Load the start state
        const startNodeObj = StateManager._nodeWrappers.filter(n => n.id === startState);
        if (startNodeObj.length <= 0) {
            console.error('Start state not found!!');
        }
        else {
            StateManager._startNode = startNodeObj[0];
        }

        // Accept states are loaded at the same time as states themselves

        // Refresh canvas?


        this._stage.draw();
        console.log('all loaded!');
    }

    public static set useDarkMode(val: boolean) {
        // Save new value
        this._useDarkMode = val;

        this._nodeWrappers.forEach(n => n.updateColorScheme());
        this._transitionWrappers.forEach(t => t.updateColorScheme());

        // We need to re-trigger the "selected object" drawing code
        // for selected objects
        this._selectedObjects.forEach(o => o.select());

        this._startStateLine.fill(this.colorScheme.transitionArrowColor);
        this._startStateLine.stroke(this.colorScheme.transitionArrowColor);

        this._tentConnectionLine.fill(this.colorScheme.tentativeTransitionArrowColor);
        this._tentConnectionLine.stroke(this.colorScheme.tentativeTransitionArrowColor);

        const gridLayer = StateManager._stage.findOne('.gridLayer');
        if(gridLayer){
            gridLayer.destroy() ;
        }
        StateManager.drawGrid();

        StateManager._stage.draw();
    }

    public static get useDarkMode() {
        return this._useDarkMode;
    }
}

interface SerializedAutomaton {
    states: Array<SerializedState>,
    alphabet: Array<SerializedToken>,
    transitions: Array<SerializedTransition>,
    startState: string,
    acceptStates: Array<string>
}

interface SerializedState {
    id: string,
    x: number,
    y: number,
    label: string
}

interface SerializedToken {
    id: string,
    symbol: string
}

interface SerializedTransition {
    id: string,
    source: string,
    dest: string,
    isEpsilonTransition: boolean,
    tokens: Array<string>
}