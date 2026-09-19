interface ModalWindowListItemProps {
  title: string;
  subtitle?: string | undefined;
  rightContent?: JSX.Element | undefined;
}

/**
 * Creates an empty iOS-style list item. To get content inside to align correctly,
 * you should probably use `CoreListItem_Left` and `CoreListItem_Right` as children.
 * @param {React.PropsWithChildren} props
 * @param {React.ReactNode | undefined} props.children The content to place within the list item.
 */
export function CoreListItem(props: React.PropsWithChildren) {
  return (
    <div className="flow-root bg-white dark:bg-gray-600 p-2 px-2 first:rounded-t-lg last:rounded-b-lg w-full">
      {props.children}
    </div>
  );
}

/**
 * Aligns content within a `CoreListItem` to the left. Always use
 * as a child of a `CoreListItem`.
 * @param {React.PropsWithChildren} props
 * @param {React.ReactNode | undefined} props.children The content to place within the list item.
 */
export function CoreListItem_Left(props: React.PropsWithChildren) {
  return <div className="float-left align-middle ml-1">{props.children}</div>;
}

/**
 * Aligns content within a `CoreListItem` to the right. Always use
 * as a child of a `CoreListItem`.
 * @param {React.PropsWithChildren} props
 * @param {React.ReactNode | undefined} props.children The content to place within the list item.
 */
export function CoreListItem_Right(props: React.PropsWithChildren) {
  return <div className="float-right align-middle mr-1">{props.children}</div>;
}

/**
 * Creates an iOS-style list item.
 * @param {React.PropsWithChildren<ModalWindowListItemProps>} props
 * @param {title} props.title A title to display on the left-hand side of the list item.
 * @param {string=} props.subtitle A subtitle to display, underneath the title.
 * @param {JSX.Element | undefined} props.rightContent An element to display to on the right-hand side of the list item.
 */
export function ListItem(
  props: React.PropsWithChildren<ModalWindowListItemProps>,
) {
  return (
    <CoreListItem>
      <CoreListItem_Left>
        {props.title}
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {props.subtitle}
        </div>
      </CoreListItem_Left>
      <CoreListItem_Right>{props.rightContent}</CoreListItem_Right>
    </CoreListItem>
  );
}
