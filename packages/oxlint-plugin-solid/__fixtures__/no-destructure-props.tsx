interface Props {
  label: string;
}

export const Greeting = ({ label }: Props) => {
  return <span>{label}</span>;
};
