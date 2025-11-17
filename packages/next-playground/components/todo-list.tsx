"use client";

import { useEffect } from "react";
import { TodoItem } from "./todo-item";

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

export const TodoList = () => {
  useEffect(() => {
    // HACK: Intentional demo errors to test React error toast capture
    setTimeout(() => {
      throw new Error("React component render error in TodoList.tsx");
    }, 2000);

    setTimeout(() => {
      Promise.reject(
        new Error("React async error: Failed to fetch todo data"),
      );
    }, 3000);
  }, []);

  const handleClickError = () => {
    throw new Error("React click handler error in TodoList component");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>Todo List</h1>
        <button
          onClick={handleClickError}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Trigger Error
        </button>
      </div>
      <ul className="list-disc list-inside">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
};
