/**
 * The different kinds of tools that can be used.
 *
 * - `States` - Double-clicking the canvas adds a new node to the automaton.
 * - `Transitions` - Dragging off of a node and onto another node creates
 * a transition between those nodes.
 * - `SetAccept` (UNUSED) - Clicking a node causes it to become an accept state?
 * - `Select` - Clicking nodes or transitions causes them to become selected,
 * and they can be dragged.
 * - `Comment` - Clicking + dragging creates a rectangular comment region.
 */
export enum Tool {
  States,
  Transitions,
  SetAccept,
  Select,
  Comment,
  SelectBox,
}
