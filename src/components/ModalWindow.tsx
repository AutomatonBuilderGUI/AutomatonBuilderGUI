import { BsXLg } from "react-icons/bs";
import { motion } from "framer-motion";

interface ClosableModalWindowProps {
  title?: string;
  close?: () => void;
}

/**
 * A window that darkens the screen behind it, preventing input to the main program.
 * It also displays a title and a close button.
 *
 * **NOTE:** The close button on its own does not do anything; you need to provide
 * a function to it via `props.close`.
 * @param props
 * @param {title} [props.title] A title to display at the top of the modal window.
 * @param {} [props.close] A function to run when the close button is clicked.
 * @param {React.ReactNode | undefined} props.children The content to place inside this modal window.
 * @returns
 */
export function ClosableModalWindow(
  props: React.PropsWithChildren<ClosableModalWindowProps>,
) {
  return (
    <ModalWindow>
      <div className="m-3">
        <div className="flow-root">
          <div className="float-left">
            <div className="font-medium text-3xl mb-2">{props.title}</div>
          </div>
          <button className="float-right" onClick={props.close}>
            <BsXLg />
          </button>
        </div>
        {props.children}
      </div>
    </ModalWindow>
  );
}

/**
 * A window that darkens the screen behind it, preventing input to the main program.
 * Currently, this is used for the "Configure Automaton" window.
 *
 * **NOTE:** This component does not include a way to close itself. You may want
 * to instead use `ClosableModalWindow`, and pass a callback to it to close itself
 * when its close button is clicked.
 * @param props
 * @param {React.ReactNode | undefined} props.children The content to place inside this modal window.
 * @returns
 */
export default function ModalWindow(props: React.PropsWithChildren) {
  return (
    <>
      <div
        className={`z-40 fixed inset-0 bg-gray-500/50 dark:bg-gray-950/70`}
      ></div>
      <div className={`fixed inset-0 z-50 w-screen overflow-y-auto`}>
        <div
          className={`flex min-h-full justify-center p-4 text-center items-center sm:p-0`}
        >
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="sm:w-[95%] md:w-[70%] lg:w-[50%] h-full"
          >
            <div className="relative transform overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white text-left shadow-xl w-full h-full">
              {props.children}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
