interface Props {
  items: string[];
}

export const List = (props: Props) => {
  return (
    <ul>
      {props.items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  );
};
