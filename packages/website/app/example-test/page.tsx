"use client";

import { useState } from "react";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

interface TodoItemRowProps {
  todo: TodoItem;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

interface TodoFooterProps {
  completedCount: number;
  totalCount: number;
  onClearCompleted: () => void;
}

interface TodoStatisticsProps {
  totalCount: number;
  activeCount: number;
  completedCount: number;
}

const TodoInput = ({ value, onChange, onAdd }: TodoInputProps) => {
  return (
    <div className="flex mb-6 gap-1 px-4">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onAdd()}
        placeholder="Add task..."
        className="flex-1 bg-[#141414] rounded-lg px-3 py-4 text-white text-sm placeholder:text-zinc-500 border border-zinc-800"
      />
      <button
        onClick={onAdd}
        className="bg-zinc-600 text-white px-8 py-2 rounded text-sm font-medium"
      >
        Add
      </button>
    </div>
  );
};

TodoInput.displayName = "TodoInput";

const TodoItemRow = ({ todo, onToggle, onDelete }: TodoItemRowProps) => {
  return (
    <div
      className={`flex items-center bg-[#111] rounded-lg border border-zinc-800/50 ${
        todo.completed ? "opacity-50" : ""
      }`}
      style={{ padding: "8px 24px 20px 12px" }}
    >
      <div
        onClick={() => onToggle(todo.id)}
        className={`w-5 h-5 rounded border-2 cursor-pointer mr-2 flex items-center justify-center ${
          todo.completed ? "bg-zinc-500 border-zinc-500" : "border-zinc-500"
        }`}
      >
        {todo.completed && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      <span
        className={`flex-1 ${
          todo.completed ? "line-through text-zinc-500" : "text-zinc-200"
        }`}
        style={{ fontSize: "13px", marginLeft: "16px" }}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-zinc-500 hover:text-red-400 ml-4"
        style={{ padding: "2px 2px 2px 16px" }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

TodoItemRow.displayName = "TodoItemRow";

const TodoFooter = ({
  completedCount,
  totalCount,
  onClearCompleted,
}: TodoFooterProps) => {
  return (
    <div className="mt-12 px-4">
      <div className="flex justify-between items-center py-2 border-t border-zinc-700">
        <span className="text-zinc-400 text-xs pl-6">
          {completedCount} of {totalCount} done
        </span>
        <button
          onClick={onClearCompleted}
          className="text-zinc-500 text-xs hover:text-zinc-300 pr-1"
        >
          Clear completed
        </button>
      </div>
    </div>
  );
};

TodoFooter.displayName = "TodoFooter";

const TodoStatistics = ({
  totalCount,
  activeCount,
  completedCount,
}: TodoStatisticsProps) => {
  return (
    <div className="mt-10 mx-4 bg-[#111] rounded-lg p-6">
      <div className="text-zinc-400 text-xs mb-4 ml-2">Statistics</div>
      <div className="flex">
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-zinc-500 text-xs mt-1">Total</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-white">{activeCount}</div>
          <div className="text-zinc-500 text-xs mt-1">Active</div>
        </div>
        <div className="text-center flex-1">
          <div className="text-2xl font-bold text-white">{completedCount}</div>
          <div className="text-zinc-500 text-xs mt-1">Completed</div>
        </div>
      </div>
    </div>
  );
};

TodoStatistics.displayName = "TodoStatistics";

const ExampleTestPage = () => {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "Fix the header alignment", completed: false },
    { id: 2, text: "Update dependencies", completed: true },
    { id: 3, text: "Write documentation", completed: false },
    { id: 4, text: "Review pull requests", completed: false },
    { id: 5, text: "Deploy to production", completed: false },
  ]);
  const [inputValue, setInputValue] = useState("");

  if (process.env.NODE_ENV === "production") {
    return <div>This page is only available in development mode.</div>;
  }

  const addTodo = () => {
    if (inputValue) {
      setTodos([
        ...todos,
        { id: Date.now(), text: inputValue, completed: false },
      ]);
      setInputValue("");
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed));
  };

  const completedCount = todos.filter((todo) => todo.completed).length;
  const activeCount = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-white text-2xl font-bold mb-2 pl-8">My Todos</h1>
        <p className="text-zinc-400 text-sm mb-8 pl-2">Track your tasks</p>

        <TodoInput
          value={inputValue}
          onChange={setInputValue}
          onAdd={addTodo}
        />

        <div className="space-y-3 px-4">
          {todos.map((todo) => (
            <TodoItemRow
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </div>

        <TodoFooter
          completedCount={completedCount}
          totalCount={todos.length}
          onClearCompleted={clearCompleted}
        />

        <TodoStatistics
          totalCount={todos.length}
          activeCount={activeCount}
          completedCount={completedCount}
        />
      </div>
    </div>
  );
};

ExampleTestPage.displayName = "ExampleTestPage";

export default ExampleTestPage;
