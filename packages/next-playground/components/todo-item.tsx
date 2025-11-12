interface Todo {
  id: number;
  title: string;
}

export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li>
      <span>{todo.title}</span>
    </li>
  );
}
