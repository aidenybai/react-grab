import type { Page, Route } from "@playwright/test";
import { test, expect } from "./fixtures.js";

const MOCK_SERVER_URL = "http://agent-log.test";
const MOCK_LOG_URL = `${MOCK_SERVER_URL}/logs/test-log-id`;
const STORAGE_KEY = "react-grab-agent-log";
const MOCK_TAIL_WAIT_MS = 300;

interface MockTaskState {
  status: string;
  note?: string;
}

interface MockAgentLogServer {
  appendedRecords: Array<{ headers: Record<string, string>; body: Record<string, unknown> }>;
  taskStates: Map<number, MockTaskState>;
  setPresence: (state: string) => void;
  createRequestCount: () => number;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const fulfillJson = (route: Route, payload: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  });

const mockAgentLogServer = async (page: Page): Promise<MockAgentLogServer> => {
  const server: MockAgentLogServer = {
    appendedRecords: [],
    taskStates: new Map(),
    setPresence: (state) => {
      presence = state;
    },
    createRequestCount: () => createRequests,
  };
  let presence = "none";
  let createRequests = 0;

  await page.route(`${MOCK_SERVER_URL}/**`, async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (pathname === "/logs" && request.method() === "POST") {
      createRequests += 1;
      return fulfillJson(route, { id: "test-log-id", url: MOCK_LOG_URL }, 201);
    }
    if (pathname.endsWith("/records") && request.method() === "POST") {
      const payload: { records: MockAgentLogServer["appendedRecords"] } = request.postDataJSON();
      server.appendedRecords.push(...payload.records);
      return fulfillJson(route, { start: { seq_num: 0 }, end: { seq_num: 1 } });
    }
    if (pathname.endsWith("/records") && request.method() === "GET") {
      await new Promise((resolve) => setTimeout(resolve, MOCK_TAIL_WAIT_MS));
      return fulfillJson(route, { records: [], tail: { seq_num: 0 } }).catch(() => {});
    }
    if (pathname.endsWith("/items")) {
      const items = server.appendedRecords.map((record, seqNum) => ({
        seq_num: seqNum,
        status: server.taskStates.get(seqNum)?.status ?? "todo",
        note: server.taskStates.get(seqNum)?.note,
        comment: record.body,
      }));
      return fulfillJson(route, {
        items,
        tail: { seq_num: items.length },
        agent: { state: presence, last_seen_at: null },
      });
    }
    return fulfillJson(route, { error: "Not found" }, 404);
  });

  return server;
};

const connectStoredLog = async (page: Page) => {
  await page.evaluate(({ storageKey, logUrl }) => localStorage.setItem(storageKey, logUrl), {
    storageKey: STORAGE_KEY,
    logUrl: MOCK_LOG_URL,
  });
  await page.reload();
};

test.describe("Agent log", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate((storageKey) => localStorage.removeItem(storageKey), STORAGE_KEY);
    await reactGrab.updateOptions({ agentLogServerUrl: MOCK_SERVER_URL });
  });

  test("connects from the toolbar menu and turns comments into agent todos", async ({
    reactGrab,
  }) => {
    const server = await mockAgentLogServer(reactGrab.page);
    const panel = reactGrab.page.locator("[data-react-grab-agent-panel]");

    await reactGrab.rightClickToolbarToggle();
    await expect.poll(() => reactGrab.getToolbarMenuItemLabels()).toContain("Connect agent");
    await reactGrab.clickToolbarMenuItem("connect-agent");

    await panel.locator("[data-react-grab-agent-panel-generate]").click();
    await expect(panel.locator("[data-react-grab-agent-panel-url]")).toHaveText(MOCK_LOG_URL);
    expect(server.createRequestCount()).toBe(1);
    await expect
      .poll(() =>
        reactGrab.page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY),
      )
      .toBe(MOCK_LOG_URL);

    await panel.locator("[data-react-grab-agent-panel-copy-prompt]").click();
    await expect(panel.locator("[data-react-grab-agent-panel-copy-prompt]")).toHaveText("Copied");
    const prompt = await reactGrab.getClipboardContent();
    expect(prompt).toContain(`${MOCK_LOG_URL}/next?wait=55`);
    expect(prompt).toContain(`${MOCK_LOG_URL}/items/<seq_num>/status`);

    await reactGrab.pressEscape();
    await expect(panel).toHaveCount(0);

    await reactGrab.enterPromptMode("li:first-child");
    await reactGrab.typeInInput("Make this item bold");
    await reactGrab.submitInput();

    await expect.poll(() => server.appendedRecords.length).toBe(1);
    expect(server.appendedRecords[0]).toMatchObject({
      headers: { type: "comment" },
      body: {
        comment: "Make this item bold",
        content: expect.stringContaining("Make this item bold"),
        page: { url: expect.stringContaining("localhost") },
        elements: [
          expect.objectContaining({
            componentName: expect.any(String),
            source: expect.objectContaining({ filePath: expect.stringContaining("App.tsx") }),
          }),
        ],
      },
    });
    await expect(reactGrab.page.getByText("Sent to agent")).toBeVisible();
    expect(await reactGrab.getClipboardContent()).toBe(prompt);

    const tray = reactGrab.page.locator("[data-react-grab-agent-tray]");
    await expect(tray.locator("[data-react-grab-agent-task]")).toHaveText("Make this item bold");
    await expect(tray.locator('[data-react-grab-agent-task-status="todo"]')).toHaveCount(1);
  });

  test("shows each todo moving to in progress and done with the agent's note", async ({
    reactGrab,
  }) => {
    const server = await mockAgentLogServer(reactGrab.page);
    server.appendedRecords.push(
      { headers: { type: "comment" }, body: { comment: "Bold the heading" } },
      { headers: { type: "comment" }, body: { comment: "Fix the spacing" } },
    );
    await connectStoredLog(reactGrab.page);
    const tray = reactGrab.page.locator("[data-react-grab-agent-tray]");
    const presence = tray.locator("[data-react-grab-agent-presence]");

    await expect(tray.locator("[data-react-grab-agent-task]")).toHaveCount(2);
    await expect(presence).toHaveAttribute("data-react-grab-agent-presence", "none");

    server.setPresence("listening");
    server.taskStates.set(0, { status: "in_progress" });
    const firstTask = tray.locator('[data-react-grab-agent-task="0"]');
    await expect(
      firstTask.locator('[data-react-grab-agent-task-status="in_progress"]'),
    ).toBeVisible();
    await expect(presence).toHaveAttribute("data-react-grab-agent-presence", "working");

    server.taskStates.set(0, { status: "done", note: "Bolded it in App.tsx" });
    server.taskStates.set(1, { status: "error", note: "No spacing tokens" });
    await expect(firstTask.locator('[data-react-grab-agent-task-status="done"]')).toBeVisible();
    await expect(firstTask).toContainText("Bolded it in App.tsx");
    await expect(
      tray.locator('[data-react-grab-agent-task="1"] [data-react-grab-agent-task-status="error"]'),
    ).toBeVisible();

    await expect(tray).toHaveCount(0, { timeout: 8000 });
  });

  test("still copies plain grabs while connected", async ({ reactGrab }) => {
    const server = await mockAgentLogServer(reactGrab.page);
    await connectStoredLog(reactGrab.page);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li:first-child");
    await reactGrab.clickElement("li:first-child");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("li");
    expect(server.appendedRecords).toHaveLength(0);
  });

  test("lists queued todos in the panel and disconnects", async ({ reactGrab }) => {
    const server = await mockAgentLogServer(reactGrab.page);
    server.appendedRecords.push({ headers: { type: "comment" }, body: { comment: "Queued one" } });
    server.taskStates.set(0, { status: "done", note: "Shipped" });
    await connectStoredLog(reactGrab.page);
    const panel = reactGrab.page.locator("[data-react-grab-agent-panel]");
    await expect.poll(() => reactGrab.isToolbarVisible()).toBe(true);

    await reactGrab.rightClickToolbarToggle();
    await expect.poll(() => reactGrab.getToolbarMenuItemLabels()).toContain("Agent connected");
    await reactGrab.clickToolbarMenuItem("connect-agent");

    const task = panel.locator('[data-react-grab-agent-task="0"]');
    await expect(task).toContainText("Queued one");
    await expect(task.locator('[data-react-grab-agent-task-status="done"]')).toBeVisible();

    await panel.locator("[data-react-grab-agent-panel-disconnect]").click();
    await expect(panel.locator("[data-react-grab-agent-panel-generate]")).toBeVisible();
    await expect
      .poll(() =>
        reactGrab.page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY),
      )
      .toBeNull();
  });

  test("shows an error when the server is unreachable", async ({ reactGrab }) => {
    await reactGrab.page.route(`${MOCK_SERVER_URL}/**`, (route) => route.abort());
    const panel = reactGrab.page.locator("[data-react-grab-agent-panel]");

    await reactGrab.rightClickToolbarToggle();
    await reactGrab.clickToolbarMenuItem("connect-agent");
    await panel.locator("[data-react-grab-agent-panel-generate]").click();

    await expect(panel.locator("[data-react-grab-agent-panel-error]")).toBeVisible();
    await expect(panel.locator("[data-react-grab-agent-panel-generate]")).toHaveText(
      "Generate link",
    );
  });
});
