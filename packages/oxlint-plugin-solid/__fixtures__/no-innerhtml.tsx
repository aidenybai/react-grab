export const Raw = (props: { html: string }) => {
  return <div innerHTML={props.html} />;
};
