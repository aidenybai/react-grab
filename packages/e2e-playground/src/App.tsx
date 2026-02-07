import { useState, useRef, useEffect } from "react";

interface Todo {
  id: number;
  title: string;
}

const TodoItem = ({ todo }: { todo: Todo }) => {
  return (
    <li>
      <span>{todo.title}</span>
    </li>
  );
};

const TodoList = () => {
  const todos: Todo[] = [
    { id: 1, title: "Buy groceries" },
    { id: 2, title: "Walk the dog" },
    { id: 3, title: "Read a book" },
    { id: 4, title: "Write code" },
    { id: 5, title: "Exercise" },
    { id: 6, title: "Call mom" },
    { id: 7, title: "Write tests" },
  ];

  return (
    <div className="p-4 border rounded-lg" data-testid="todo-list">
      <h1 className="text-xl font-bold mb-4">Todo List</h1>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
};

const NestedCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="border rounded-lg p-4 bg-gray-50" data-testid="nested-card">
      <h3 className="font-semibold mb-2" data-testid="card-title">
        {title}
      </h3>
      <div className="pl-4" data-testid="card-content">
        {children}
      </div>
    </div>
  );
};

const DeeplyNested = () => {
  return (
    <NestedCard title="Outer Card">
      <NestedCard title="Middle Card">
        <NestedCard title="Inner Card">
          <p data-testid="deeply-nested-text">This is deeply nested content</p>
          <button
            className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
            data-testid="nested-button"
          >
            Nested Button
          </button>
        </NestedCard>
      </NestedCard>
    </NestedCard>
  );
};

const FormSection = () => {
  const [inputValue, setInputValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");

  return (
    <section className="border rounded-lg p-4" data-testid="form-section">
      <h2 className="text-lg font-bold mb-4">Form Elements</h2>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="test-input"
            className="block text-sm font-medium mb-1"
          >
            Text Input
          </label>
          <input
            id="test-input"
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="Type something..."
            data-testid="test-input"
          />
        </div>
        <div>
          <label
            htmlFor="test-textarea"
            className="block text-sm font-medium mb-1"
          >
            Textarea
          </label>
          <textarea
            id="test-textarea"
            value={textareaValue}
            onChange={(event) => setTextareaValue(event.target.value)}
            className="border rounded px-3 py-2 w-full h-20"
            placeholder="Type a longer message..."
            data-testid="test-textarea"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="bg-green-500 text-white px-4 py-2 rounded"
            data-testid="submit-button"
          >
            Submit
          </button>
          <button
            type="button"
            className="bg-gray-500 text-white px-4 py-2 rounded"
            data-testid="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
};

const ScrollableSection = () => {
  const items = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    title: `Scrollable Item ${i + 1}`,
    description: `This is the description for item ${i + 1}. It contains some text to make it more realistic.`,
  }));

  return (
    <section className="border rounded-lg p-4" data-testid="scrollable-section">
      <h2 className="text-lg font-bold mb-4">Scrollable Content</h2>
      <div
        className="h-64 overflow-y-auto border rounded"
        data-testid="scroll-container"
      >
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="p-3 hover:bg-gray-50"
              data-testid={`scroll-item-${item.id}`}
            >
              <div className="font-medium">{item.title}</div>
              <div className="text-sm text-gray-500">{item.description}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const DynamicElements = () => {
  const [elements, setElements] = useState([
    { id: 1, text: "Dynamic Element 1" },
    { id: 2, text: "Dynamic Element 2" },
    { id: 3, text: "Dynamic Element 3" },
  ]);

  const removeElement = (id: number) => {
    setElements((prev) => prev.filter((element) => element.id !== id));
  };

  const addElement = () => {
    setElements((prev) => {
      const newId = Math.max(0, ...prev.map((element) => element.id)) + 1;
      return [...prev, { id: newId, text: `Dynamic Element ${newId}` }];
    });
  };

  return (
    <section className="border rounded-lg p-4" data-testid="dynamic-section">
      <h2 className="text-lg font-bold mb-4">Dynamic Elements</h2>
      <div className="space-y-2 mb-4">
        {elements.map((element) => (
          <div
            key={element.id}
            className="flex items-center justify-between p-2 bg-gray-100 rounded"
            data-testid={`dynamic-element-${element.id}`}
          >
            <span>{element.text}</span>
            <button
              onClick={() => removeElement(element.id)}
              className="text-red-500 hover:text-red-700 px-2"
              data-testid={`remove-element-${element.id}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addElement}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        data-testid="add-element-button"
      >
        Add Element
      </button>
    </section>
  );
};

const EdgeElements = () => {
  return (
    <>
      <div
        className="fixed top-0 left-0 bg-red-500 text-white px-2 py-1 text-xs z-50"
        data-testid="edge-top-left"
      >
        Top Left
      </div>
      <div
        className="fixed top-0 right-0 bg-green-500 text-white px-2 py-1 text-xs z-50"
        data-testid="edge-top-right"
      >
        Top Right
      </div>
      <div
        className="fixed bottom-0 left-0 bg-blue-500 text-white px-2 py-1 text-xs z-50"
        data-testid="edge-bottom-left"
      >
        Bottom Left
      </div>
      <div
        className="fixed bottom-0 right-0 bg-purple-500 text-white px-2 py-1 text-xs z-50"
        data-testid="edge-bottom-right"
      >
        Bottom Right
      </div>
    </>
  );
};

const VariousElements = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="various-section">
      <h2 className="text-lg font-bold mb-4">Various Element Types</h2>
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <span className="text-sm" data-testid="span-element">
            Span Element
          </span>
          <strong data-testid="strong-element">Strong Element</strong>
          <em data-testid="em-element">Emphasized</em>
          <code className="bg-gray-100 px-1 rounded" data-testid="code-element">
            code element
          </code>
        </div>

        <div className="flex gap-2">
          <a
            href="#"
            className="text-blue-500 underline"
            data-testid="link-element"
          >
            Link Element
          </a>
          <button
            className="border px-2 py-1 rounded"
            data-testid="plain-button"
          >
            Plain Button
          </button>
        </div>

        <table
          className="border-collapse border w-full"
          data-testid="table-element"
        >
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2" data-testid="th-1">
                Header 1
              </th>
              <th className="border p-2" data-testid="th-2">
                Header 2
              </th>
              <th className="border p-2" data-testid="th-3">
                Header 3
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2" data-testid="td-1-1">
                Cell 1-1
              </td>
              <td className="border p-2" data-testid="td-1-2">
                Cell 1-2
              </td>
              <td className="border p-2" data-testid="td-1-3">
                Cell 1-3
              </td>
            </tr>
            <tr>
              <td className="border p-2" data-testid="td-2-1">
                Cell 2-1
              </td>
              <td className="border p-2" data-testid="td-2-2">
                Cell 2-2
              </td>
              <td className="border p-2" data-testid="td-2-3">
                Cell 2-3
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex gap-2">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23ddd' width='50' height='50'/%3E%3C/svg%3E"
            alt="Placeholder"
            className="border"
            data-testid="img-element"
          />
          <div
            className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded"
            data-testid="gradient-div"
          />
        </div>

        <article
          className="p-3 bg-gray-50 rounded"
          data-testid="article-element"
        >
          <header data-testid="article-header">
            <h4 className="font-semibold">Article Title</h4>
          </header>
          <p className="text-sm text-gray-600" data-testid="article-content">
            Article content goes here. This is a semantic article element.
          </p>
          <footer
            className="text-xs text-gray-400 mt-2"
            data-testid="article-footer"
          >
            Article Footer
          </footer>
        </article>
      </div>
    </section>
  );
};

const AnimatedElements = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="animated-section">
      <h2 className="text-lg font-bold mb-4">Animated Elements</h2>
      <div className="space-y-4">
        <div
          className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"
          data-testid="animated-pulse"
        />
        <div
          className="w-8 h-8 bg-green-500 rounded animate-spin"
          data-testid="animated-spin"
        />
        <div
          className="w-8 h-8 bg-red-500 rounded animate-bounce"
          data-testid="animated-bounce"
        />
      </div>
    </section>
  );
};

const ZeroDimensionElements = () => {
  return (
    <section
      className="border rounded-lg p-4"
      data-testid="zero-dimension-section"
    >
      <h2 className="text-lg font-bold mb-4">Edge Case Elements</h2>
      <div className="space-y-2">
        <div className="w-0 h-0" data-testid="zero-size-element" />
        <div className="invisible" data-testid="invisible-element">
          Invisible Element
        </div>
        <div className="opacity-0" data-testid="transparent-element">
          Transparent Element
        </div>
        <div className="overflow-hidden w-20">
          <span className="whitespace-nowrap" data-testid="overflow-element">
            This text is very long and will overflow its container
          </span>
        </div>
      </div>
    </section>
  );
};

const DropdownSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("pointerdown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <section className="border rounded-lg p-4" data-testid="dropdown-section">
      <h2 className="text-lg font-bold mb-4">Dropdown Test</h2>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          data-testid="dropdown-trigger"
        >
          {isOpen ? "Close Dropdown" : "Open Dropdown"}
        </button>
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50"
            data-testid="dropdown-menu"
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              data-testid="dropdown-item-1"
            >
              Option 1
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              data-testid="dropdown-item-2"
            >
              Option 2
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              data-testid="dropdown-item-3"
            >
              Option 3
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const HiddenToggleSection = () => {
  const [isVisible, setIsVisible] = useState(true);
  const elementRef = useRef<HTMLDivElement>(null);

  return (
    <section
      className="border rounded-lg p-4"
      data-testid="hidden-toggle-section"
    >
      <h2 className="text-lg font-bold mb-4">Visibility Toggle</h2>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-500 text-white px-4 py-2 rounded mb-4"
        data-testid="toggle-visibility-button"
      >
        {isVisible ? "Hide Element" : "Show Element"}
      </button>
      {isVisible && (
        <div
          ref={elementRef}
          className="p-4 bg-yellow-100 rounded"
          data-testid="toggleable-element"
        >
          This element can be hidden
        </div>
      )}
    </section>
  );
};

export default function App() {
  return (
    <div className="min-h-[200vh] p-12 flex flex-col gap-8 pb-32">
      <EdgeElements />

      <header className="mb-4">
        <h1 className="text-2xl font-bold" data-testid="main-title">
          React Grab E2E Test Page
        </h1>
        <p className="text-gray-600" data-testid="main-description">
          Comprehensive test page for E2E testing
        </p>
      </header>

      <TodoList />

      <DeeplyNested />

      <FormSection />

      <ScrollableSection />

      <DynamicElements />

      <VariousElements />

      <AnimatedElements />

      <ZeroDimensionElements />

      <DropdownSection />

      <HiddenToggleSection />

      <div
        className="h-96 flex items-center justify-center bg-gray-100 rounded-lg"
        data-testid="spacer-section"
      >
        <p className="text-gray-400">Spacer for scroll testing</p>
      </div>

      <footer
        className="text-center text-gray-400 text-sm"
        data-testid="footer"
      >
        End of test page
      </footer>
    </div>
  );
}
