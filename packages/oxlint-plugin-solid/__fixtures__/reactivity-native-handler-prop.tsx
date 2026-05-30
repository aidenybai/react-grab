interface Props {
  onClick: () => void;
}

export const Button = (props: Props) => {
  return <button onClick={props.onClick}>click</button>;
};
