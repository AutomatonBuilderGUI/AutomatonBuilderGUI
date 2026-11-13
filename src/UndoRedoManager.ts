import { v4 as uuidv4 } from "uuid";
import StateManager from "./StateManager";

export default class UndoRedoManager {
  // The stack we push actions onto and pop off.
  private static _stack: Array<Action> = [];

  // Our current location within the action stack.
  // This will usually be equal to _stack.length - 1,
  // indicating that we are at the top of the stack.
  // However, if we start undoing actions, we will move
  // down the stack.
  private static _stackLocation: number = -1;

  // A set of functions to call when the stack changes.
  private static _listeners: Set<() => void> = new Set<() => void>();

  /**
   * Pushes an action to the undo-redo system and performs it.
   *
   * Note: if you are going to set perform forward to false, it is on you to make sure that debug-unsafe actions are stopped.
   *
   * @param action the action to push to the action stack.
   * @param performForward by default, this is true, override to false to skip performing the action.
   * @returns
   */
  public static pushAction(action: Action, performForward: boolean = true) {
    if (!action.isDebugSafe && StateManager.debugEnabled) return;
    // If we got here then some kind of change happened so mark it as dirty.
    StateManager.makeDirty();
    if (this._stackLocation == this._stack.length - 1) {
      // We are at the top of the stack, so we can
      // just add this new action to the top.
      this._stack.push(action);
      this._stackLocation += 1;
    } else {
      // We are not at the top of the stack, so we
      // need to remove all of the actions from the
      // top down to the current one.
      while (
        this._stack.length > 0 &&
        this._stackLocation < this._stack.length - 1
      ) {
        this._stack.pop();
      }
      this._stack.push(action);
      this._stackLocation = this._stack.length - 1;
    }

    if (performForward) {
      action.forward();
    }

    this.callListeners();
  }

  public static redo() {
    StateManager.makeDirty();
    if (this._stackLocation == this._stack.length - 1) {
      console.error("Can't redo because we're at the top of the stack");
      return;
    }
    if (
      !this._stack[this._stackLocation + 1].isDebugSafe &&
      StateManager.debugEnabled
    ) {
      console.error("Can't redo because the next action is not debug safe");
      return;
    }
    this._stackLocation += 1;
    this._stack[this._stackLocation].forward();
    this.callListeners();
  }

  public static undo() {
    StateManager.makeDirty();
    if (this._stackLocation == -1) {
      console.error("Can't undo because the stack is empty");
      return;
    }
    if (
      !this._stack[this._stackLocation].isDebugSafe &&
      StateManager.debugEnabled
    ) {
      console.error("Can't undo because the previous action is not debug safe");
      return;
    }
    this._stack[this._stackLocation].backward();
    this._stackLocation -= 1;
    this.callListeners();
  }

  // TODO: Pass a copy of the stack rather than the stack itself,
  // to prevent modifications
  public static getStack() {
    return this._stack;
  }

  public static getStackLocation() {
    return this._stackLocation;
  }

  public static startListeningOnStackChanged(listener: () => void) {
    this._listeners.add(listener);
  }

  public static stopListeningOnStackChanged(listener: () => void) {
    this._listeners.delete(listener);
  }

  private static callListeners() {
    this._listeners.forEach((listener) => listener());
  }
  public static reset() {
    this._stack = [];
    this.callListeners();
  }
}

export class Action {
  public name: string;
  public displayString: string;
  private _forward: (data: ActionData) => void;
  private _backward: (data: ActionData) => void;
  private _data: ActionData;
  private _id: string;
  public isDebugSafe: boolean;

  constructor(
    name: string,
    displayString: string,
    forward: (data: ActionData) => void,
    backward: (data: ActionData) => void,
    data: ActionData,
    debugSafe: boolean = false,
  ) {
    this.name = name;
    this.displayString = displayString;
    this._forward = forward;
    this._backward = backward;
    this._data = data;
    this._id = uuidv4();
    this.isDebugSafe = debugSafe;
  }

  public get id(): string {
    return this._id;
  }

  public forward() {
    this._forward(this._data);
  }

  public backward() {
    this._backward(this._data);
  }
}

export class ActionData {}
