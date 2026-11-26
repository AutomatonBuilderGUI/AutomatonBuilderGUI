import { Tool } from "./Tool";

/**
 * Maps a KeyboardEvent.code to the tool it selects. Returns undefined when
 * the key is not a tool shortcut.
 */
export function toolForShortcut(code: string): Tool | undefined {
  switch (code) {
    case "KeyA":
      return Tool.States;
    case "KeyT":
      return Tool.Transitions;
    case "KeyS":
      return Tool.Select;
    case "KeyC":
      return Tool.Comment;
    case "KeyB":
      return Tool.SelectBox;
    default:
      return undefined;
  }
}
