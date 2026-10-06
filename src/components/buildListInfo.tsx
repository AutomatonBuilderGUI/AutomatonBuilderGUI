import * as React from "react";
export default function BuildGitInfo({ children }: React.PropsWithChildren) {
  return (
    <>
      {React.Children.map(children, (child) => {
        return (
          <div
            style={{
              borderRadius: "1vh",
              padding: "1vh",
              border: "0.25vh solid black",
              marginTop: "1vh",
              marginBottom: "1h",
            }}
          >
            {" "}
            {child}
          </div>
        );
      })}
    </>
  );
}
