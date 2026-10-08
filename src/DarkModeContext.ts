import { createContext } from "react";

export const DarkModeContext = createContext({
  useDarkMode: false,
  setDarkMode: (v: boolean) => {},
});
