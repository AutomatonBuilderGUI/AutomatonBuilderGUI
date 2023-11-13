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

        this.konvaGroup.add(this.arrowObject);
        this.konvaGroup.add(this.labelCenterDebugObject);
        this.konvaGroup.add(this.labelObject);

        this.updatePoints();

        this.konvaGroup.on('click', (ev) => this.onClick.call(this, ev));
        this._sourceNode.nodeGroup.on('move.transition', (ev) => this.updatePoints.call(this));
        this._destNode.nodeGroup.on('move.transition', (ev) => this.updatePoints.call(this));
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
        console.log('update points');
        this.resetLabel();
        console.log('update points2');
        // If source node and destination node are the same,
        // then the transition arrow should not do its usual thing.
        // Instead, it should loop up and around
        if (this._sourceNode == this._destNode) {
            console.log('source node and dest node are the same! extra stuff test')
            console.log('the logs Im inserting are working')
            let srcPos = this._sourceNode.nodeGroup.position();
            const ANGLE = 60.0 * (Math.PI / 180.0);
            const DIST = 30;


            const centerPtX = srcPos.x;
            const centerPtY = srcPos.y - NodeWrapper.NodeRadius - DIST * 1.5;

            let pointsArray = [
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
            this.arrowObject.points(pointsArray);
            this.arrowObject.tension(0);

            this.labelObject.position({x: centerPtX, y: centerPtY});
            this.labelCenterDebugObject.position({x: centerPtX, y: centerPtY});

            return;
        }
        console.log('update points3');
        // The source and destination are different, so draw the
        // arrow from one to the other.
        let srcPos = this._sourceNode.nodeGroup.position();
        let dstPos = this._destNode.nodeGroup.position();

        // Logic to check if there are already transitions between the same two states
        // and curves one of the transition lines to make it easier to see.

        // Check if there are other transitions between the same nodes
        const otherTransitions = StateManager.transitions.filter((t: this) => {
            const condition =
                t !== this &&
                ((t.sourceNode === this._sourceNode && t.destNode === this._destNode) ||
                 (t.sourceNode === this._destNode && t.destNode === this._sourceNode));
        
            console.log('Condition:', condition);
            console.log('t.sourceNode:', t.sourceNode);
            console.log('t.destNode:', t.destNode);
            console.log('this._sourceNode:', this._sourceNode);
            console.log('this._destNode:', this._destNode);
            console.log('otherTransitions:', otherTransitions);
        
            return condition;
        });

        

        if (otherTransitions.length > 0) {
            console.log('Curved arrow logic executed!');
            // Use Bézier curve for curved arrow
            const controlPointX = (srcPos.x + dstPos.x) / 2;
            const controlPointY = (srcPos.y + dstPos.y) / 2 - 50; // You may need to adjust this value
    
            this.arrowObject.points([
                srcPos.x,
                srcPos.y,
                controlPointX,
                controlPointY,
                dstPos.x,
                dstPos.y
            ]);
    
            this.arrowObject.tension(0.5); // Experiment with tension value
    
            // calculate center of transition line, for label
            const xCenter = (srcPos.x + dstPos.x) / 2;
            const yCenter = (srcPos.y + dstPos.y) / 2;
            this.labelObject.x(xCenter);
            this.labelObject.y(yCenter);
    
            this.labelCenterDebugObject.position({ x: xCenter, y: yCenter });
        } 
        else {        

            let xDestRelativeToSrc = dstPos.x - srcPos.x;
            let yDestRelativeToSrc = dstPos.y - srcPos.y;

            let magnitude = Math.sqrt(xDestRelativeToSrc * xDestRelativeToSrc + yDestRelativeToSrc * yDestRelativeToSrc);

            let newMag = NodeWrapper.NodeRadius + TransitionWrapper.ExtraTransitionArrowPadding;
            let xUnitTowardsSrc = xDestRelativeToSrc / magnitude * newMag;
            let yUnitTowardsSrc = yDestRelativeToSrc / magnitude * newMag;

            this.arrowObject.points([
                srcPos.x,
                srcPos.y,
                dstPos.x - xUnitTowardsSrc,
                dstPos.y - yUnitTowardsSrc
            ]);

            this.arrowObject.tension(0);

            // calculate center of transition line, for label
            const xAvg = ((srcPos.x + xUnitTowardsSrc) + (dstPos.x - xUnitTowardsSrc)) / 2;
            const yAvg = ((srcPos.y + yUnitTowardsSrc) + (dstPos.y - yUnitTowardsSrc)) / 2;

            const xCenter = xAvg;// - this.labelObject.getTextWidth() / 2;
            const yCenter = yAvg;
            this.labelObject.x(xCenter);
            this.labelObject.y(yCenter);

            this.labelCenterDebugObject.position({x: xCenter, y: yCenter});
        }
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