import Konva from "konva";
import NodeWrapper from "./NodeWrapper";
import SelectableObject from "./SelectableObject";
import StateManager from "./StateManager";
import { Tool } from "./Tool";
import TokenWrapper from "./TokenWrapper";
import { v4 as uuidv4 } from 'uuid';

export default class TransitionWrapper extends SelectableObject {
    public static readonly ExtraTransitionArrowPadding = 5;

    private static readonly SelectedArrowColor = 'red';
    private static readonly ArrowColor = 'black';

    private arrowObject: Konva.Arrow;
    private labelObject: Konva.Text;
    private labelCenterDebugObject: Konva.Circle;
    public konvaGroup: Konva.Group;

    private _sourceNode: NodeWrapper;
    transitionId: string;
    isCurved: boolean;
    isDelete: boolean;
    priority: string;
    public get sourceNode() { return this._sourceNode; }

    private _destNode: NodeWrapper;
    public get destNode() { return this._destNode; }

    private _tokens: Set<TokenWrapper>;

    private _isEpsilonTransition: boolean;

    private readonly _id: string
    public get id() {
        return this._id;
    }

    constructor(sourceNode: NodeWrapper, destNode: NodeWrapper, isEpsilonTransition: boolean | null = null, tokens: Array<TokenWrapper> | Set<TokenWrapper> | null = null) {
        console.log('inside the constructor');
        super();
        this._id = uuidv4();
        this._sourceNode = sourceNode;
        this._destNode = destNode;
        this._tokens = new Set(tokens) ?? new Set<TokenWrapper>();
        this._isEpsilonTransition = isEpsilonTransition ?? false;
        this.isDelete = false;
        
        const existingTransitions = StateManager.transitions.find(t =>
        //    (t.sourceNode.id === sourceNode.id && t.destNode.id === destNode.id) ||
            (t.sourceNode.id === destNode.id && t.destNode.id === sourceNode.id)
        );
        const existingTransition = StateManager.transitions.find(t =>
            (t.sourceNode.id === sourceNode.id && t.destNode.id === destNode.id)
        );
        if(existingTransition)
        {
            this.isDelete =true;
            StateManager.deselectAllObjects();
            StateManager.selectObject(existingTransition);
        }
        

        
        if (!existingTransitions) 
        {
            this.priority = 'straight';
        } 
        else 
        {
            existingTransitions.priority = 'curve';
            this.priority = 'curve';
            existingTransitions.updatePoints();
        }
        
        this.konvaGroup = new Konva.Group();
        
        this.arrowObject = new Konva.Arrow({
            x: 0,
            y: 0,
            points: [0, 0, 0, 0],
            stroke: StateManager.colorScheme.transitionArrowColor,
            fill: StateManager.colorScheme.transitionArrowColor,
            strokeWidth: 5,
            lineJoin: 'round',
            pointerLength: 10,
            pointerWidth: 10,
        });

        this.labelCenterDebugObject = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 3,
            fill: 'magenta'
        });

        this.labelObject = new Konva.Text({
            x: 0,
            y: 0,
            align: 'center',
            verticalAlign: 'middle',
            text: 'label here',
            fontSize: 20,
            fill: StateManager.colorScheme.transitionLabelColor,
        });

if (this.isDelete){

}
else{
        this.konvaGroup.add(this.arrowObject);
        this.konvaGroup.add(this.labelCenterDebugObject);
        this.konvaGroup.add(this.labelObject);
}
        this.updatePoints();

        this.konvaGroup.on('click', (ev) => this.onClick.call(this, ev));
        this._sourceNode.nodeGroup.on('move.transition', (ev) => this.updatePoints.call(this));
        this._destNode.nodeGroup.on('move.transition', (ev) => this.updatePoints.call(this));
        this.konvaGroup.on('click', (ev) => this.onClick.call(this, ev));
    }

    private resetLabel() {
        let text = [];
        if (this.isEpsilonTransition) {
            text.push("ε");
        }

        this._tokens.forEach(tok => text.push(tok.symbol));
        this.labelObject.text(text.join(','));
    }

    public updatePoints() {
        this.resetLabel();
    
        if (this._sourceNode === this._destNode) {
            this.handleSameSourceAndDest();
        } else {
            const srcPos = this._sourceNode.nodeGroup.position();
            const dstPos = this._destNode.nodeGroup.position();
            
            if (this.priority === 'curve') {
                this.handleCurvePriority(srcPos, dstPos);
            } else {
                this.handleDefaultPriority(srcPos, dstPos);
            }
            if(this.isDelete)
            {
            this.deleteKonvaObjects;
            }
        }
    }
    
    handleSameSourceAndDest() {
        console.log('source node and dest node are the same!');
        const srcPos = this._sourceNode.nodeGroup.position();
        const ANGLE = 60.0 * (Math.PI / 180.0);
        const DIST = 30;
    
        const centerPtX = srcPos.x;
        const centerPtY = srcPos.y - NodeWrapper.NodeRadius - DIST * 1.5;
    
        const pointsArray = [
            srcPos.x + NodeWrapper.NodeRadius * Math.cos(ANGLE),
            srcPos.y - NodeWrapper.NodeRadius * Math.sin(ANGLE),
            srcPos.x + NodeWrapper.NodeRadius * Math.cos(ANGLE) + DIST * Math.cos(ANGLE),
            srcPos.y - NodeWrapper.NodeRadius * Math.sin(ANGLE) - DIST * Math.sin(ANGLE),
            centerPtX,
            centerPtY,
            srcPos.x - NodeWrapper.NodeRadius * Math.cos(ANGLE) - DIST * Math.cos(ANGLE),
            srcPos.y - NodeWrapper.NodeRadius * Math.sin(ANGLE) - DIST * Math.sin(ANGLE),
            srcPos.x - NodeWrapper.NodeRadius * Math.cos(ANGLE) - TransitionWrapper.ExtraTransitionArrowPadding * Math.cos(ANGLE),
            srcPos.y - NodeWrapper.NodeRadius * Math.sin(ANGLE) - TransitionWrapper.ExtraTransitionArrowPadding * Math.sin(ANGLE)
        ];
        this.updateArrow(pointsArray, 0);
        this.labelObject.position({ x: centerPtX, y: centerPtY-20});
        this.labelCenterDebugObject.position({ x: centerPtX, y: centerPtY});
    }
    
    handleCurvePriority(srcPos: { x: number, y: number }, dstPos: { x: number, y: number }) {
        console.log('Curved arrow logic executed!');
        const angle = Math.atan2(dstPos.y - srcPos.y, dstPos.x - srcPos.x);
        const curveSize = 40;
        const textOffset = curveSize + 20;
        const midPoint = { x: (srcPos.x + dstPos.x) / 2, y: (srcPos.y + dstPos.y) / 2 };
        const normalVectorXComponent = Math.cos(angle + Math.PI / 2);
        const normalVectorYComponent = Math.sin(angle + Math.PI / 2);
    
        const pointsArray = [
            srcPos.x + NodeWrapper.NodeRadius * Math.cos(angle + Math.PI / 8),
            srcPos.y + NodeWrapper.NodeRadius * Math.sin(angle + Math.PI / 8),
            midPoint.x + curveSize * normalVectorXComponent,
            midPoint.y + curveSize * normalVectorYComponent,
            dstPos.x - (NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding) * Math.cos(angle - Math.PI / 8),
            dstPos.y - (NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding) * Math.sin(angle - Math.PI / 8)
        ];
    
        this.updateArrow(pointsArray, 0.5);
        this.updateLabelPosition(midPoint.x + textOffset * normalVectorXComponent, midPoint.y + textOffset * normalVectorYComponent);
        this.updateLabelCenterDebugPosition(midPoint.x + curveSize * normalVectorXComponent, midPoint.y + curveSize * normalVectorYComponent);
    }
    
    handleDefaultPriority(srcPos: { x: number, y: number }, dstPos: { x: number, y: number }) {
        const unitVector = this.calculateUnitVectorTowardsSrc(srcPos, dstPos);
        const xAvg = ((srcPos.x + unitVector.x) + (dstPos.x - unitVector.x)) / 2;
        const yAvg = ((srcPos.y + unitVector.y) + (dstPos.y - unitVector.y)) / 2;
        const midPoint = { x: (srcPos.x + dstPos.x) / 2, y: (srcPos.y + dstPos.y) / 2 };
        this.updateArrow([srcPos.x, srcPos.y, dstPos.x - unitVector.x, dstPos.y - unitVector.y], 0);
        this.updateLabelPosition(xAvg, yAvg);
        this.updateLabelCenterDebugPosition(xAvg, yAvg);
    }
    
    calculateUnitVectorTowardsSrc(srcPos: { x: number, y: number }, dstPos: { x: number, y: number }) {
        const xDestRelativeToSrc = dstPos.x - srcPos.x;
        const yDestRelativeToSrc = dstPos.y - srcPos.y;
        const magnitude = Math.sqrt(xDestRelativeToSrc * xDestRelativeToSrc + yDestRelativeToSrc * yDestRelativeToSrc);
        const newMag = NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding;
        const xUnitTowardsSrc = xDestRelativeToSrc / magnitude * newMag;
        const yUnitTowardsSrc = yDestRelativeToSrc / magnitude * newMag;
    
        return { x: xUnitTowardsSrc, y: yUnitTowardsSrc };
    }
    
    updateArrow(pointsArray: number[], tension: number) {
        this.arrowObject.points(pointsArray);
        this.arrowObject.tension(tension);
    }
    
    updateLabelPosition(x: number, y: number) {
        this.labelObject.position({ x, y });
    }
    
    updateLabelCenterDebugPosition(x: number, y: number) {
        this.labelCenterDebugObject.position({ x, y });
    }
    

    public involvesNode(node: NodeWrapper): boolean {
        return this._sourceNode === node || this._destNode === node;
    }

    public onClick(ev: Konva.KonvaEventObject<MouseEvent>) {
        if (StateManager.currentTool === Tool.Select) {
            // If shift isn't being held, then clear all previous selection
            if (!ev.evt.shiftKey) {
                StateManager.deselectAllObjects();
            }
            StateManager.selectObject(this);
        }
    }

    public select(): void {
        this.arrowObject.fill(StateManager.colorScheme.transitionSelectedArrowColor);
        this.arrowObject.stroke(StateManager.colorScheme.transitionSelectedArrowColor);
    }

    public deselect(): void {
        this.arrowObject.fill(StateManager.colorScheme.transitionArrowColor);
        this.arrowObject.stroke(StateManager.colorScheme.transitionArrowColor);
    }

    public konvaObject(): Konva.Node {
        return this.konvaGroup;
    }

    public deleteKonvaObjects(): void {
        this.konvaGroup.destroy();
    }

    public addToken(tok: TokenWrapper) {
        this._tokens.add(tok);
        this.updatePoints();
    }

    public removeToken(tok: TokenWrapper) {
        this._tokens.delete(tok);
        this.updatePoints();
    }

    public hasToken(tok: TokenWrapper): boolean {
        return this._tokens.has(tok);
    }

    public set isEpsilonTransition(value: boolean) {
        this._isEpsilonTransition = value;
        this.updatePoints();
    }

    public get isEpsilonTransition(): boolean {
        return this._isEpsilonTransition;
    }

    public toJSON() {
        return {
            id: this.id,
            source: this._sourceNode.id,
            dest: this._destNode.id,
            isEpsilonTransition: this.isEpsilonTransition,
            tokens: Array.from(this._tokens.values()).map(tok => tok.id)
        };
    }

    public updateColorScheme() {
        this.arrowObject.fill(StateManager.colorScheme.transitionArrowColor);
        this.arrowObject.stroke(StateManager.colorScheme.transitionArrowColor);
        this.labelObject.fill(StateManager.colorScheme.transitionLabelColor);
    }
}