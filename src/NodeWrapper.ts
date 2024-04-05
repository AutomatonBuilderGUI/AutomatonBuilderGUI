import Konva from 'konva';
import StateManager from './StateManager';
import { Tool } from './Tool';
import { Vector2d } from 'konva/lib/types';
import SelectableObject from './SelectableObject';
import { v4 as uuidv4 } from 'uuid';
import TransitionWrapper from './TransitionWrapper';

export default class NodeWrapper extends SelectableObject {
  public static readonly NodeRadius = 30;

  public static readonly SelectedStrokeColor = '#018ED5';
  public static readonly SelectedStrokeWidth = 4;

  public static readonly StrokeColor = 'black';
  public static readonly StrokeWidth = 2;

  private nodeBackground: Konva.Circle;
  private nodeAcceptCircle: Konva.Circle;

  private nodeLabel: Konva.Text;
  public nodeGroup: Konva.Group;

  private lastPos: Vector2d;

  private _isAcceptNode: boolean = false;

  private _labelText: string = "state";

  private readonly _id: string
  public get id(): string {
    return this._id;
  }

  public toJSON() {
    return {
      id: this.id,
      x: this.nodeGroup.x(),
      y: this.nodeGroup.y(),
      label: this.labelText
    }
  }

  constructor(x: number, y: number, label: string | null = null, isAcceptState: boolean | null = null, id: string | null = null) {
    super();
    this._id = id ?? uuidv4();

    this._labelText = label ?? `q${StateManager._nextStateId++}`; // This becomes the label;

    this.nodeGroup = new Konva.Group({ x: x, y: y });

    // create our shape
    this.nodeBackground = new Konva.Circle({
      x: 0,
      y: 0,
      radius: NodeWrapper.NodeRadius,
      fill: StateManager.colorScheme.nodeFill,
      stroke: StateManager.colorScheme.nodeStrokeColor,
      strokeWidth: NodeWrapper.StrokeWidth
    });

    this.nodeAcceptCircle = new Konva.Circle({
      x: 0,
      y: 0,
      radius: NodeWrapper.NodeRadius * 0.8,
      fill: 'transparent',
      stroke: StateManager.colorScheme.nodeAcceptStrokeColor,
      strokeWidth: 1.5,
      visible: this._isAcceptNode
    });

    this.nodeLabel = new Konva.Text({
      x: (-NodeWrapper.NodeRadius * 2 * 0.75) / 2,
      y: (-NodeWrapper.NodeRadius * 2 * 0.75) / 2,
      width: NodeWrapper.NodeRadius * 2 * 0.75,
      height: NodeWrapper.NodeRadius * 2 * 0.75,
      align: 'center',
      verticalAlign: 'middle',
      text: this._labelText,
      fontSize: 15,
      fill: StateManager.colorScheme.nodeLabelColor,
    });

    this.nodeGroup.add(this.nodeBackground);
    this.nodeGroup.add(this.nodeAcceptCircle);
    this.nodeGroup.add(this.nodeLabel);

    this.nodeGroup.draggable(true);

    // TODO: figure out how to get this to activate when in drag operation
    // https://konvajs.org/docs/drag_and_drop/Drop_Events.html
    this.nodeGroup.on('mouseenter', (ev) => this.onMouseEnter.call(this, ev));
    this.nodeGroup.on('mouseleave', (ev) => this.onMouseLeave.call(this, ev));

    this.nodeGroup.on('click', (ev) => this.onClick.call(this, ev));
    this.nodeGroup.on('dragstart', (ev) => this.onDragStart.call(this, ev));
    this.nodeGroup.on('dragmove', (ev) => this.onDragMove.call(this, ev));
    this.nodeGroup.on('dragend', (ev) => this.onDragEnd.call(this, ev));
  }

  public adjustFontSize() {
    const maxTextWidth = NodeWrapper.NodeRadius * 2 * 0.75; // 75% of the diameter (inner circle is 80% of diameter)
    let fontSize = this.nodeLabel.fontSize();
    
    const tempText = new Konva.Text({
      text: this._labelText,
      fontSize: fontSize,
    });
  
    // measure text width with current font size
    let textWidth = tempText.getClientRect().width;

    if (textWidth > maxTextWidth && fontSize > 10) 
    {
      while (textWidth > maxTextWidth && fontSize > 10) 
      { // minimum font size is 10
        fontSize -= 1; // decrement font size
        tempText.fontSize(fontSize); // update tempText font size
        textWidth = tempText.getClientRect().width; // remeasure text width with new font size
      }
    } 
    else if (textWidth < maxTextWidth && fontSize < 15) 
    {
      // Increase font size until the text fits within the maximum width
      while (textWidth < maxTextWidth && fontSize < 15) 
      { 
        fontSize += 1; // increment font size
        tempText.fontSize(fontSize); 
        textWidth = tempText.getClientRect().width; 
      }
    }

    this.nodeLabel.fontSize(fontSize);
    this.nodeLabel.wrap('word');
    this.nodeLabel.align('center');
    this.nodeLabel.verticalAlign('middle');
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

  public select() {
    this.nodeBackground.stroke(StateManager.colorScheme.selectedNodeStrokeColor);
    this.nodeBackground.strokeWidth(NodeWrapper.SelectedStrokeWidth);
  }

  public deselect() {
    this.nodeBackground.stroke(StateManager.colorScheme.nodeStrokeColor);
    this.nodeBackground.strokeWidth(NodeWrapper.StrokeWidth);
  }

  public deleteKonvaObjects() {
    this.nodeGroup.destroy();
  }

  public get isAcceptNode(): boolean {
    return this._isAcceptNode;
  }

  public set isAcceptNode(value: boolean) {
    const prev = this._isAcceptNode;
    this._isAcceptNode = value;
    if (this._isAcceptNode) {
      this.nodeAcceptCircle.visible(true);
    }
    else {
      this.nodeAcceptCircle.visible(false);
    }
  }

  public toggleAcceptNode() {
    this.isAcceptNode = !this._isAcceptNode;
  }


  public enableNewConnectionGlow() {
    this.nodeBackground.shadowColor(StateManager.colorScheme.newConnectionGlowColor);
    this.nodeBackground.shadowOffset({ x: 0, y: 0 });
    this.nodeBackground.shadowOpacity(StateManager.colorScheme.newConnectionShadowOpacity);
    this.nodeBackground.shadowBlur(StateManager.colorScheme.newConnectionShadowBlur);
    this.nodeBackground.shadowEnabled(true);
  }

  public disableShadowEffects() {
    this.nodeBackground.shadowEnabled(false);
  }

  public enableDragDropShadow() {
    this.nodeBackground.shadowColor(StateManager.colorScheme.nodeDragDropShadowColor);
    this.nodeBackground.shadowOffset({ x: 0, y: 3 });
    this.nodeBackground.shadowOpacity(StateManager.colorScheme.nodeDragDropShadowOpacity);
    this.nodeBackground.shadowBlur(StateManager.colorScheme.nodeDragDropShadowBlur);
    this.nodeBackground.shadowEnabled(true);
  }

  public onMouseEnter(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Transitions && StateManager.tentativeTransitionInProgress) {
      StateManager.tentativeTransitionTarget = this;
      this.enableNewConnectionGlow();
    }
  }

  public onMouseLeave(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Transitions) {
      if (StateManager.tentativeTransitionInProgress && StateManager.tentativeTransitionTarget === this) {
        StateManager.tentativeTransitionTarget = null;
        this.disableShadowEffects();
      }
    }
  }

  public onDragStart(ev: Konva.KonvaEventObject<MouseEvent>) {
    this.lastPos = this.nodeGroup.absolutePosition();

    // No dragging when in state mode!
    if (StateManager.currentTool === Tool.States) {
      this.nodeGroup.stopDrag();
    }
    else if (StateManager.currentTool === Tool.Transitions) {
      StateManager.startTentativeTransition(this);
    }
    else if (StateManager.currentTool === Tool.Select) {
      if (!ev.evt.shiftKey && StateManager.selectedObjects.length === 1) {
        StateManager.deselectAllObjects();
      }
      StateManager.selectObject(this);

      StateManager.selectedObjects.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          obj.enableDragDropShadow();
        }
      });
    }
  }

  public onDragMove(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool == Tool.Transitions) {
      this.nodeGroup.absolutePosition(this.lastPos);
      StateManager.updateTentativeTransitionHead(ev.evt.pageX, ev.evt.pageY);
    }
    else if (StateManager.currentTool === Tool.Select) {
      this.konvaObject().fire('move', ev);

      // Move all selected objects along with this one!
      const allOtherSelected = StateManager.selectedObjects.filter((i) => i !== this);
      allOtherSelected.forEach((obj) => {
        if (obj instanceof NodeWrapper) {
          obj.konvaObject().absolutePosition({
            x: obj.konvaObject().absolutePosition().x + ev.evt.movementX,
            y: obj.konvaObject().absolutePosition().y + ev.evt.movementY
          });
          obj.konvaObject().fire('move', ev);
        }
      });
    }
  }

  public onDragEnd() {
    if (StateManager.currentTool === Tool.States) {
    } 
    else if (StateManager.currentTool === Tool.Select && StateManager.isSnapToGridEnabled()) {
       
        // Get the node's current position relative to the stage
        const nodePos = this.nodeGroup.position();

        // Snap the position to the nearest grid points
        const gridCellSize = 50;
        let snappedX = Math.round(nodePos.x / gridCellSize) * gridCellSize;
        let snappedY = Math.round(nodePos.y / gridCellSize) * gridCellSize;

        // Adjust the snapped position by the scale to get the final position on the stage
        this.nodeGroup.position({
            x: snappedX,
            y: snappedY
        });
        
        StateManager.updateStartNodePosition();

        // update all related transitions
        StateManager.transitions.forEach(transition => {
          if (transition.involvesNode(this)) {
            transition.updatePoints();
          }
        });
        // Redraw the layer to reflect the changes
        this.nodeGroup.getLayer()?.batchDraw();
        
    } else if (StateManager.currentTool === Tool.Transitions) {
        // Handling specific to ending a tentative transition
        StateManager.endTentativeTransition();
    } else if (StateManager.currentTool === Tool.Select) {
        // Deselect and remove shadow effects from all selected nodes
        StateManager.selectedObjects.forEach((obj) => {
            if (obj instanceof NodeWrapper) {
                obj.disableShadowEffects();
            }
        });
    }
}



  public konvaObject(): Konva.Node {
    return this.nodeGroup;
  }

  public get labelText(): string {
    return this._labelText;
  }

  public set labelText(value: string) {
    this._labelText = value;
    this.nodeLabel.text(this._labelText);
    this.adjustFontSize();
  }

  public updateColorScheme() {
    this.nodeBackground.fill(StateManager.colorScheme.nodeFill);
    
    
    this.nodeBackground.stroke(StateManager.colorScheme.nodeStrokeColor);
    this.nodeAcceptCircle.stroke(StateManager.colorScheme.nodeAcceptStrokeColor);
    this.nodeLabel.fill(StateManager.colorScheme.nodeLabelColor);
  }
}