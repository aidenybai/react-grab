import "react-grab";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Build an awesome React app", completed: false },
    { id: 2, text: "Test react-grab integration", completed: false },
    { id: 3, text: "Write some documentation", completed: true },
    { id: 4, text: "Deploy to production", completed: false },
    { id: 5, text: "Celebrate success 🎉", completed: false },
  ]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setTodos([
      ...todos,
      { id: Date.now(), text: newTodo, completed: false }
    ]);
    setNewTodo("");
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div style={{
      fontFamily: "ui-sans-serif, system-ui, -apple-system",
      maxWidth: "600px",
      margin: "0 auto",
      padding: "2rem"
    }}>
      <h1 style={{ marginBottom: "0.5rem" }}>react-grab kitchen sink</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        A simple todo list demo
      </p>

      <form onSubmit={addTodo} style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          style={{
            padding: "0.75rem",
            fontSize: "1rem",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "0.5rem"
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: !newTodo.trim() ? "#93c5fd" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: !newTodo.trim() ? "not-allowed" : "pointer",
            fontWeight: "500",
            opacity: !newTodo.trim() ? 0.6 : 1,
          }}
          disabled={!newTodo.trim()}
        >
          Add Todo
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map(todo => (
          <li
            key={todo.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              marginBottom: "0.5rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
            />
            <span style={{
              flex: 1,
              textDecoration: todo.completed ? "line-through" : "none",
              color: todo.completed ? "#9ca3af" : "#111827"
            }}>
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p style={{ textAlign: "center", color: "#9ca3af", marginTop: "2rem" }}>
          No todos yet. Add one above!
        </p>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

const root = createRoot(rootElement);
root.render(<App />);
