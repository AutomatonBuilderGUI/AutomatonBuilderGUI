import { ReactElement, useContext, useEffect, useState } from "react";
import TokenWrapper from "../TokenWrapper";
import StateManager from "../StateManager";
import {
  CoreListItem,
  CoreListItem_Left,
  CoreListItem_Right,
  ListItem,
} from "./ListItem";
import {
  BsBug,
  BsBugFill,
  BsGithub,
  BsInfoCircle,
  BsInfoCircleFill,
  BsPalette,
  BsPaletteFill,
} from "react-icons/bs";

import { DarkModeContext } from "../DarkModeContext";

function SettingsMenuItem({
  name,
  icon,
  onClick,
  selected,
}: {
  name: string;
  icon: ReactElement;
  onClick: any;
  selected: boolean;
}) {
  return (
    <CoreListItem>
      <button onClick={onClick}>
        <CoreListItem_Left>
          <div className={selected ? "text-blue-600" : ""}>
            <div className="flex flex-row items-center">
              {icon}&nbsp;{name}
            </div>
          </div>
        </CoreListItem_Left>
      </button>
    </CoreListItem>
  );
}

function AppearancePanel() {
  const { useDarkMode, setDarkMode } = useContext(DarkModeContext);
  const darkModeToggle = (
    <input
      type="checkbox"
      id="dark-mode-enabled"
      name="dark-mode-enabled"
      checked={useDarkMode}
      onChange={(e) => setDarkMode(e.target.checked)}
    ></input>
  );

  return (
    <div className="">
      <ListItem
        title="Dark Mode"
        // subtitle="Make the interface appear dark."
        rightContent={darkModeToggle}
      />
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="ml-4">
      <div className="bg-white dark:bg-gray-600 p-2 rounded-lg">
        <div className="mb-4">
          Automaton Builder GUI is a free and open-source web app for building
          and validating finite state automata.
        </div>
        <div className="mb-4">
          Development started in September 2023 by Malcolm Anderson; the project
          has since been sponsored as a capstone project for Washington State
          University Vancouver computer science students by Malcolm Anderson and
          Professor Farhana Kabir.
        </div>
        <a
          href="https://github.com/AutomatonBuilderGUI/AutomatonBuilderGUI"
          className="rounded-full p-2 px-4 m-1 mx-2 mb-2 block bg-blue-600 text-white text-center w-fit"
        >
          <div className="flex flex-row items-center">
            <BsGithub />
            &nbsp;View &amp; Contribute on GitHub&nbsp;&rsaquo;
          </div>
        </a>
        <a
          href="https://github.com/AutomatonBuilderGUI/AutomatonBuilderGUI/issues"
          className="rounded-full p-2 px-4 m-1 mx-2 block bg-red-600 text-white text-center w-fit"
        >
          <div className="flex flex-row items-center">
            <BsBugFill />
            &nbsp;Report Bugs on GitHub&nbsp;&rsaquo;
          </div>
        </a>
      </div>
    </div>
  );
}

function CurrentPanel({ id }: { id: string }) {
  if (id === "appearance") {
    return <AppearancePanel />;
  } else if (id === "about") {
    return <AboutPanel />;
  }
}

export default function SettingsWindow() {
  // TODO: "Report a Bug" window
  const [currentPage, setCurrentPage] = useState("appearance");
  return (
    <div className="">
      <div className="flex flex-row">
        <div className="">
          <div className="mb-4">
            <SettingsMenuItem
              name="Appearance"
              icon={
                currentPage === "appearance" ? <BsPaletteFill /> : <BsPalette />
              }
              selected={currentPage === "appearance"}
              onClick={() => {
                setCurrentPage("appearance");
              }}
            />
          </div>
          <div>
            <SettingsMenuItem
              name="About"
              icon={
                currentPage === "about" ? (
                  <BsInfoCircleFill />
                ) : (
                  <BsInfoCircle />
                )
              }
              selected={currentPage === "about"}
              onClick={() => {
                setCurrentPage("about");
              }}
            />
          </div>
        </div>
        <div className="ml-4 w-full">
          <CurrentPanel id={currentPage} />
        </div>
      </div>
    </div>
  );
}
