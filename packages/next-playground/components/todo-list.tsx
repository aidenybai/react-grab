"use client";

import { TodoItem } from "./todo-item";

export function TodoList() {
  const todos = [
    { id: 1, title: "Buy groceries" },
    { id: 2, title: "Write a blog post" },
    { id: 3, title: "Build a new feature" },
    { id: 4, title: "Fix a bug" },
    { id: 5, title: "Refactor code" },
    { id: 6, title: "Write tests" },
    { id: 7, title: "Write documentation" },
    { id: 8, title: "Build a new website" },
    { id: 9, title: "Build a new mobile app" },
    { id: 10, title: "Build a new desktop app" },
  ];
  return (
    <div>
      <h1>Todo List</h1>
      <ul className="list-disc list-inside">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
}
