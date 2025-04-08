import { useActionStack } from "../../utilities/ActionStackUtilities";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";

interface ActionRowItemProps {
  displayString: string;
  id: string;
  greyedOut: boolean;
}

/**
 * Represents a single action within the action stack.
 * @param props
 * @param {string} props.displayString The text to display on the row item.
 * @param {string} props.id A unique identifier for the row item, so it may
 * persist across UI updates.
 * @param {boolean} props.greyedOut Whether or not to display this row item
 * with a grey text color. This is used when an item is beyond the current
 * stack pointer, to indicate that its effect is not visible in the current
 * state of the automaton.
 * @returns
 */
function ActionRowItem(props: ActionRowItemProps) {
  return (
    <div
      className={`border-t-2 border-zinc-400 ${props.greyedOut ? "text-zinc-400" : ""}`}
    >
      {props.displayString}
    </div>
  );
}

/**
 * Creates the UI for visualizing the action stack (actions that can be undone
 * and redone).
 * @returns
 */
export default function DetailsBox_ActionStackViewer() {
  // This component displays a list of items currently in the action stack.
  // It allows the user to see what actions they can undo or redo.
  const [currentStack, currentStackLocation] = useActionStack();
  return (
    <div className="flex flex-col">
      <div className="font-medium text-2xl">Action Stack</div>
      <motion.ul layout layoutId="list">
        <AnimatePresence>
          {currentStack.map((item, index) => {
            // If this action is ahead of the current stack location,
            // then it is accessible via the "redo" command.
            // For now, it should be greyed out since its effects
            // are not active.
            let aheadOfStackLocation =
              currentStack.length - index - 1 > currentStackLocation;
            return (
              <motion.li
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                key={item.id}
              >
                <ActionRowItem
                  displayString={item.displayString}
                  id={item.id}
                  greyedOut={aheadOfStackLocation}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
