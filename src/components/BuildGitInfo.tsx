import * as React from "react";
import { CoreListItem, CoreListItem_Left } from "./ListItem";
export default function BuildGitInfo({ children }: React.PropsWithChildren) {
  return (
    <>
      {React.Children.map(children, (child) => {
        return (
          <CoreListItem>
            <CoreListItem_Left>{child}</CoreListItem_Left>
          </CoreListItem>
        );
      })}
    </>
  );
}
