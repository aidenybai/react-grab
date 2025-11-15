"use client";

import { useState } from "react";
import { TodoItem } from "./todo-item";
import { getGlobalApi } from "react-grab";

export function TodoList() {
  const [isActive, setIsActive] = useState(false);

  const handleToggle = () => {
    const api = getGlobalApi();
    if (api) {
      api.toggle();
      setIsActive(api.isActive());
    }
  };

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
      <div className="flex items-center justify-between mb-4">
        <h1>Todo List</h1>
        <button
          onClick={handleToggle}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {isActive ? "Deactivate" : "Activate"} Selection Mode
        </button>
      </div>
      <ul className="list-disc list-inside">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
}
