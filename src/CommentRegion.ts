import Konva from "konva";
import StateManager from "./StateManager";
import { Tool } from "./Tool";
import { Vector2d } from "konva/lib/types";
import SelectableObject from "./SelectableObject";
import { v4 as uuidv4 } from "uuid";

export default class CommentRegion extends SelectableObject {
  // make the color configurable later
  public static readonly CornerRadius = 8;
  public static readonly StrokeWidth = 4;
  public static readonly SelectedstrokeWidth = 6;
  public static readonly InitialWidth = 300;
  public static readonly InitialHeight = 300;
  public static readonly MinWidth = 50;
  public static readonly MinHeight = 50;
  public static readonly FontSize = 20;
  public static readonly FontPadding = 5;
  public static readonly CommentRectMargin = 8;
  public static readonly ResizeMargin = 15;

  private commentText: Konva.Text;
  private commentRect: Konva.Rect;
  private regionRect: Konva.Rect;

  public nodeGroup: Konva.Group;

  /** The last position of the comment before being dragged */
  private lastPos: Vector2d;

  /** The previous drag position of the comment */
  private lastDragPos: Vector2d = { x: 0, y: 0 };

  private isSelected: boolean = false;
  public resizing = { left: false, right: false, up: false, down: false };

  // eventually add another editor that changes the text
  private _text: string = "Insert Description";
  private _color: string = "#ffbf00";
  private readonly _id: string;

  constructor(label: string | null = null, id: string | null = null) {
    super();
    this._text = label ?? this._text;
    this._id = id ?? uuidv4();
  }

  public get id(): string {
    return this._id;
  }

  public get text(): string {
    return this._text;
  }

  public set text(newComment: string) {
    this._text = newComment;
    this.commentText.text(this._text);
    this.commentText.width(undefined);

    if (this.commentText.width() > this.regionRect.width())
      this.commentText.width(this.regionRect.width());

    this.commentText.y(
      -this.commentText.height() - CommentRegion.CommentRectMargin,
    );

    this.commentRect.width(this.commentText.width());
    this.commentRect.height(this.commentText.height());
    this.commentRect.y(this.commentText.y());
  }

  public get color(): string {
    return this._color;
  }

  public set color(newColor: string) {
    this._color = newColor;
    this.setKonvaColors(this._color);
  }

  public setKonvaColors(newColor: string) {
    if (!this.isSelected) {
      this.commentRect.stroke(newColor);
      this.regionRect.stroke(newColor);
    }
    this.commentRect.fill(newColor + "80");
    this.regionRect.fill(newColor + "80");
  }

  public createKonvaObjects(x: number, y: number, w: number, h: number) {
    this.nodeGroup = new Konva.Group({ x: x, y: y });

    this.regionRect = new Konva.Rect({
      x: 0,
      y: 0,
      cornerRadius: CommentRegion.CornerRadius,
      fill: this.color + "80",
      stroke: this.color,
      strokeWidth: CommentRegion.StrokeWidth,
      width: w,
      height: h,
    });

    this.commentText = new Konva.Text({
      x: 0,
      y: 0,
      align: "left",
      verticalAlign: "middle",
      text: this.text,
      fontSize: CommentRegion.FontSize,
      fill: "black", // make it black or white depending on background color
      padding: CommentRegion.FontPadding,
    });

    if (this.commentText.width() > w) this.commentText.width(w);

    this.commentText.y(
      -this.commentText.height() - CommentRegion.CommentRectMargin,
    );

    this.commentRect = new Konva.Rect({
      x: 0,
      y: this.commentText.y(),
      cornerRadius: CommentRegion.CornerRadius,
      fill: this.color + "80",
      stroke: this.color,
      strokeWidth: CommentRegion.StrokeWidth,
      width: this.commentText.width(),
      height: this.commentText.height(),
    });

    // Add elements to the node group in order
    this.nodeGroup.add(this.regionRect);
    this.nodeGroup.add(this.commentRect);
    this.nodeGroup.add(this.commentText);

    this.nodeGroup.draggable(true);

    // Event listeners
    this.nodeGroup.on("mousedown", (ev) => this.onMouseDown.call(this, ev));
    this.nodeGroup.on("click", (ev) => this.onClick.call(this, ev));
    this.nodeGroup.on("dragstart", (ev) => this.onDragStart.call(this, ev));
    this.nodeGroup.on("dragmove", (ev) => this.onDragMove.call(this, ev));
    this.nodeGroup.on("dragend", (ev) => this.onDragEnd.call(this, ev));
    this.nodeGroup.on("mouseleave", (ev) => this.onMouseLeave.call(this, ev));

    // Only do this in regionRect to prevent mouse icon changing when hovering over commentRect
    this.regionRect.on("mousemove", (ev) => this.onMouseMove.call(this, ev));
  }

  public select(): void {
    this.commentRect.strokeWidth(CommentRegion.SelectedstrokeWidth);
    this.commentRect.stroke(StateManager.colorScheme.selectedNodeStrokeColor);

    this.regionRect.strokeWidth(CommentRegion.SelectedstrokeWidth);
    this.regionRect.stroke(StateManager.colorScheme.selectedNodeStrokeColor);
    this.isSelected = true;
  }

  public deselect(): void {
    this.commentRect.strokeWidth(CommentRegion.StrokeWidth);
    this.commentRect.stroke(this.color);

    this.regionRect.strokeWidth(CommentRegion.StrokeWidth);
    this.regionRect.stroke(this.color);
    this.isSelected = false;
  }

  public get konvaObject(): Konva.Node {
    return this.nodeGroup;
  }

  public deleteKonvaObjects(): void {
    this.nodeGroup.destroy();
  }

  private getLocalMousePos(): Konva.Vector2d {
    const pointerPos = this.nodeGroup.getStage().getPointerPosition();
    const nodePos = this.nodeGroup.getAbsolutePosition();
    const stageScale = StateManager.getStageScale();
    return {
      x: (pointerPos.x - nodePos.x) / stageScale.scaleX,
      y: (pointerPos.y - nodePos.y) / stageScale.scaleY,
    };
  }

  public onMouseLeave(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.resizeComment == this) {
      return;
    }
    ev.target.getStage().container().style.cursor = "default";
  }

  public onMouseMove(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.isSelected || this.nodeGroup.isDragging()) {
      return;
    }

    const mousePos = this.getLocalMousePos();
    const rw = this.regionRect.width();
    const rh = this.regionRect.height();

    const left = mousePos.x < CommentRegion.ResizeMargin;
    const right = mousePos.x > rw - CommentRegion.ResizeMargin;
    const down = mousePos.y < CommentRegion.ResizeMargin;
    const up = mousePos.y > rh - CommentRegion.ResizeMargin;

    if ((left && up) || (right && down)) {
      ev.target.getStage().container().style.cursor = "nesw-resize";
    } else if ((right && up) || (left && down)) {
      ev.target.getStage().container().style.cursor = "nwse-resize";
    } else if (left || right) {
      ev.target.getStage().container().style.cursor = "ew-resize";
    } else if (up || down) {
      ev.target.getStage().container().style.cursor = "ns-resize";
    } else {
      ev.target.getStage().container().style.cursor = "default";
    }
  }

  public onMouseDown(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.isSelected) {
      return;
    }
    const mousePos = this.getLocalMousePos();

    const rw = this.regionRect.width();
    const rh = this.regionRect.height();

    this.resizing.left = mousePos.x < CommentRegion.ResizeMargin;
    this.resizing.right = mousePos.x > rw - CommentRegion.ResizeMargin;
    this.resizing.down =
      mousePos.y < CommentRegion.ResizeMargin && mousePos.y >= 0;
    this.resizing.up = mousePos.y > rh - CommentRegion.ResizeMargin;

    if (
      this.resizing.left ||
      this.resizing.right ||
      this.resizing.down ||
      this.resizing.up
    ) {
      // prevents the stage from being dragged
      ev.cancelBubble = true;
      StateManager.startResizeCommentOperation(this);
    }
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

  public onDragStart(ev: Konva.KonvaEventObject<MouseEvent>) {
    this.lastPos = this.nodeGroup.position();
    this.lastDragPos = this.nodeGroup.position();

    if (StateManager.currentTool !== Tool.Select) {
      // will also call onDragEnd, with evt === undefined
      this.nodeGroup.stopDrag();
      return;
    }

    if (!ev.evt.shiftKey && StateManager.selectedObjects.length === 1) {
      StateManager.deselectAllObjects();
    }

    StateManager.selectObject(this);
    StateManager.startDragCommentsOperation(this.lastPos);
  }

  public onDragMove(ev: Konva.KonvaEventObject<MouseEvent>) {
    if (StateManager.currentTool === Tool.Select) {
      let delta = {
        x: this.konvaObject.x() - this.lastDragPos.x,
        y: this.konvaObject.y() - this.lastDragPos.y,
      };
      this.lastDragPos = this.konvaObject.position();

      // Move all selected objects along with this one!
      const allOtherSelected = StateManager.selectedObjects.filter(
        (i) => i instanceof SelectableObject && i !== this,
      );
      allOtherSelected.forEach((obj) => {
        obj.konvaObject.move({
          x: delta.x,
          y: delta.y,
        });
        obj.konvaObject.fire("move", ev);
      });
    }
  }

  public onDragEnd(ev: Konva.KonvaEventObject<MouseEvent>) {
    // prevents calling completeDrag when no cooresponding startDrag was previously called
    if (ev.evt === undefined) return;
    StateManager.completeDragCommentsOperation(this.nodeGroup.position());
  }

  public resize() {
    const mousePos = this.getLocalMousePos();

    if (this.resizing.left) {
      let newWidth = this.regionRect.width() - mousePos.x;
      if (newWidth < CommentRegion.MinWidth) {
        const diff = CommentRegion.MinWidth - newWidth;
        newWidth = CommentRegion.MinWidth;
        this.nodeGroup.x(this.nodeGroup.x() + mousePos.x - diff);
      } else {
        this.nodeGroup.x(this.nodeGroup.x() + mousePos.x);
      }
      this.regionRect.width(newWidth);
    } else if (this.resizing.right) {
      this.regionRect.width(mousePos.x);
      if (this.regionRect.width() < CommentRegion.MinWidth) {
        this.regionRect.width(CommentRegion.MinWidth);
      }
    }

    if (this.resizing.down) {
      let newHeight = this.regionRect.height() - mousePos.y;
      if (newHeight < CommentRegion.MinHeight) {
        const diff = CommentRegion.MinHeight - newHeight;
        newHeight = CommentRegion.MinHeight;
        this.nodeGroup.y(this.nodeGroup.y() + mousePos.y - diff);
      } else {
        this.nodeGroup.y(this.nodeGroup.y() + mousePos.y);
      }
      this.regionRect.height(newHeight);
    } else if (this.resizing.up) {
      this.regionRect.height(mousePos.y);
      if (this.regionRect.height() < CommentRegion.MinHeight) {
        this.regionRect.height(CommentRegion.MinHeight);
      }
    }

    // allow textbox width to adjust to new regionRect width
    this.text = this._text;
  }

  /**
   * Sets the comment to have a new position.
   * @param position The new position to set the comment to.
   */
  public setPosition(position: Vector2d) {
    this.nodeGroup.position(position);
  }

  /**
   * Updates the comment region to match the current color scheme (light/dark mode).
   */
  public updateColorScheme() {
    if (StateManager.useDarkMode) this.commentText.fill("white");
    else this.commentText.fill("black");
  }

  public getSize(): Vector2d {
    return { x: this.regionRect.width(), y: this.regionRect.height() };
  }

  public setSize(size: Vector2d) {
    this.regionRect.width(size.x);
    this.regionRect.height(size.y);
  }
}
