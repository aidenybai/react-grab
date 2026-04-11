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

const NestedCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
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
          <label htmlFor="test-input" className="block text-sm font-medium mb-1">
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
          <label htmlFor="test-textarea" className="block text-sm font-medium mb-1">
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
      <div className="h-64 overflow-y-auto border rounded" data-testid="scroll-container">
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
          <a href="#" className="text-blue-500 underline" data-testid="link-element">
            Link Element
          </a>
          <button className="border px-2 py-1 rounded" data-testid="plain-button">
            Plain Button
          </button>
        </div>

        <table className="border-collapse border w-full" data-testid="table-element">
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

        <article className="p-3 bg-gray-50 rounded" data-testid="article-element">
          <header data-testid="article-header">
            <h4 className="font-semibold">Article Title</h4>
          </header>
          <p className="text-sm text-gray-600" data-testid="article-content">
            Article content goes here. This is a semantic article element.
          </p>
          <footer className="text-xs text-gray-400 mt-2" data-testid="article-footer">
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
        <div className="w-8 h-8 bg-green-500 rounded animate-spin" data-testid="animated-spin" />
        <div className="w-8 h-8 bg-red-500 rounded animate-bounce" data-testid="animated-bounce" />
      </div>
    </section>
  );
};

const ZeroDimensionElements = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="zero-dimension-section">
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

const ModalDialogSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [dismissReason, setDismissReason] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setDismissCount((previous) => previous + 1);
        setDismissReason("pointerdown outside (capture)");
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [isOpen]);

  return (
    <section className="border rounded-lg p-4" data-testid="modal-dialog-section">
      <h2 className="text-lg font-bold mb-4">Modal Dialog (pointerdown dismiss)</h2>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-500 text-white px-4 py-2 rounded"
        data-testid="modal-trigger"
      >
        Open Modal
      </button>
      <div className="mt-2 text-sm text-gray-600" data-testid="dismiss-info">
        Dismiss count: {dismissCount}
        {dismissReason && ` (last: ${dismissReason})`}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" data-testid="modal-backdrop" />
          <div
            ref={dialogRef}
            className="relative bg-white rounded-lg shadow-xl p-6 w-96 z-10"
            data-testid="modal-content"
          >
            <h3 className="text-lg font-bold mb-2">Modal Title</h3>
            <p className="mb-4">
              Click inside here while React Grab is active. The modal should NOT close.
            </p>
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              data-testid="modal-inner-button"
            >
              Button Inside Modal
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 bg-gray-300 px-3 py-1 rounded"
              data-testid="modal-close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

const PointerUpModalSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pointerDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownTargetRef.current = event.composedPath?.()[0] ?? event.target;
    };

    const handlePointerUp = () => {
      const downTarget = pointerDownTargetRef.current;
      pointerDownTargetRef.current = null;
      if (!downTarget) return;

      if (dialogRef.current && !dialogRef.current.contains(downTarget as Node)) {
        setDismissCount((previous) => previous + 1);
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    window.addEventListener("pointerup", handlePointerUp, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      window.removeEventListener("pointerup", handlePointerUp, {
        capture: true,
      });
    };
  }, [isOpen]);

  return (
    <section className="border rounded-lg p-4" data-testid="pointerup-modal-section">
      <h2 className="text-lg font-bold mb-4">
        Modal Dialog (pointerdown+pointerup dismiss, Headless UI style)
      </h2>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-teal-500 text-white px-4 py-2 rounded"
        data-testid="pointerup-modal-trigger"
      >
        Open Modal
      </button>
      <div className="mt-2 text-sm text-gray-600" data-testid="pointerup-dismiss-info">
        Dismiss count: {dismissCount}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" />
          <div
            ref={dialogRef}
            className="relative bg-white rounded-lg shadow-xl p-6 w-96 z-10"
            data-testid="pointerup-modal-content"
          >
            <h3 className="text-lg font-bold mb-2">Headless UI Style Modal</h3>
            <p className="mb-4">Uses pointerdown+pointerup pair for outside detection.</p>
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              data-testid="pointerup-modal-inner-button"
            >
              Button Inside Modal
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 bg-gray-300 px-3 py-1 rounded"
              data-testid="pointerup-modal-close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

const OverflowClippingSection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="overflow-clipping-section">
      <h2 className="text-lg font-bold mb-4">Overflow Clipping</h2>
      <div className="space-y-4">
        <div
          className="overflow-hidden w-40 h-20 border-2 border-red-400 relative"
          data-testid="overflow-hidden-container"
        >
          <div className="absolute w-80 h-10 bg-blue-200 p-2" data-testid="overflow-clipped-wide">
            Wide clipped content
          </div>
          <div className="p-2 bg-green-200" data-testid="overflow-visible-child">
            Visible child
          </div>
        </div>

        <div
          className="overflow-auto w-40 h-24 border-2 border-orange-400"
          data-testid="overflow-auto-container"
        >
          <div className="w-80 h-40 bg-yellow-100 p-2">
            <span data-testid="overflow-auto-inner">Scrollable inner content</span>
          </div>
        </div>

        <div
          className="overflow-hidden border-2 border-purple-400"
          style={{ width: "200px", height: "40px" }}
          data-testid="overflow-nested-outer"
        >
          <div
            className="overflow-hidden border border-purple-200"
            style={{ width: "150px", height: "30px" }}
            data-testid="overflow-nested-inner"
          >
            <div
              className="bg-purple-100 p-1"
              style={{ width: "300px", height: "60px" }}
              data-testid="overflow-nested-content"
            >
              Nested clipped content
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContainPaintSection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="contain-paint-section">
      <h2 className="text-lg font-bold mb-4">CSS Containment</h2>
      <div className="space-y-4">
        <div
          style={{ contain: "paint", width: "150px", height: "40px" }}
          className="border-2 border-teal-400 relative"
          data-testid="contain-paint-container"
        >
          <div
            className="absolute bg-teal-200 p-2"
            style={{ width: "300px", height: "30px" }}
            data-testid="contain-paint-clipped"
          >
            Paint-contained clipped
          </div>
        </div>

        <div
          style={{ contain: "strict", width: "150px", height: "40px" }}
          className="border-2 border-cyan-400 relative"
          data-testid="contain-strict-container"
        >
          <div className="bg-cyan-200 p-2" data-testid="contain-strict-child">
            Strict contained
          </div>
        </div>

        <div
          style={{ contain: "content", width: "150px", height: "40px" }}
          className="border-2 border-sky-400 relative"
          data-testid="contain-content-container"
        >
          <div className="bg-sky-200 p-2" data-testid="contain-content-child">
            Content contained
          </div>
        </div>
      </div>
    </section>
  );
};

const StackingOrderSection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="stacking-order-section">
      <h2 className="text-lg font-bold mb-4">Stacking Order</h2>
      <div className="relative" style={{ height: "120px" }}>
        <div
          className="absolute bg-red-300 p-4"
          style={{ top: "0", left: "0", width: "200px", height: "100px", zIndex: 1 }}
          data-testid="stacking-bottom"
        >
          Bottom (z-index: 1)
        </div>
        <div
          className="absolute bg-green-300 p-4"
          style={{ top: "20px", left: "20px", width: "200px", height: "100px", zIndex: 2 }}
          data-testid="stacking-middle"
        >
          Middle (z-index: 2)
        </div>
        <div
          className="absolute bg-blue-300 p-4"
          style={{ top: "40px", left: "40px", width: "200px", height: "100px", zIndex: 3 }}
          data-testid="stacking-top"
        >
          Top (z-index: 3)
        </div>
      </div>

      <div className="relative mt-8" style={{ height: "80px" }}>
        <div
          className="absolute bg-amber-200 p-4"
          style={{ top: "0", left: "0", width: "250px", height: "60px" }}
          data-testid="stacking-large-behind"
        >
          Large element behind
        </div>
        <div
          className="absolute bg-amber-500 text-white p-2"
          style={{ top: "10px", left: "10px", width: "100px", height: "40px", zIndex: 1 }}
          data-testid="stacking-small-front"
        >
          Small in front
        </div>
      </div>
    </section>
  );
};

const DecorativeOverlaySection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="decorative-overlay-section">
      <h2 className="text-lg font-bold mb-4">Decorative Overlays</h2>
      <div className="relative" style={{ height: "80px" }}>
        <div className="bg-indigo-200 p-4" data-testid="decorative-content">
          This content should be selectable
        </div>
        <div
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
          data-testid="decorative-empty-overlay"
        />
      </div>

      <div className="relative mt-4" style={{ height: "80px" }}>
        <p className="bg-pink-200 p-4" data-testid="decorative-text-content">
          Text content under a positioned empty div
        </p>
        <div
          className="absolute"
          style={{ top: "0", left: "0", width: "100%", height: "100%" }}
          data-testid="decorative-positioned-empty"
        />
      </div>
    </section>
  );
};

const InlineElementsSection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="inline-elements-section">
      <h2 className="text-lg font-bold mb-4">Inline Elements</h2>
      <p className="mb-2" data-testid="inline-paragraph">
        This paragraph has <span data-testid="inline-span">an inline span</span> and{" "}
        <a href="#" data-testid="inline-link" className="text-blue-500 underline">
          an inline link
        </a>{" "}
        and <em data-testid="inline-em">emphasized text</em> and{" "}
        <strong data-testid="inline-strong">strong text</strong> inside it.
      </p>
      <p className="mb-2">
        <code className="bg-gray-100 px-1" data-testid="inline-code">
          inline code element
        </code>
      </p>
    </section>
  );
};

const TransformStackingSection = () => {
  return (
    <section className="border rounded-lg p-4" data-testid="transform-stacking-section">
      <h2 className="text-lg font-bold mb-4">Transform & Opacity Stacking</h2>
      <div className="space-y-4">
        <div
          className="bg-rose-200 p-4"
          style={{ transform: "translateZ(0)" }}
          data-testid="transform-element"
        >
          Transformed element (creates stacking context)
        </div>

        <div className="bg-violet-200 p-4" style={{ opacity: 0.99 }} data-testid="opacity-element">
          Opacity element (creates stacking context)
        </div>

        <div className="relative" style={{ height: "80px" }}>
          <div
            className="absolute bg-lime-200 p-4"
            style={{ top: "0", left: "0", width: "200px", height: "60px" }}
            data-testid="transform-behind"
          >
            Behind
          </div>
          <div
            className="absolute bg-lime-500 text-white p-2"
            style={{
              top: "10px",
              left: "10px",
              width: "120px",
              height: "40px",
              transform: "scale(1)",
              zIndex: 1,
            }}
            data-testid="transform-front"
          >
            Front (transform)
          </div>
        </div>
      </div>
    </section>
  );
};

const HiddenToggleSection = () => {
  const [isVisible, setIsVisible] = useState(true);
  const elementRef = useRef<HTMLDivElement>(null);

  return (
    <section className="border rounded-lg p-4" data-testid="hidden-toggle-section">
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

      <ModalDialogSection />

      <PointerUpModalSection />

      <OverflowClippingSection />

      <ContainPaintSection />

      <StackingOrderSection />

      <DecorativeOverlaySection />

      <InlineElementsSection />

      <TransformStackingSection />

      <HiddenToggleSection />

      <div
        className="h-96 flex items-center justify-center bg-gray-100 rounded-lg"
        data-testid="spacer-section"
      >
        <p className="text-gray-400">Spacer for scroll testing</p>
      </div>

      <footer className="text-center text-gray-400 text-sm" data-testid="footer">
        End of test page
      </footer>
    </div>
  );
}
