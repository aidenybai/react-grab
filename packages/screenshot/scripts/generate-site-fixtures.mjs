import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "e2e", "fixtures");
mkdirSync(fixturesDir, { recursive: true });

const range = (count) => Array.from({ length: count }, (_, index) => index);

const themes = {
  light: {
    name: "light",
    isDark: false,
    bg: "#f6f8fa",
    surface: "#ffffff",
    surfaceAlt: "#eef1f4",
    border: "#d0d7de",
    text: "#1f2328",
    textSoft: "#57606a",
    accent: "#0969da",
    accentText: "#ffffff",
    good: "#1a7f37",
    warn: "#9a6700",
    bad: "#cf222e",
    chipBg: "#ddf4ff",
    chipText: "#0969da",
  },
  dark: {
    name: "dark",
    isDark: true,
    bg: "#0d1117",
    surface: "#161b22",
    surfaceAlt: "#21262d",
    border: "#30363d",
    text: "#e6edf3",
    textSoft: "#8d96a0",
    accent: "#2f81f7",
    accentText: "#0d1117",
    good: "#3fb950",
    warn: "#d29922",
    bad: "#f85149",
    chipBg: "#121d2f",
    chipText: "#58a6ff",
  },
  sepia: {
    name: "sepia",
    isDark: false,
    bg: "#f4ecd8",
    surface: "#fbf5e6",
    surfaceAlt: "#ece1c8",
    border: "#d8c9a3",
    text: "#3d3021",
    textSoft: "#7a6a4f",
    accent: "#8a5a1e",
    accentText: "#fbf5e6",
    good: "#4d7031",
    warn: "#9a6700",
    bad: "#a83232",
    chipBg: "#ecdbb4",
    chipText: "#8a5a1e",
  },
  midnight: {
    name: "midnight",
    isDark: true,
    bg: "#0a0e1a",
    surface: "#111726",
    surfaceAlt: "#1a2236",
    border: "#273049",
    text: "#dbe2f4",
    textSoft: "#8591ad",
    accent: "#7c8cf8",
    accentText: "#0a0e1a",
    good: "#4ade80",
    warn: "#facc15",
    bad: "#f87171",
    chipBg: "#1c2440",
    chipText: "#a5b4fc",
  },
  ocean: {
    name: "ocean",
    isDark: false,
    bg: "#eef6f9",
    surface: "#ffffff",
    surfaceAlt: "#dcedf3",
    border: "#b8d8e3",
    text: "#0f3345",
    textSoft: "#4e7484",
    accent: "#0e7490",
    accentText: "#ffffff",
    good: "#0f766e",
    warn: "#b45309",
    bad: "#be123c",
    chipBg: "#cffafe",
    chipText: "#0e7490",
  },
  forest: {
    name: "forest",
    isDark: true,
    bg: "#101a12",
    surface: "#16241a",
    surfaceAlt: "#1e3123",
    border: "#2d4a35",
    text: "#dcefe0",
    textSoft: "#8dab94",
    accent: "#4ade80",
    accentText: "#101a12",
    good: "#86efac",
    warn: "#fbbf24",
    bad: "#fb7185",
    chipBg: "#173626",
    chipText: "#6ee7a0",
  },
  rose: {
    name: "rose",
    isDark: false,
    bg: "#fdf2f5",
    surface: "#ffffff",
    surfaceAlt: "#fbe4ec",
    border: "#f3c6d6",
    text: "#4c1226",
    textSoft: "#96566e",
    accent: "#be1856",
    accentText: "#ffffff",
    good: "#15803d",
    warn: "#a16207",
    bad: "#b91c1c",
    chipBg: "#fcd8e4",
    chipText: "#be1856",
  },
  violet: {
    name: "violet",
    isDark: true,
    bg: "#16111f",
    surface: "#1e1729",
    surfaceAlt: "#2a2038",
    border: "#3d2f52",
    text: "#e9e2f7",
    textSoft: "#a294bd",
    accent: "#a78bfa",
    accentText: "#16111f",
    good: "#34d399",
    warn: "#fbbf24",
    bad: "#fb7185",
    chipBg: "#2b2145",
    chipText: "#c4b5fd",
  },
  amber: {
    name: "amber",
    isDark: false,
    bg: "#fffbeb",
    surface: "#ffffff",
    surfaceAlt: "#fdf0c8",
    border: "#f2dd9a",
    text: "#432c07",
    textSoft: "#8a6d31",
    accent: "#b45309",
    accentText: "#ffffff",
    good: "#3f6212",
    warn: "#92400e",
    bad: "#b91c1c",
    chipBg: "#fde9a8",
    chipText: "#92400e",
  },
  slate: {
    name: "slate",
    isDark: true,
    bg: "#1b2230",
    surface: "#232c3d",
    surfaceAlt: "#2c374c",
    border: "#3c4a63",
    text: "#e2e8f0",
    textSoft: "#94a3b8",
    accent: "#38bdf8",
    accentText: "#1b2230",
    good: "#34d399",
    warn: "#fbbf24",
    bad: "#f87171",
    chipBg: "#243b53",
    chipText: "#7dd3fc",
  },
};

const fontFace = `
      @font-face {
        font-family: "Inter Fixture";
        src: url("./assets/inter-latin-400-normal.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "Inter Fixture";
        src: url("./assets/inter-latin-700-normal.woff2") format("woff2");
        font-weight: 700;
        font-style: normal;
      }`;

const avatarPalette = [
  "#d23b2e",
  "#2f6fdb",
  "#14a06c",
  "#7a3b8f",
  "#b8860b",
  "#0f766e",
  "#be185d",
  "#4338ca",
];
const avatar = (index, sizePx, radius = "50%") =>
  `<span style="display:inline-block;width:${sizePx}px;height:${sizePx}px;border-radius:${radius};background:linear-gradient(135deg,${avatarPalette[index % 8]},${avatarPalette[(index + 3) % 8]});flex:none;"></span>`;

const page = (title, theme, widthPx, heightPx, css, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${fontFace}
      * { box-sizing: border-box; }
      body { margin: 0; background: #888888; }
      #target {
        width: ${widthPx}px;
        height: ${heightPx}px;
        background: ${theme.bg};
        color: ${theme.text};
        font-family: "Inter Fixture", sans-serif;
        overflow: hidden;
        position: relative;
      }
${css}
    </style>
  </head>
  <body>
    <div id="target">
${body}
    </div>
  </body>
</html>
`;

const archetypes = {};

archetypes["github-repo"] = (t) => {
  const files = [
    ["src", "refactor capture pipeline", "2 days ago", true],
    ["e2e", "add fixture manifest", "5 days ago", true],
    ["docs", "architecture notes", "last week", true],
    ["package.json", "bump version", "3 hours ago", false],
    ["README.md", "update benchmarks", "yesterday", false],
    ["vite.config.ts", "enable minify", "2 weeks ago", false],
    ["tsconfig.json", "strict mode", "last month", false],
  ];
  const rows = files
    .map(
      ([name, msg, when, isDir]) => `
      <div class="file-row">
        <span class="file-icon ${isDir ? "dir" : ""}"></span>
        <span class="file-name">${name}</span>
        <span class="file-msg">${msg}</span>
        <span class="file-when">${when}</span>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1000,
    heightPx: 700,
    css: `
      .repo-head { padding: 20px 28px 0; }
      .repo-title { display: flex; align-items: center; gap: 8px; font-size: 20px; }
      .repo-title b { color: ${t.accent}; }
      .repo-badge { font-size: 12px; color: ${t.textSoft}; border: 1px solid ${t.border}; border-radius: 999px; padding: 1px 8px; }
      .repo-stats { display: flex; gap: 8px; margin: 14px 0; }
      .repo-stats span { font-size: 12px; border: 1px solid ${t.border}; background: ${t.surface}; border-radius: 6px; padding: 4px 10px; }
      .repo-tabs { display: flex; gap: 20px; border-bottom: 1px solid ${t.border}; padding: 0 28px; font-size: 14px; }
      .repo-tabs span { padding: 10px 4px; color: ${t.textSoft}; }
      .repo-tabs .active { color: ${t.text}; border-bottom: 2px solid #fd8c73; font-weight: 700; }
      .repo-main { padding: 20px 28px; }
      .branch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .branch-btn { font-size: 13px; font-weight: 700; background: ${t.surfaceAlt}; border: 1px solid ${t.border}; border-radius: 6px; padding: 6px 12px; }
      .clone-btn { margin-left: auto; font-size: 13px; font-weight: 700; color: ${t.accentText}; background: ${t.good}; border-radius: 6px; padding: 7px 14px; }
      .file-table { border: 1px solid ${t.border}; border-radius: 6px; overflow: hidden; background: ${t.surface}; }
      .commit-row { display: flex; align-items: center; gap: 10px; background: ${t.surfaceAlt}; padding: 10px 14px; font-size: 13px; }
      .commit-row .sha { margin-left: auto; font-family: monospace; color: ${t.textSoft}; }
      .file-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid ${t.border}; font-size: 13px; }
      .file-icon { width: 14px; height: 12px; background: ${t.textSoft}; opacity: 0.55; clip-path: polygon(0 15%, 40% 15%, 50% 0, 100% 0, 100% 100%, 0 100%); }
      .file-icon.dir { background: ${t.accent}; opacity: 1; }
      .file-name { color: ${t.text}; width: 150px; }
      .file-msg { color: ${t.textSoft}; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .file-when { color: ${t.textSoft}; font-size: 12px; }
      .readme { margin-top: 18px; border: 1px solid ${t.border}; border-radius: 6px; background: ${t.surface}; padding: 18px 22px; }
      .readme h2 { margin: 0 0 8px; font-size: 20px; border-bottom: 1px solid ${t.border}; padding-bottom: 8px; }
      .readme p { font-size: 14px; line-height: 1.6; color: ${t.textSoft}; margin: 8px 0; }
      .readme code { background: ${t.surfaceAlt}; border-radius: 4px; padding: 1px 6px; font-size: 12px; font-family: monospace; }`,
    body: `
      <div class="repo-head">
        <div class="repo-title">${avatar(1, 22, "6px")} aidenybai / <b>fast-html-to-image</b> <span class="repo-badge">Public</span></div>
        <div class="repo-stats"><span>Watch 42</span><span>Fork 310</span><span>Star 18.4k</span></div>
      </div>
      <div class="repo-tabs"><span class="active">Code</span><span>Issues 51</span><span>Pull requests 12</span><span>Actions</span><span>Wiki</span><span>Settings</span></div>
      <div class="repo-main">
        <div class="branch-bar"><span class="branch-btn">main</span><span style="font-size:13px;color:${t.textSoft};">28 branches · 104 tags</span><span class="clone-btn">Code</span></div>
        <div class="file-table">
          <div class="commit-row">${avatar(4, 20)}<b>aiden</b> perf: minimal-escape svg data urls <span class="sha">84953a6 · 2,341 commits</span></div>
          ${rows}
        </div>
        <div class="readme">
          <h2>fast-html-to-image</h2>
          <p>Screenshot any DOM node, in the browser, with high fidelity. Give it an element and get back a pixel-accurate PNG of exactly what the user sees.</p>
          <p>Install with <code>npm install fast-html-to-image</code> and capture via <code>captureNode(element)</code>. Zero runtime dependencies.</p>
        </div>
      </div>`,
  };
};

archetypes["social-feed"] = (t) => {
  const posts = [
    [
      "Sara Chen",
      "@sara_builds",
      "Shipped a 6x faster DOM screenshot library today. Computed-style memoization is criminally underrated.",
      "284",
      "1.2K",
      "98",
    ],
    [
      "Dev Patel",
      "@devpatel",
      "hot take: most perf problems are just getComputedStyle in a loop",
      "97",
      "410",
      "23",
    ],
    [
      "Mia Torres",
      "@miatorres",
      "Reading the WHATWG spec on foreignObject taint rules so you do not have to. Thread below.",
      "51",
      "220",
      "40",
    ],
    ["Ken Adams", "@kenadams", "benchmarks or it did not happen", "12", "88", "5"],
  ];
  const cards = posts
    .map(
      ([name, handle, text, replies, likes, reposts], index) => `
      <div class="post">
        ${avatar(index, 40)}
        <div class="post-body">
          <div class="post-head"><b>${name}</b> <span>${handle} · ${index + 1}h</span></div>
          <p>${text}</p>
          <div class="post-actions"><span>💬 ${replies}</span><span>🔁 ${reposts}</span><span>❤️ ${likes}</span><span>📊 ${Number(likes.replace(/[^0-9.]/g, "")) * 7}K</span></div>
        </div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 620,
    heightPx: 700,
    css: `
      #target { border-left: 1px solid ${t.border}; border-right: 1px solid ${t.border}; }
      .feed-head { position: sticky; top: 0; padding: 14px 18px; font-weight: 700; font-size: 18px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .composer { display: flex; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .composer-input { flex: 1; font-size: 17px; color: ${t.textSoft}; padding-top: 8px; }
      .composer-post { align-self: flex-start; background: ${t.accent}; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 999px; padding: 8px 18px; }
      .post { display: flex; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .post-body { flex: 1; min-width: 0; }
      .post-head { font-size: 14px; }
      .post-head span { color: ${t.textSoft}; font-weight: 400; }
      .post-body p { margin: 4px 0 10px; font-size: 15px; line-height: 1.4; }
      .post-actions { display: flex; justify-content: space-between; max-width: 360px; color: ${t.textSoft}; font-size: 12px; }`,
    body: `
      <div class="feed-head">Home</div>
      <div class="composer">${avatar(6, 40)}<div class="composer-input">What is happening?!</div><div class="composer-post">Post</div></div>
      ${cards}`,
  };
};

archetypes["video-grid"] = (t) => {
  const videos = [
    [
      "Building a browser screenshot engine from scratch",
      "CodeStream",
      "812K views · 3 weeks ago",
      "24:31",
    ],
    [
      "Why your web app is slow (and how to fix it)",
      "PerfLab",
      "1.4M views · 2 months ago",
      "18:02",
    ],
    ["CSS grid tricks nobody told you about", "LayoutLand", "302K views · 6 days ago", "12:44"],
    ["I benchmarked every DOM-to-image library", "BenchBoy", "97K views · 1 day ago", "31:09"],
    ["Rust vs Zig vs C: systems showdown", "LowLevelLuke", "2.1M views · 5 months ago", "42:17"],
    ["The dark art of font subsetting", "TypeNerd", "56K views · 2 weeks ago", "9:58"],
  ];
  const cards = videos
    .map(
      ([title, channel, meta, duration], index) => `
      <div class="video-card">
        <div class="thumb thumb-${index}"><span class="duration">${duration}</span></div>
        <div class="video-meta">${avatar(index + 2, 36)}
          <div><div class="video-title">${title}</div><div class="video-sub">${channel}</div><div class="video-sub">${meta}</div></div>
        </div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1080,
    heightPx: 700,
    css: `
      .vg-head { display: flex; align-items: center; gap: 18px; padding: 12px 24px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .vg-logo { font-weight: 700; font-size: 20px; letter-spacing: -1px; }
      .vg-logo b { color: #ff0033; }
      .vg-search { flex: 1; max-width: 480px; border: 1px solid ${t.border}; border-radius: 999px; padding: 8px 16px; font-size: 14px; color: ${t.textSoft}; background: ${t.bg}; }
      .vg-chips { display: flex; gap: 10px; padding: 12px 24px; }
      .vg-chips span { font-size: 13px; background: ${t.surfaceAlt}; border-radius: 8px; padding: 6px 12px; }
      .vg-chips span:first-child { background: ${t.text}; color: ${t.bg}; }
      .vg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 8px 24px; }
      .thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; }
      .thumb-0 { background: linear-gradient(120deg, #1c2a4a, #b83280); }
      .thumb-1 { background: url("./assets/photo-landscape.png") center / cover; }
      .thumb-2 { background: repeating-linear-gradient(45deg, #0f766e 0 28px, #134e4a 28px 56px); }
      .thumb-3 { background: linear-gradient(200deg, #7c2d12, #fbbf24); }
      .thumb-4 { background: url("./assets/pattern-tile.png"); }
      .thumb-5 { background: radial-gradient(circle at 30% 30%, #4338ca, #0b0f2a); }
      .duration { position: absolute; right: 6px; bottom: 6px; background: rgba(0, 0, 0, 0.85); color: #ffffff; font-size: 11px; border-radius: 4px; padding: 2px 5px; }
      .video-meta { display: flex; gap: 10px; padding: 10px 2px; }
      .video-title { font-size: 14px; font-weight: 700; line-height: 1.3; }
      .video-sub { font-size: 12px; color: ${t.textSoft}; margin-top: 2px; }`,
    body: `
      <div class="vg-head"><span class="vg-logo"><b>▶</b> MeTube</span><div class="vg-search">Search</div>${avatar(0, 32)}</div>
      <div class="vg-chips"><span>All</span><span>JavaScript</span><span>Live</span><span>Rust</span><span>Music</span><span>Podcasts</span></div>
      <div class="vg-grid">${cards}</div>`,
  };
};

archetypes["product-page"] = (t) => ({
  widthPx: 1040,
  heightPx: 700,
  css: `
    .pp-wrap { display: grid; grid-template-columns: 440px 1fr 260px; gap: 26px; padding: 26px; }
    .pp-gallery { display: flex; flex-direction: column; gap: 10px; }
    .pp-hero { height: 360px; border-radius: 8px; background: url("./assets/photo-portrait.png") center / cover; border: 1px solid ${t.border}; }
    .pp-thumbs { display: flex; gap: 8px; }
    .pp-thumbs span { width: 56px; height: 56px; border-radius: 6px; border: 1px solid ${t.border}; }
    .pp-title { font-size: 22px; line-height: 1.3; margin: 0 0 6px; }
    .pp-rating { color: #de7921; font-size: 14px; margin-bottom: 10px; }
    .pp-rating span { color: ${t.accent}; }
    .pp-price { font-size: 26px; }
    .pp-price sup { font-size: 13px; }
    .pp-bullets { padding-left: 18px; font-size: 13px; line-height: 1.7; color: ${t.text}; }
    .pp-buy { border: 1px solid ${t.border}; border-radius: 10px; padding: 18px; background: ${t.surface}; font-size: 13px; }
    .pp-buy .price { font-size: 22px; margin-bottom: 6px; }
    .pp-buy .ship { color: ${t.textSoft}; margin-bottom: 4px; }
    .pp-buy .stock { color: ${t.good}; font-size: 16px; margin: 8px 0; }
    .btn { display: block; text-align: center; border-radius: 999px; padding: 9px 0; font-size: 13px; margin-top: 8px; }
    .btn.cart { background: #ffd814; color: #111111; }
    .btn.buy { background: #fa8900; color: #111111; }`,
  body: `
    <div class="pp-wrap">
      <div class="pp-gallery"><div class="pp-hero"></div><div class="pp-thumbs">${range(6)
        .map(
          (index) =>
            `<span style="background:linear-gradient(135deg,${avatarPalette[index]},${avatarPalette[(index + 2) % 8]});"></span>`,
        )
        .join("")}</div></div>
      <div>
        <h1 class="pp-title">Mechanical Keyboard Pro X — Hot-swappable, RGB, 87-key TKL Layout with PBT Keycaps</h1>
        <div class="pp-rating">★★★★☆ <span>12,408 ratings</span> | <span>1K+ bought in past month</span></div>
        <hr style="border:none;border-top:1px solid ${t.border};" />
        <div class="pp-price"><sup>$</sup>149<sup>99</sup> <span style="font-size:13px;color:${t.textSoft};">List: <s>$199.99</s></span></div>
        <ul class="pp-bullets">
          <li>Gasket-mounted plate with silicone dampening for a softer typing feel</li>
          <li>Tri-mode connectivity: 2.4GHz wireless, Bluetooth 5.1, USB-C wired</li>
          <li>Full N-key rollover with 1000Hz polling in wired mode</li>
          <li>South-facing RGB LEDs compatible with shine-through keycaps</li>
          <li>4000mAh battery: up to 200 hours with backlight off</li>
        </ul>
      </div>
      <div class="pp-buy">
        <div class="price">$149.99</div>
        <div class="ship">FREE delivery <b>Tuesday, July 8</b></div>
        <div class="ship">Or fastest delivery <b>Tomorrow, 8am</b></div>
        <div class="stock">In Stock</div>
        <div class="btn cart">Add to Cart</div>
        <div class="btn buy">Buy Now</div>
        <div style="margin-top:10px;color:${t.textSoft};">Ships from BuyBig.com<br />Sold by KeebWorld</div>
      </div>
    </div>`,
});

archetypes["pricing-tiers"] = (t) => {
  const tiers = [
    [
      "Hobby",
      "$0",
      "For side projects",
      ["1 project", "10K captures/mo", "Community support"],
      false,
    ],
    [
      "Pro",
      "$29",
      "For growing teams",
      ["Unlimited projects", "1M captures/mo", "Priority support", "Custom fonts", "SLA 99.9%"],
      true,
    ],
    [
      "Enterprise",
      "Custom",
      "For large orgs",
      ["Dedicated infra", "SSO / SAML", "Audit logs", "99.99% SLA"],
      false,
    ],
  ];
  const cards = tiers
    .map(
      ([name, price, sub, feats, hot]) => `
      <div class="tier ${hot ? "hot" : ""}">
        ${hot ? '<div class="hot-badge">Most popular</div>' : ""}
        <div class="tier-name">${name}</div>
        <div class="tier-price">${price}<span>${price.startsWith("$") && price !== "$0" ? "/mo" : ""}</span></div>
        <div class="tier-sub">${sub}</div>
        <div class="tier-cta">${hot ? "Start free trial" : "Get started"}</div>
        <ul>${feats.map((feature) => `<li>${feature}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");
  return {
    widthPx: 980,
    heightPx: 640,
    css: `
      #target { background: linear-gradient(180deg, ${t.bg}, ${t.surfaceAlt}); }
      .pt-head { text-align: center; padding: 40px 0 8px; }
      .pt-head h1 { font-size: 34px; margin: 0; letter-spacing: -1px; }
      .pt-head p { color: ${t.textSoft}; font-size: 15px; }
      .tiers { display: flex; gap: 20px; justify-content: center; padding: 24px; }
      .tier { position: relative; width: 280px; border: 1px solid ${t.border}; border-radius: 14px; background: ${t.surface}; padding: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
      .tier.hot { border: 2px solid #635bff; transform: translateY(-10px); box-shadow: 0 12px 30px rgba(99, 91, 255, 0.25); }
      .hot-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #635bff; color: #ffffff; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 3px 12px; }
      .tier-name { font-weight: 700; font-size: 16px; }
      .tier-price { font-size: 34px; margin: 8px 0 2px; }
      .tier-price span { font-size: 14px; color: ${t.textSoft}; }
      .tier-sub { color: ${t.textSoft}; font-size: 13px; margin-bottom: 14px; }
      .tier-cta { text-align: center; border-radius: 999px; padding: 9px 0; font-size: 14px; font-weight: 700; background: ${t.surfaceAlt}; }
      .tier.hot .tier-cta { background: #635bff; color: #ffffff; }
      .tier ul { list-style: none; padding: 0; margin: 16px 0 0; font-size: 13px; }
      .tier li { padding: 5px 0 5px 22px; position: relative; color: ${t.text}; }
      .tier li::before { content: "✓"; position: absolute; left: 0; color: #635bff; font-weight: 700; }`,
    body: `
      <div class="pt-head"><h1>Pricing that scales with you</h1><p>Always know what you will pay. No hidden fees.</p></div>
      <div class="tiers">${cards}</div>`,
  };
};

archetypes["wiki-article"] = (t) => ({
  widthPx: 1060,
  heightPx: 700,
  css: `
    #target { font-family: Georgia, "Times New Roman", serif; }
    .wk-top { border-bottom: 1px solid ${t.border}; padding: 10px 20px; font-family: "Inter Fixture", sans-serif; font-size: 13px; display: flex; gap: 16px; color: ${t.textSoft}; }
    .wk-top b { color: ${t.text}; }
    .wk-body { display: grid; grid-template-columns: 170px 1fr 250px; gap: 22px; padding: 16px 20px; }
    .wk-nav { font-family: "Inter Fixture", sans-serif; font-size: 12px; color: ${t.accent}; line-height: 2; }
    .wk-nav div:first-child { color: ${t.textSoft}; font-weight: 700; }
    h1.wk-title { font-weight: 400; font-size: 28px; margin: 0 0 2px; border-bottom: 1px solid ${t.border}; padding-bottom: 4px; }
    .wk-sub { font-family: "Inter Fixture", sans-serif; font-size: 12px; color: ${t.textSoft}; margin-bottom: 10px; }
    .wk-article p { font-size: 14px; line-height: 1.65; margin: 0 0 12px; }
    .wk-article a { color: ${t.accent}; text-decoration: none; }
    .wk-toc { border: 1px solid ${t.border}; background: ${t.surfaceAlt}; padding: 10px 16px; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .wk-toc div { line-height: 1.9; }
    .wk-toc span { color: ${t.accent}; }
    .infobox { border: 1px solid ${t.border}; background: ${t.surfaceAlt}; font-family: "Inter Fixture", sans-serif; font-size: 12px; }
    .infobox .ib-title { background: #b0c4de; color: #1f2328; text-align: center; font-weight: 700; padding: 6px; }
    .infobox .ib-img { height: 130px; background: url("./assets/photo-landscape.png") center / cover; margin: 8px; }
    .infobox table { width: 100%; border-collapse: collapse; }
    .infobox td { padding: 4px 8px; vertical-align: top; line-height: 1.4; }
    .infobox td:first-child { font-weight: 700; width: 40%; }`,
  body: `
    <div class="wk-top"><b>Wikiverse</b><span>Article</span><span>Talk</span><span style="margin-left:auto;">Read · Edit · View history</span></div>
    <div class="wk-body">
      <div class="wk-nav"><div>Contents</div><div>(Top)</div><div>History</div><div>Rendering model</div><div>Performance</div><div>See also</div><div>References</div></div>
      <div class="wk-article">
        <h1 class="wk-title">Scalable Vector Graphics</h1>
        <div class="wk-sub">From Wikiverse, the free encyclopedia</div>
        <p><b>Scalable Vector Graphics</b> (<b>SVG</b>) is an <a>XML</a>-based vector graphics format for defining two-dimensional graphics, having support for interactivity and animation. The SVG specification is an open standard developed by the <a>World Wide Web Consortium</a> since 1999.</p>
        <div class="wk-toc"><div><b>Contents</b></div><div><span>1 History</span></div><div><span>2 Rendering model</span></div><div><span>3 Performance considerations</span></div><div><span>4 See also</span></div></div>
        <p>SVG images are defined in a vector graphics format and stored in XML text files. SVG images can thus be scaled in size without loss of quality, and SVG files can be searched, indexed, scripted, and <a>compressed</a>. The XML text files can be created and edited with text editors or vector graphics editors, and are rendered by most web browsers.</p>
        <p>A <a>foreignObject</a> element allows arbitrary XHTML content to be embedded inside an SVG document, which browsers rasterize using their standard CSS layout engine. This capability underlies most in-browser DOM screenshot techniques.</p>
      </div>
      <div class="infobox">
        <div class="ib-title">Scalable Vector Graphics</div>
        <div class="ib-img"></div>
        <table>
          <tr><td>Extension</td><td>.svg, .svgz</td></tr>
          <tr><td>MIME type</td><td>image/svg+xml</td></tr>
          <tr><td>Developed by</td><td>W3C</td></tr>
          <tr><td>Initial release</td><td>4 September 2001</td></tr>
          <tr><td>Type of format</td><td>Vector graphics</td></tr>
          <tr><td>Extended from</td><td>XML</td></tr>
        </table>
      </div>
    </div>`,
});

archetypes["link-aggregator"] = (t) => {
  const stories = [
    [
      "Show HN: I made a DOM screenshot library 6x faster than snapdom",
      "github.com/aidenybai",
      412,
      187,
    ],
    ["The case against microservices in 2026", "blog.pragmatic.dev", 890, 542],
    ["PostgreSQL 19 released", "postgresql.org", 1204, 318],
    ["Why we rewrote our compiler in Rust (again)", "buildfast.io", 233, 401],
    ["Ask HN: How do you handle on-call burnout?", "", 156, 289],
    ["Font subsetting reduced our page weight by 74%", "perf.wiki", 98, 44],
    ["A deep dive into Chromium's PNG encoder", "chromium.googlesource.com", 310, 122],
    ["Launch HN: Pixelperfect (YC S26) – Visual regression testing", "", 77, 63],
    ["The forgotten history of XHTML", "webhistory.org", 445, 267],
    ["Zero-copy deserialization in practice", "lowlevel.blog", 189, 71],
  ];
  const rows = stories
    .map(
      ([title, domain, points, comments], index) => `
      <div class="story"><span class="rank">${index + 1}.</span><span class="vote">▲</span>
        <div><span class="story-title">${title}</span>${domain ? ` <span class="domain">(${domain})</span>` : ""}
          <div class="story-meta">${points} points by user${index + 1} ${index + 2} hours ago | hide | ${comments} comments</div>
        </div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 900,
    heightPx: 660,
    css: `
      #target { background: ${t.isDark ? "#1a1a10" : "#f6f6ef"}; }
      .hn-bar { background: #ff6600; color: #1f2328; display: flex; align-items: center; gap: 10px; padding: 4px 8px; font-size: 13px; }
      .hn-bar b { border: 1px solid #ffffff; padding: 1px 3px; }
      .story { display: flex; gap: 6px; padding: 5px 10px; align-items: baseline; }
      .rank { color: ${t.textSoft}; font-size: 13px; min-width: 22px; text-align: right; }
      .vote { color: #999999; font-size: 10px; }
      .story-title { font-size: 13.5px; color: ${t.text}; }
      .domain { font-size: 11px; color: ${t.textSoft}; }
      .story-meta { font-size: 10.5px; color: ${t.textSoft}; padding-top: 1px; }`,
    body: `
      <div class="hn-bar"><b>Y</b><span style="font-weight:700;">Hacker Newz</span><span>new | past | comments | ask | show | jobs | submit</span><span style="margin-left:auto;">login</span></div>
      ${rows}`,
  };
};

archetypes["comment-thread"] = (t) => {
  const comment = (index, depth, author, text, votes) => `
    <div class="cmt" style="margin-left:${depth * 26}px;">
      <div class="cmt-head">${avatar(index, 22)}<b>${author}</b><span>· ${index + 1}h · ${votes} points</span></div>
      <div class="cmt-line"></div>
      <p>${text}</p>
      <div class="cmt-actions"><span>⬆ ${votes}</span><span>⬇</span><span>Reply</span><span>Share</span></div>
    </div>`;
  return {
    widthPx: 780,
    heightPx: 700,
    css: `
      .thread-head { padding: 16px 20px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .thread-sub { font-size: 12px; color: ${t.textSoft}; margin-bottom: 6px; }
      .thread-title { font-size: 19px; font-weight: 700; line-height: 1.3; }
      .thread-body { font-size: 14px; color: ${t.textSoft}; margin-top: 8px; line-height: 1.5; }
      .cmt { position: relative; padding: 10px 20px 2px; }
      .cmt-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .cmt-head span { color: ${t.textSoft}; font-size: 12px; }
      .cmt p { margin: 6px 0 6px 30px; font-size: 14px; line-height: 1.5; }
      .cmt-actions { display: flex; gap: 14px; margin-left: 30px; font-size: 12px; color: ${t.textSoft}; padding-bottom: 4px; }
      .cmt-line { position: absolute; left: 30px; top: 40px; bottom: 0; width: 2px; background: ${t.border}; border-radius: 2px; }`,
    body: `
      <div class="thread-head">
        <div class="thread-sub">r/webdev · Posted by u/pixel_pusher · 9h</div>
        <div class="thread-title">We replaced html2canvas with a foreignObject-based capture and cut screenshot time by 90%</div>
        <div class="thread-body">Full writeup with flamegraphs in the comments. Happy to answer questions about the gnarly parts (cross-origin fonts, canvas taint, iframe bridging).</div>
      </div>
      ${comment(0, 0, "svg_wizard", "The canvas taint issue with blob URLs bit us too. Data URLs are the only origin-clean path in Chromium — see whatwg/html#10641.", 342)}
      ${comment(1, 1, "pixel_pusher", "Exactly. We keep everything on data URLs and it stays clean in all three engines.", 128)}
      ${comment(2, 2, "perf_goblin", "How do you handle @font-face from cross-origin stylesheets? That was our blocker.", 55)}
      ${comment(3, 3, "pixel_pusher", "Re-fetch the CSS with CORS mode and inline the woff2 as base64. Works everywhere except opaque responses.", 71)}
      ${comment(4, 0, "grumpy_dev", "html2canvas re-implements the entire CSS engine in JS. It was always going to lose to letting the browser render.", 209)}
      ${comment(5, 1, "layout_lord", "It made sense in 2013. The platform caught up.", 84)}`,
  };
};

archetypes["email-inbox"] = (t) => {
  const mails = [
    [
      "GitHub",
      "[react-grab] PR #523: screenshot — CI passed",
      "All 18 checks have passed on screenshot-new.",
      "5:12 AM",
      true,
      false,
    ],
    [
      "Vercel",
      "Deployment ready: react-grab-website",
      "Your production deployment is now live.",
      "4:48 AM",
      true,
      true,
    ],
    [
      "Linear",
      "12 issues assigned to you in Cycle 14",
      "Capture pipeline hardening, WebKit raster quirks…",
      "Yesterday",
      false,
      false,
    ],
    [
      "Stripe",
      "Your invoice for June is available",
      "Amount due: $290.00 — auto-pay scheduled.",
      "Yesterday",
      false,
      false,
    ],
    [
      "npm",
      "Package published: fast-html-to-image@0.0.1",
      "You published a new package version.",
      "Jul 1",
      false,
      true,
    ],
    [
      "Datadog",
      "[P2] Latency alert resolved: capture-api",
      "p95 back under 120ms after 14 minutes.",
      "Jul 1",
      false,
      false,
    ],
    [
      "Figma",
      "Mia left 4 comments in 'Landing v3'",
      "Can we make the hero CTA pop more?",
      "Jun 30",
      false,
      false,
    ],
    [
      "Calendly",
      "Reminder: perf review tomorrow 10:00",
      "You have an upcoming meeting.",
      "Jun 30",
      false,
      false,
    ],
  ];
  const rows = mails
    .map(
      ([from, subject, preview, when, unread, starred]) => `
      <div class="mail ${unread ? "unread" : ""}">
        <span class="chk"></span><span class="star ${starred ? "on" : ""}">★</span>
        <span class="from">${from}</span>
        <span class="subj"><b>${subject}</b> <span class="prev">— ${preview}</span></span>
        <span class="when">${when}</span>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1080,
    heightPx: 660,
    css: `
      .gm-top { display: flex; align-items: center; gap: 16px; padding: 10px 18px; background: ${t.surface}; border-bottom: 1px solid ${t.border}; }
      .gm-logo { font-size: 20px; font-weight: 700; }
      .gm-logo span { color: #ea4335; }
      .gm-search { flex: 1; max-width: 560px; background: ${t.surfaceAlt}; border-radius: 999px; padding: 10px 18px; font-size: 14px; color: ${t.textSoft}; }
      .gm-body { display: grid; grid-template-columns: 200px 1fr; }
      .gm-nav { padding: 14px 8px; font-size: 14px; }
      .gm-compose { background: ${t.chipBg}; color: ${t.chipText}; border-radius: 14px; padding: 12px 20px; font-weight: 700; display: inline-block; margin: 0 0 14px 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15); }
      .gm-nav div.item { padding: 7px 16px; border-radius: 0 999px 999px 0; color: ${t.text}; }
      .gm-nav div.item.active { background: ${t.isDark ? "#3c2b1e" : "#fce8e6"}; font-weight: 700; }
      .gm-nav div.item span { float: right; font-size: 12px; color: ${t.textSoft}; }
      .mail { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; background: ${t.isDark ? "#10151c" : "#f2f6fc"}; }
      .mail.unread { background: ${t.surface}; }
      .mail.unread .from, .mail.unread .subj b { font-weight: 700; }
      .mail .from { width: 140px; flex: none; font-weight: 400; }
      .mail .subj { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mail .subj b { font-weight: 400; }
      .prev { color: ${t.textSoft}; }
      .when { font-size: 12px; color: ${t.textSoft}; flex: none; }
      .chk { width: 14px; height: 14px; border: 1px solid ${t.textSoft}; border-radius: 2px; flex: none; }
      .star { color: ${t.border}; flex: none; }
      .star.on { color: #f4b400; }`,
    body: `
      <div class="gm-top"><span class="gm-logo">G<span>mail</span></span><div class="gm-search">Search mail</div>${avatar(3, 32)}</div>
      <div class="gm-body">
        <div class="gm-nav">
          <div class="gm-compose">✏ Compose</div>
          <div class="item active">Inbox <span>2</span></div>
          <div class="item">Starred</div>
          <div class="item">Snoozed</div>
          <div class="item">Sent</div>
          <div class="item">Drafts <span>7</span></div>
          <div class="item">Spam <span>131</span></div>
        </div>
        <div>${rows}</div>
      </div>`,
  };
};

archetypes["team-chat"] = (t) => {
  const messages = [
    [0, "aiden", "9:02 AM", "warm capture is at 89.5ms on 70-stress now"],
    [1, "sara", "9:03 AM", "what got it under 100?"],
    [
      0,
      "aiden",
      "9:04 AM",
      "prototype-delegated style maps + reusing the encoded PNG when markup hash matches. the spread of ~340 props per memo hit was pure GC churn",
    ],
    [2, "dev", "9:07 AM", "did you check WebKit? it always finds a way"],
    [0, "aiden", "9:08 AM", "312 fidelity tests green on webkit + firefox 🎉"],
    [3, "mia", "9:15 AM", "shipping it. cutting the release after standup"],
  ];
  const rows = messages
    .map(
      ([avatarIndex, author, when, text]) => `
      <div class="msg">${avatar(avatarIndex, 36, "8px")}
        <div><div class="msg-head"><b>${author}</b> <span>${when}</span></div><div class="msg-text">${text}</div></div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1020,
    heightPx: 680,
    css: `
      .sl-wrap { display: grid; grid-template-columns: 220px 1fr; height: 100%; }
      .sl-side { background: ${t.isDark ? "#19171d" : "#3f0e40"}; color: #ffffff; padding: 14px 0; font-size: 14px; }
      .sl-team { font-weight: 700; font-size: 16px; padding: 0 16px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); }
      .sl-section { color: rgba(255, 255, 255, 0.6); padding: 14px 16px 6px; font-size: 13px; }
      .sl-chan { padding: 4px 16px; color: rgba(255, 255, 255, 0.75); }
      .sl-chan.active { background: #1164a3; color: #ffffff; font-weight: 700; }
      .sl-chan .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2bac76; margin-right: 6px; }
      .sl-main { display: flex; flex-direction: column; background: ${t.surface}; }
      .sl-chan-head { padding: 12px 18px; border-bottom: 1px solid ${t.border}; font-weight: 700; font-size: 15px; }
      .sl-chan-head span { font-weight: 400; font-size: 13px; color: ${t.textSoft}; margin-left: 10px; }
      .msg { display: flex; gap: 10px; padding: 8px 18px; }
      .msg:hover { background: ${t.surfaceAlt}; }
      .msg-head { font-size: 14px; }
      .msg-head span { font-size: 11px; color: ${t.textSoft}; margin-left: 6px; }
      .msg-text { font-size: 14px; line-height: 1.45; }
      .sl-input { margin: auto 18px 16px; border: 1px solid ${t.border}; border-radius: 8px; padding: 12px 14px; font-size: 14px; color: ${t.textSoft}; }`,
    body: `
      <div class="sl-wrap">
        <div class="sl-side">
          <div class="sl-team">million.dev</div>
          <div class="sl-section">Channels</div>
          <div class="sl-chan"># general</div>
          <div class="sl-chan active"># perf</div>
          <div class="sl-chan"># releases</div>
          <div class="sl-chan"># random</div>
          <div class="sl-section">Direct messages</div>
          <div class="sl-chan"><span class="dot"></span>sara</div>
          <div class="sl-chan"><span class="dot"></span>dev</div>
        </div>
        <div class="sl-main">
          <div class="sl-chan-head"># perf <span>6 members · Pinned: benchmark dashboard</span></div>
          ${rows}
          <div class="sl-input">Message #perf</div>
        </div>
      </div>`,
  };
};

archetypes["kanban-board"] = (t) => {
  const columns = [
    [
      "Backlog",
      [
        "Firefox settle-frame skip regression check",
        "Investigate AVIF output option",
        "Iframe bridge timeout tuning",
      ],
      "#8590a2",
    ],
    [
      "In Progress",
      ["Prototype-delegated style maps", "Site fixture generator (50 pages)"],
      "#2f6fdb",
    ],
    ["In Review", ["Minimal-escape SVG data URLs", "Animated memo grid fixture"], "#b8860b"],
    [
      "Done",
      [
        "PNG raster cache",
        "Memoized diff-cache",
        "Baseline probe batching",
        "Uint8Array base64 fast path",
      ],
      "#14a06c",
    ],
  ];
  const cols = columns
    .map(
      ([name, cards, color]) => `
      <div class="kb-col">
        <div class="kb-col-head"><span class="kb-dot" style="background:${color};"></span>${name} <span class="kb-count">${cards.length}</span></div>
        ${cards
          .map(
            (card, cardIndex) => `
        <div class="kb-card">${card}
          <div class="kb-card-foot"><span class="kb-tag" style="background:${color}22;color:${color};">PERF-${cardIndex + 11}</span>${avatar(cardIndex, 22)}</div>
        </div>`,
          )
          .join("")}
        <div class="kb-add">+ Add a card</div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1100,
    heightPx: 640,
    css: `
      #target { background: linear-gradient(135deg, #0079bf, #5067c5); }
      .kb-top { display: flex; align-items: center; gap: 12px; padding: 12px 18px; color: #ffffff; font-weight: 700; font-size: 16px; background: rgba(0, 0, 0, 0.2); }
      .kb-top span.badge { font-weight: 400; font-size: 12px; background: rgba(255, 255, 255, 0.25); border-radius: 4px; padding: 3px 8px; }
      .kb-cols { display: flex; gap: 14px; padding: 16px 18px; align-items: flex-start; }
      .kb-col { width: 258px; background: ${t.isDark ? "#101204" : "#f1f2f4"}; color: ${t.isDark ? "#b6c2cf" : "#172b4d"}; border-radius: 12px; padding: 10px; }
      .kb-col-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; padding: 4px 6px 10px; }
      .kb-dot { width: 10px; height: 10px; border-radius: 50%; }
      .kb-count { margin-left: auto; font-weight: 400; font-size: 12px; opacity: 0.7; }
      .kb-card { background: ${t.isDark ? "#22272b" : "#ffffff"}; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.4; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(9, 30, 66, 0.25); }
      .kb-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
      .kb-tag { font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 6px; }
      .kb-add { font-size: 13px; opacity: 0.7; padding: 6px; }`,
    body: `
      <div class="kb-top">Capture Engine Roadmap <span class="badge">Board</span><span class="badge">Private</span><span style="margin-left:auto;display:flex;">${avatar(0, 26)}${avatar(1, 26)}${avatar(2, 26)}</span></div>
      <div class="kb-cols">${cols}</div>`,
  };
};

archetypes["music-player"] = (t) => {
  const tracks = [
    ["Midnight Compile", "The Segfaults", "3:42"],
    ["Garbage Collector Blues", "Heap & The Stacks", "4:15"],
    ["Async Awakening", "Promise All-Stars", "2:58"],
    ["Cache Invalidation", "The Hard Problems", "5:03"],
    ["Off By One", "Array Index", "3:21"],
    ["Tail Call", "The Optimizers", "4:44"],
  ];
  const rows = tracks
    .map(
      ([title, artist, duration], index) => `
      <div class="track ${index === 1 ? "playing" : ""}">
        <span class="track-num">${index === 1 ? "▶" : index + 1}</span>
        <span class="track-art" style="background:linear-gradient(135deg,${avatarPalette[index]},${avatarPalette[(index + 4) % 8]});"></span>
        <div class="track-info"><div class="track-title">${title}</div><div class="track-artist">${artist}</div></div>
        <span class="track-dur">${duration}</span>
      </div>`,
    )
    .join("");
  return {
    widthPx: 980,
    heightPx: 700,
    css: `
      #target { background: linear-gradient(180deg, ${t.isDark ? "#3d1f5c" : t.accent} 0%, #121212 42%); color: #ffffff; }
      .sp-head { display: flex; align-items: flex-end; gap: 22px; padding: 40px 30px 24px; }
      .sp-cover { width: 180px; height: 180px; border-radius: 6px; background: linear-gradient(135deg, #ff6a3d, #a12568, #21d4fd); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); }
      .sp-kind { font-size: 12px; font-weight: 700; }
      .sp-title { font-size: 46px; font-weight: 700; letter-spacing: -2px; margin: 6px 0; }
      .sp-meta { font-size: 13px; color: rgba(255, 255, 255, 0.7); }
      .sp-controls { display: flex; align-items: center; gap: 22px; padding: 16px 30px; }
      .sp-play { width: 52px; height: 52px; border-radius: 50%; background: ${t.isDark ? "#1ed760" : t.chipBg}; display: flex; align-items: center; justify-content: center; color: #000000; font-size: 20px; }
      .track { display: flex; align-items: center; gap: 14px; padding: 8px 30px; font-size: 14px; }
      .track:hover { background: rgba(255, 255, 255, 0.08); }
      .track.playing .track-title { color: ${t.isDark ? "#1ed760" : t.chipBg}; }
      .track-num { width: 16px; color: rgba(255, 255, 255, 0.6); font-size: 13px; }
      .track-art { width: 38px; height: 38px; border-radius: 4px; flex: none; }
      .track-info { flex: 1; }
      .track-artist { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
      .track-dur { color: rgba(255, 255, 255, 0.6); font-size: 13px; }
      .now-bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 12px; background: #181818; border-top: 1px solid #282828; padding: 10px 16px; font-size: 12px; }
      .now-progress { flex: 1; height: 4px; border-radius: 2px; background: #4d4d4d; position: relative; }
      .now-progress::before { content: ""; position: absolute; inset: 0 62% 0 0; background: #ffffff; border-radius: 2px; }`,
    body: `
      <div class="sp-head"><div class="sp-cover"></div>
        <div><div class="sp-kind">Playlist</div><div class="sp-title">Deep Focus Coding</div><div class="sp-meta">Made for you · 6 songs, 24 min</div></div>
      </div>
      <div class="sp-controls"><div class="sp-play">▶</div><span style="font-size:22px;color:#1ed760;">＋</span><span style="font-size:22px;color:rgba(255,255,255,0.6);">⋯</span></div>
      ${rows}
      <div class="now-bar">${avatar(5, 34, "4px")}<div><b>Garbage Collector Blues</b><div style="color:rgba(255,255,255,0.6);">Heap &amp; The Stacks</div></div><span style="margin-left:auto;">1:34</span><div class="now-progress"></div><span>4:15</span></div>`,
  };
};

archetypes["streaming-rows"] = (t) => {
  const row = (label, seed) => `
    <div class="nf-row-label">${label}</div>
    <div class="nf-row">${range(6)
      .map(
        (index) =>
          `<div class="nf-card" style="background:linear-gradient(${(seed + index) * 40}deg,${avatarPalette[(seed + index) % 8]},#0b0b0f 80%);"><span class="nf-rank">${index + 1}</span></div>`,
      )
      .join("")}</div>`;
  return {
    widthPx: 1100,
    heightPx: 700,
    css: `
      #target { background: #141414; color: #ffffff; }
      .nf-top { display: flex; align-items: center; gap: 24px; padding: 14px 40px; font-size: 14px; position: absolute; top: 0; left: 0; right: 0; z-index: 2; }
      .nf-logo { color: ${t.isDark ? "#e50914" : t.accent}; font-weight: 700; font-size: 24px; letter-spacing: -1px; }
      .nf-hero { height: 340px; background: linear-gradient(90deg, rgba(0, 0, 0, 0.9) 20%, transparent 60%), linear-gradient(200deg, ${t.isDark ? "#40196d" : t.accent}, #97144d 60%, #1a1a2e); display: flex; flex-direction: column; justify-content: center; padding: 0 40px; }
      .nf-hero h1 { font-size: 44px; margin: 0 0 10px; letter-spacing: -1px; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7); }
      .nf-hero p { max-width: 420px; font-size: 15px; line-height: 1.5; color: rgba(255, 255, 255, 0.85); margin: 0 0 18px; }
      .nf-btns { display: flex; gap: 12px; }
      .nf-btns span { border-radius: 4px; padding: 9px 22px; font-weight: 700; font-size: 15px; }
      .nf-btns .play { background: #ffffff; color: #000000; }
      .nf-btns .info { background: rgba(109, 109, 110, 0.7); }
      .nf-row-label { font-size: 17px; font-weight: 700; padding: 18px 40px 8px; }
      .nf-row { display: flex; gap: 8px; padding: 0 40px; }
      .nf-card { position: relative; width: 166px; height: 94px; border-radius: 4px; flex: none; }
      .nf-rank { position: absolute; left: 6px; bottom: 2px; font-size: 40px; font-weight: 700; -webkit-text-stroke: 2px #ffffff; color: #141414; }`,
    body: `
      <div class="nf-top"><span class="nf-logo">WEBFLIX</span><span>Home</span><span>TV Shows</span><span>Movies</span><span>My List</span><span style="margin-left:auto;">${avatar(2, 28, "4px")}</span></div>
      <div class="nf-hero"><h1>The Rendering Engine</h1><p>A documentary crew follows six browser engineers as they race to ship a new compositor before the merge window closes.</p><div class="nf-btns"><span class="play">▶ Play</span><span class="info">ⓘ More Info</span></div></div>
      ${row("Trending Now", 0)}
      ${row("Because you watched The Bug Hunt", 3)}`,
  };
};

archetypes["search-results"] = (t) => {
  const results = [
    [
      "fast-html-to-image - npm",
      "npmjs.com › package › fast-html-to-image",
      "Fast, high-fidelity DOM node to image capture. Screenshot any DOM node in the browser and get back a pixel-accurate PNG. Zero runtime dependencies.",
    ],
    [
      "GitHub - aidenybai/react-grab",
      "github.com › aidenybai › react-grab",
      "Browser overlay tool that lets developers visually select DOM elements and copy structured context to clipboard for AI coding agents.",
    ],
    [
      "How to screenshot a DOM element with JavaScript - Stack Overflow",
      "stackoverflow.com › questions › 60724",
      "The modern approach serializes the node into an SVG foreignObject and rasterizes it on a canvas, which preserves computed styles and web fonts.",
    ],
    [
      "html-to-image vs snapdom vs modern-screenshot: 2026 benchmark",
      "perfbench.dev › dom-capture",
      "We measured cold and warm capture across 20 fixtures. The fastest library completed the stress fixture in 89ms warm, 6x faster than the median.",
    ],
  ];
  const rows = results
    .map(
      ([title, breadcrumb, snippet]) => `
      <div class="result"><div class="crumb">${breadcrumb}</div><a class="r-title">${title}</a><p>${snippet}</p></div>`,
    )
    .join("");
  return {
    widthPx: 960,
    heightPx: 700,
    css: `
      .g-head { display: flex; align-items: center; gap: 26px; padding: 20px 26px 0; }
      .g-logo { font-size: 26px; font-weight: 700; }
      .g-logo span:nth-child(1) { color: #4285f4; } .g-logo span:nth-child(2) { color: #ea4335; } .g-logo span:nth-child(3) { color: #fbbc05; } .g-logo span:nth-child(4) { color: #4285f4; } .g-logo span:nth-child(5) { color: #34a853; } .g-logo span:nth-child(6) { color: #ea4335; }
      .g-box { flex: 1; max-width: 560px; border: 1px solid ${t.border}; border-radius: 999px; padding: 11px 20px; font-size: 15px; box-shadow: 0 1px 6px rgba(32, 33, 36, 0.18); background: ${t.surface}; }
      .g-tabs { display: flex; gap: 24px; padding: 16px 26px 10px 200px; font-size: 13px; color: ${t.textSoft}; border-bottom: 1px solid ${t.border}; }
      .g-tabs .active { color: ${t.accent}; border-bottom: 3px solid ${t.accent}; padding-bottom: 9px; margin-bottom: -11px; font-weight: 700; }
      .g-stats { padding: 12px 26px 4px 200px; font-size: 13px; color: ${t.textSoft}; }
      .result { padding: 12px 26px 8px 200px; max-width: 820px; }
      .crumb { font-size: 12px; color: ${t.textSoft}; }
      .r-title { font-size: 19px; color: ${t.isDark ? "#8ab4f8" : "#1a0dab"}; display: block; margin: 3px 0; }
      .result p { font-size: 14px; line-height: 1.55; color: ${t.textSoft}; margin: 0; }`,
    body: `
      <div class="g-head"><div class="g-logo"><span>S</span><span>e</span><span>e</span><span>k</span><span>l</span><span>e</span></div><div class="g-box">fastest dom to image library</div></div>
      <div class="g-tabs"><span class="active">All</span><span>Images</span><span>Videos</span><span>News</span><span>Forums</span><span>More</span></div>
      <div class="g-stats">About 2,340,000 results (0.31 seconds)</div>
      ${rows}`,
  };
};

archetypes["blog-article"] = (t) => ({
  widthPx: 760,
  heightPx: 700,
  css: `
    .md-head { display: flex; align-items: center; gap: 12px; padding: 28px 80px 0; }
    .md-author { font-size: 14px; }
    .md-author div:last-child { color: ${t.textSoft}; font-size: 13px; }
    .md-follow { margin-left: auto; color: ${t.good}; border: 1px solid ${t.good}; border-radius: 999px; font-size: 13px; padding: 5px 14px; }
    article { padding: 18px 80px; }
    article h1 { font-size: 34px; letter-spacing: -1px; line-height: 1.15; margin: 0 0 6px; }
    .md-sub { font-size: 18px; color: ${t.textSoft}; margin-bottom: 20px; }
    article p { font-family: Georgia, serif; font-size: 17px; line-height: 1.75; margin: 0 0 18px; }
    article p:first-of-type::first-letter { font-size: 52px; float: left; line-height: 0.9; padding-right: 8px; font-family: Georgia, serif; }
    blockquote { border-left: 3px solid ${t.text}; margin: 0 0 18px; padding-left: 18px; font-style: italic; font-family: Georgia, serif; font-size: 19px; line-height: 1.6; }
    pre { background: ${t.surfaceAlt}; border-radius: 6px; padding: 14px 16px; font-size: 13px; line-height: 20px; overflow: hidden; }
    pre .kw { color: ${t.accent}; } pre .str { color: ${t.good}; } pre .fn { color: ${t.warn}; }
    .md-claps { display: flex; gap: 18px; color: ${t.textSoft}; font-size: 14px; border-top: 1px solid ${t.border}; margin: 0 80px; padding: 14px 0; }`,
  body: `
    <div class="md-head">${avatar(2, 44)}
      <div class="md-author"><div><b>Elena Vasquez</b> · <span style="color:${t.good};">Member only</span></div><div>12 min read · Jun 28, 2026</div></div>
      <span class="md-follow">Follow</span>
    </div>
    <article>
      <h1>The browser is the best screenshot engine you already have</h1>
      <div class="md-sub">Why re-implementing CSS in JavaScript was always a dead end</div>
      <p>For a decade, taking a screenshot of a DOM node meant one thing: html2canvas. It parsed your styles, walked your layout, and painted every border-radius by hand onto a canvas. It was heroic. It was also doomed.</p>
      <blockquote>Every line of CSS the platform ships is a line your library now has to reimplement — forever.</blockquote>
      <p>The alternative hides in an SVG element from 2001. Wrap your markup in a <code>foreignObject</code>, hand it to the browser as an image, and the real layout engine does the painting:</p>
      <pre><span class="kw">const</span> svg = <span class="str">\`&lt;svg xmlns="..."&gt;&lt;foreignObject&gt;\${markup}&lt;/foreignObject&gt;&lt;/svg&gt;\`</span>;
img.src = <span class="str">"data:image/svg+xml,"</span> + <span class="fn">encode</span>(svg);
ctx.<span class="fn">drawImage</span>(img, 0, 0);</pre>
      <p>The hard part is not the rasterization — it is capturing the state the browser will not serialize for you: computed styles, form values, canvas frames, and fonts locked behind cross-origin stylesheets.</p>
    </article>
    <div class="md-claps"><span>👏 2.4K</span><span>💬 87</span><span style="margin-left:auto;">🔖 &nbsp; ↗</span></div>`,
});

archetypes["profile-page"] = (t) => ({
  widthPx: 900,
  heightPx: 700,
  css: `
    .li-cover { height: 140px; background: linear-gradient(110deg, #0a66c2, #16437e, #6b2d5c); }
    .li-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; margin: -60px 24px 16px; padding: 0 24px 20px; position: relative; }
    .li-avatar { width: 130px; height: 130px; border-radius: 50%; border: 4px solid ${t.surface}; background: linear-gradient(135deg, #2f6fdb, #14a06c); margin-top: -40px; }
    .li-name { font-size: 24px; font-weight: 700; margin-top: 10px; }
    .li-headline { font-size: 15px; margin: 2px 0; }
    .li-meta { font-size: 13px; color: ${t.textSoft}; }
    .li-meta b { color: ${t.accent}; }
    .li-btns { display: flex; gap: 8px; margin-top: 12px; }
    .li-btns span { border-radius: 999px; padding: 6px 16px; font-size: 14px; font-weight: 700; }
    .li-btns .primary { background: #0a66c2; color: #ffffff; }
    .li-btns .secondary { color: #0a66c2; border: 1px solid #0a66c2; }
    .li-section { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 10px; margin: 0 24px 16px; padding: 18px 24px; }
    .li-section h2 { font-size: 18px; margin: 0 0 12px; }
    .li-exp { display: flex; gap: 14px; padding: 8px 0; }
    .li-exp-body { font-size: 14px; }
    .li-exp-body .role { font-weight: 700; }
    .li-exp-body .co, .li-exp-body .when { color: ${t.textSoft}; font-size: 13px; }`,
  body: `
    <div class="li-cover"></div>
    <div class="li-card">
      <div class="li-avatar"></div>
      <div class="li-name">Jordan Reyes</div>
      <div class="li-headline">Staff Engineer · Browser Performance · Ex-rendering team</div>
      <div class="li-meta">San Francisco Bay Area · <b>2,847 followers</b> · <b>500+ connections</b></div>
      <div class="li-btns"><span class="primary">Connect</span><span class="secondary">Message</span><span class="secondary">More</span></div>
    </div>
    <div class="li-section">
      <h2>Experience</h2>
      <div class="li-exp">${avatar(1, 44, "8px")}<div class="li-exp-body"><div class="role">Staff Software Engineer</div><div class="co">Million Software · Full-time</div><div class="when">Jan 2024 – Present · 2 yrs 6 mos</div></div></div>
      <div class="li-exp">${avatar(5, 44, "8px")}<div class="li-exp-body"><div class="role">Senior Engineer, Rendering</div><div class="co">BrowserCorp</div><div class="when">2019 – 2024 · 5 yrs</div></div></div>
    </div>`,
});

archetypes["listing-grid"] = (t) => {
  const listings = [
    ["Modern loft in SoMa", "$210 night", "4.92", 0],
    ["Beach house with deck", "$385 night", "4.88", 1],
    ["Cozy A-frame cabin", "$168 night", "4.97", 2],
    ["Downtown studio", "$120 night", "4.71", 3],
    ["Treehouse getaway", "$240 night", "4.99", 4],
    ["Desert dome", "$199 night", "4.85", 5],
  ];
  const cards = listings
    .map(
      ([title, price, rating, seed]) => `
      <div class="bnb-card">
        <div class="bnb-photo" style="background:linear-gradient(${seed * 55}deg,${avatarPalette[seed]},${avatarPalette[(seed + 5) % 8]});"><span class="bnb-fav">♡</span>${seed === 0 ? '<span class="bnb-badge">Guest favorite</span>' : ""}</div>
        <div class="bnb-title"><b>${title}</b><span>★ ${rating}</span></div>
        <div class="bnb-sub">Individual host · ${seed + 2} beds</div>
        <div class="bnb-price"><b>${price.split(" ")[0]}</b> ${price.split(" ")[1]}</div>
      </div>`,
    )
    .join("");
  return {
    widthPx: 1080,
    heightPx: 700,
    css: `
      .bnb-head { display: flex; align-items: center; padding: 16px 40px; border-bottom: 1px solid ${t.border}; }
      .bnb-logo { color: #ff385c; font-weight: 700; font-size: 20px; }
      .bnb-search { margin: 0 auto; display: flex; align-items: center; border: 1px solid ${t.border}; border-radius: 999px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); font-size: 14px; background: ${t.surface}; }
      .bnb-search span { padding: 10px 18px; border-right: 1px solid ${t.border}; }
      .bnb-search span:last-child { border-right: none; color: ${t.textSoft}; }
      .bnb-filters { display: flex; gap: 26px; padding: 14px 40px; font-size: 12px; color: ${t.textSoft}; border-bottom: 1px solid ${t.border}; }
      .bnb-filters span:first-child { color: ${t.text}; font-weight: 700; border-bottom: 2px solid ${t.text}; padding-bottom: 12px; margin-bottom: -15px; }
      .bnb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; padding: 22px 40px; }
      .bnb-photo { position: relative; aspect-ratio: 20 / 19; border-radius: 14px; }
      .bnb-fav { position: absolute; top: 10px; right: 12px; color: #ffffff; font-size: 18px; }
      .bnb-badge { position: absolute; top: 10px; left: 10px; background: #ffffff; color: #222222; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 4px 10px; }
      .bnb-title { display: flex; justify-content: space-between; font-size: 14px; margin-top: 9px; }
      .bnb-sub { font-size: 13px; color: ${t.textSoft}; margin: 1px 0; }
      .bnb-price { font-size: 14px; }`,
    body: `
      <div class="bnb-head"><span class="bnb-logo">⌂ airhouse</span><div class="bnb-search"><span><b>Anywhere</b></span><span><b>Any week</b></span><span>Add guests 🔍</span></div>${avatar(6, 30)}</div>
      <div class="bnb-filters"><span>Cabins</span><span>Beachfront</span><span>Amazing views</span><span>Tiny homes</span><span>Treehouses</span><span>Domes</span><span>Lakefront</span></div>
      <div class="bnb-grid">${cards}</div>`,
  };
};

archetypes["checkout-form"] = (t) => ({
  widthPx: 1000,
  heightPx: 700,
  css: `
    .co-wrap { display: grid; grid-template-columns: 1fr 380px; height: 100%; }
    .co-form { padding: 34px 44px; background: ${t.surface}; }
    .co-form h1 { font-size: 20px; margin: 0 0 20px; }
    .co-label { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }
    .co-input { border: 1px solid ${t.border}; border-radius: 6px; padding: 10px 12px; font-size: 14px; color: ${t.textSoft}; background: ${t.bg}; }
    .co-row { display: flex; gap: 10px; }
    .co-row .co-input { flex: 1; }
    input.co-real { width: 100%; border: 1px solid ${t.border}; border-radius: 6px; padding: 10px 12px; font-size: 14px; background: ${t.bg}; color: ${t.text}; font-family: inherit; }
    .co-pay { margin-top: 24px; width: 100%; background: #635bff; color: #ffffff; border-radius: 6px; text-align: center; padding: 12px 0; font-size: 15px; font-weight: 700; }
    .co-summary { background: ${t.surfaceAlt}; padding: 34px 36px; border-left: 1px solid ${t.border}; }
    .co-item { display: flex; gap: 12px; font-size: 14px; margin-bottom: 16px; }
    .co-item-thumb { width: 46px; height: 46px; border-radius: 8px; flex: none; }
    .co-item .amt { margin-left: auto; }
    .co-total { display: flex; font-size: 14px; padding: 8px 0; }
    .co-total span:last-child { margin-left: auto; }
    .co-total.grand { border-top: 1px solid ${t.border}; font-weight: 700; margin-top: 8px; padding-top: 14px; }`,
  body: `
    <div class="co-wrap">
      <div class="co-form">
        <h1>Pay with card</h1>
        <div class="co-label">Email</div>
        <input class="co-real" value="jordan@example.com" />
        <div class="co-label">Card information</div>
        <input class="co-real" value="4242 4242 4242 4242" />
        <div class="co-row" style="margin-top:8px;"><div class="co-input">12 / 28</div><div class="co-input">CVC</div></div>
        <div class="co-label">Name on card</div>
        <input class="co-real" value="Jordan Reyes" />
        <div class="co-label">Country or region</div>
        <div class="co-input">United States ▾</div>
        <div class="co-pay">Pay $328.00</div>
      </div>
      <div class="co-summary">
        <div style="font-size:13px;color:${t.textSoft};">Pay DevTools Inc.</div>
        <div style="font-size:30px;font-weight:700;margin:4px 0 24px;">$328.00</div>
        <div class="co-item"><span class="co-item-thumb" style="background:linear-gradient(135deg,#2f6fdb,#7a3b8f);"></span><div>Pro plan × 12 months<div style="color:${t.textSoft};font-size:12px;">Billed annually</div></div><span class="amt">$290.00</span></div>
        <div class="co-item"><span class="co-item-thumb" style="background:linear-gradient(135deg,#14a06c,#b8860b);"></span><div>Extra seats × 2</div><span class="amt">$38.00</span></div>
        <div class="co-total"><span>Subtotal</span><span>$328.00</span></div>
        <div class="co-total"><span>Tax</span><span>$0.00</span></div>
        <div class="co-total grand"><span>Total due</span><span>$328.00</span></div>
      </div>
    </div>`,
});

archetypes["analytics-dashboard"] = (t) => {
  const bars = [42, 68, 55, 90, 74, 96, 61, 83, 70, 100, 88, 77];
  const stats = [
    ["Total visitors", "128.4K", "+12.3%", true],
    ["Bounce rate", "31.2%", "-4.1%", true],
    ["Avg. session", "4m 12s", "+0.8%", true],
    ["Conversions", "3,204", "-2.2%", false],
  ];
  return {
    widthPx: 1100,
    heightPx: 700,
    css: `
      .db-wrap { display: grid; grid-template-columns: 200px 1fr; height: 100%; }
      .db-side { background: ${t.surface}; border-right: 1px solid ${t.border}; padding: 18px 12px; font-size: 14px; }
      .db-side .brand { font-weight: 700; font-size: 16px; padding: 0 10px 16px; }
      .db-side .nav-item { padding: 8px 10px; border-radius: 8px; color: ${t.textSoft}; }
      .db-side .nav-item.active { background: ${t.chipBg}; color: ${t.chipText}; font-weight: 700; }
      .db-main { padding: 22px 26px; }
      .db-main h1 { font-size: 20px; margin: 0 0 16px; }
      .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
      .stat { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; padding: 14px 16px; }
      .stat .label { font-size: 12px; color: ${t.textSoft}; }
      .stat .value { font-size: 24px; font-weight: 700; margin: 4px 0; }
      .stat .delta { font-size: 12px; font-weight: 700; }
      .stat .delta.up { color: ${t.good}; } .stat .delta.down { color: ${t.bad}; }
      .chart-card { background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 12px; padding: 18px; }
      .chart-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; }
      .chart { display: flex; align-items: flex-end; gap: 12px; height: 180px; border-bottom: 1px solid ${t.border}; padding: 0 6px; }
      .bar { flex: 1; border-radius: 6px 6px 0 0; background: linear-gradient(180deg, ${t.accent}, ${t.accent}66); }
      .chart-x { display: flex; gap: 12px; padding: 8px 6px 0; font-size: 10px; color: ${t.textSoft}; }
      .chart-x span { flex: 1; text-align: center; }
      .spark-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
      .donut { width: 110px; height: 110px; border-radius: 50%; background: conic-gradient(${t.accent} 0 62%, ${t.good} 62% 84%, ${t.warn} 84% 100%); position: relative; }
      .donut::after { content: "62%"; position: absolute; inset: 18px; border-radius: 50%; background: ${t.surface}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }`,
    body: `
      <div class="db-wrap">
        <div class="db-side">
          <div class="brand">◈ Plausistats</div>
          <div class="nav-item active">Overview</div>
          <div class="nav-item">Realtime</div>
          <div class="nav-item">Funnels</div>
          <div class="nav-item">Retention</div>
          <div class="nav-item">Settings</div>
        </div>
        <div class="db-main">
          <h1>Overview <span style="font-size:12px;color:${t.textSoft};font-weight:400;">Last 12 months</span></h1>
          <div class="stat-grid">${stats
            .map(
              ([label, value, delta, up]) =>
                `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="delta ${up ? "up" : "down"}">${delta}</div></div>`,
            )
            .join("")}</div>
          <div class="chart-card">
            <div class="chart-title">Visitors per month</div>
            <div class="chart">${bars.map((height) => `<div class="bar" style="height:${height}%;"></div>`).join("")}</div>
            <div class="chart-x"><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div>
          </div>
          <div class="spark-row">
            <div class="chart-card" style="display:flex;gap:20px;align-items:center;"><div class="donut"></div><div style="font-size:13px;line-height:2;"><span style="color:${t.accent};">●</span> Organic search<br /><span style="color:${t.good};">●</span> Direct<br /><span style="color:${t.warn};">●</span> Referral</div></div>
            <div class="chart-card"><div class="chart-title">Top pages</div><div style="font-size:13px;line-height:2.1;">/docs/quickstart <b style="float:right;">24.1K</b><br />/blog/foreignobject <b style="float:right;">18.7K</b><br />/pricing <b style="float:right;">12.3K</b></div></div>
          </div>
        </div>
      </div>`,
  };
};

archetypes["docs-site"] = (t) => ({
  widthPx: 1080,
  heightPx: 700,
  css: `
    .doc-top { display: flex; align-items: center; gap: 20px; padding: 12px 24px; border-bottom: 1px solid ${t.border}; font-size: 14px; background: ${t.surface}; }
    .doc-logo { font-weight: 700; }
    .doc-search { margin-left: auto; border: 1px solid ${t.border}; border-radius: 8px; padding: 6px 14px; font-size: 13px; color: ${t.textSoft}; background: ${t.bg}; }
    .doc-search kbd { border: 1px solid ${t.border}; border-radius: 4px; padding: 0 5px; font-size: 11px; margin-left: 14px; }
    .doc-body { display: grid; grid-template-columns: 230px 1fr 180px; }
    .doc-nav { border-right: 1px solid ${t.border}; padding: 18px 16px; font-size: 13px; }
    .doc-nav .group { font-weight: 700; margin: 12px 0 6px; }
    .doc-nav .link { padding: 4px 10px; color: ${t.textSoft}; border-left: 2px solid ${t.border}; }
    .doc-nav .link.active { color: ${t.accent}; border-left-color: ${t.accent}; font-weight: 700; }
    .doc-main { padding: 26px 40px; }
    .doc-main h1 { font-size: 30px; margin: 0 0 8px; letter-spacing: -0.5px; }
    .doc-main .lead { font-size: 16px; color: ${t.textSoft}; margin-bottom: 20px; }
    .doc-main h2 { font-size: 20px; margin: 24px 0 8px; border-bottom: 1px solid ${t.border}; padding-bottom: 6px; }
    .doc-main p { font-size: 14px; line-height: 1.7; }
    .doc-main code { background: ${t.surfaceAlt}; border-radius: 4px; padding: 1px 6px; font-size: 13px; font-family: monospace; }
    .callout { border: 1px solid ${t.accent}44; background: ${t.chipBg}; border-radius: 8px; padding: 12px 16px; font-size: 13px; line-height: 1.6; margin: 14px 0; }
    pre.doc-code { background: #0d1117; color: #e6edf3; border-radius: 8px; padding: 14px 18px; font-size: 13px; line-height: 1.65; }
    pre.doc-code .cm { color: #8b949e; } pre.doc-code .kw { color: #ff7b72; } pre.doc-code .str { color: #a5d6ff; } pre.doc-code .fn { color: #d2a8ff; }
    .doc-toc { padding: 26px 16px; font-size: 12px; color: ${t.textSoft}; line-height: 2; }
    .doc-toc b { color: ${t.text}; }`,
  body: `
    <div class="doc-top"><span class="doc-logo">⚡ fast-html-to-image</span><span>Docs</span><span>API</span><span>Blog</span><div class="doc-search">Search docs <kbd>⌘K</kbd></div></div>
    <div class="doc-body">
      <div class="doc-nav">
        <div class="group">Getting started</div>
        <div class="link">Installation</div>
        <div class="link active">Quickstart</div>
        <div class="link">Options</div>
        <div class="group">Guides</div>
        <div class="link">Cross-origin content</div>
        <div class="link">Web fonts</div>
        <div class="link">Iframes</div>
      </div>
      <div class="doc-main">
        <h1>Quickstart</h1>
        <div class="lead">Capture your first pixel-accurate screenshot in under a minute.</div>
        <h2>Capture a node</h2>
        <p>Call <code>captureNode</code> with any element. The returned handle exposes lazy encoders so you only pay for the formats you use.</p>
        <pre class="doc-code"><span class="cm">// capture and copy to clipboard</span>
<span class="kw">import</span> { captureNode } <span class="kw">from</span> <span class="str">"fast-html-to-image"</span>;

<span class="kw">const</span> result = <span class="kw">await</span> <span class="fn">captureNode</span>(element, { scale: <span class="str">2</span> });
<span class="kw">const</span> blob = <span class="kw">await</span> result.<span class="fn">toBlob</span>();</pre>
        <div class="callout"><b>Note:</b> repeat captures of an unchanged DOM reuse the encoded PNG automatically — warm captures typically complete in under 100ms.</div>
      </div>
      <div class="doc-toc"><b>On this page</b><br />Capture a node<br />Choosing a scale<br />Handling fonts<br />Next steps</div>
    </div>`,
});

archetypes["calendar-week"] = (t) => {
  const events = [
    [1, 9, 2, "#2f6fdb", "Standup"],
    [1, 13, 3, "#14a06c", "Perf review"],
    [2, 10, 4, "#7a3b8f", "Deep work: capture pipeline"],
    [3, 9, 2, "#2f6fdb", "Standup"],
    [3, 14, 2, "#b8860b", "1:1 with Sara"],
    [4, 11, 3, "#be185d", "Release cut"],
    [5, 9, 2, "#2f6fdb", "Standup"],
    [5, 15, 4, "#0f766e", "Fixture triage"],
  ];
  const eventDivs = events
    .map(
      ([day, start, span, color, label]) => `
      <div class="cal-event" style="grid-column:${day + 1};grid-row:${start - 7} / span ${span};background:${color}22;border-left:3px solid ${color};color:${color};">${label}<br /><span>${start}:00 – ${start + Math.ceil(span / 2)}:00</span></div>`,
    )
    .join("");
  return {
    widthPx: 1080,
    heightPx: 700,
    css: `
      .cal-head { display: flex; align-items: center; gap: 16px; padding: 14px 22px; border-bottom: 1px solid ${t.border}; background: ${t.surface}; }
      .cal-head h1 { font-size: 20px; font-weight: 400; margin: 0; }
      .cal-today { border: 1px solid ${t.border}; border-radius: 6px; padding: 6px 14px; font-size: 13px; }
      .cal-days { display: grid; grid-template-columns: 60px repeat(5, 1fr); border-bottom: 1px solid ${t.border}; font-size: 12px; color: ${t.textSoft}; text-align: center; padding: 8px 0; background: ${t.surface}; }
      .cal-days b { display: block; font-size: 20px; color: ${t.text}; }
      .cal-days .today b { background: ${t.accent}; color: #ffffff; border-radius: 50%; width: 34px; height: 34px; line-height: 34px; margin: 0 auto; }
      .cal-grid { display: grid; grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: repeat(10, 52px); position: relative; }
      .cal-hour { grid-column: 1; font-size: 10px; color: ${t.textSoft}; text-align: right; padding-right: 8px; border-top: 1px solid ${t.border}; }
      .cal-cell { border-top: 1px solid ${t.border}; border-left: 1px solid ${t.border}; }
      .cal-event { margin: 1px 4px; border-radius: 5px; font-size: 11px; font-weight: 700; padding: 4px 6px; overflow: hidden; }
      .cal-event span { font-weight: 400; opacity: 0.8; }`,
    body: `
      <div class="cal-head"><span style="font-size:18px;">📅</span><h1><b>June</b> 2026</h1><span class="cal-today">Today</span><span style="margin-left:auto;font-size:13px;color:${t.textSoft};">Week ▾</span></div>
      <div class="cal-days"><span></span><span>MON<b>29</b></span><span>TUE<b>30</b></span><span class="today">WED<b>1</b></span><span>THU<b>2</b></span><span>FRI<b>3</b></span></div>
      <div class="cal-grid">
        ${range(10)
          .map(
            (index) => `<div class="cal-hour" style="grid-row:${index + 1};">${index + 8}:00</div>`,
          )
          .join("")}
        ${range(50)
          .map(
            (index) =>
              `<div class="cal-cell" style="grid-column:${(index % 5) + 2};grid-row:${Math.floor(index / 5) + 1};"></div>`,
          )
          .join("")}
        ${eventDivs}
      </div>`,
  };
};

archetypes["qa-question"] = (t) => ({
  widthPx: 980,
  heightPx: 700,
  css: `
    .so-top { display: flex; align-items: center; gap: 14px; padding: 10px 22px; border-bottom: 3px solid #f48225; font-size: 13px; background: ${t.surface}; }
    .so-logo { font-size: 17px; } .so-logo b { color: #f48225; }
    .so-wrap { padding: 18px 22px; }
    .so-wrap h1 { font-size: 23px; font-weight: 400; margin: 0 0 8px; }
    .so-meta { font-size: 13px; color: ${t.textSoft}; border-bottom: 1px solid ${t.border}; padding-bottom: 10px; margin-bottom: 14px; }
    .so-meta b { color: ${t.text}; font-weight: 400; }
    .so-post { display: flex; gap: 16px; }
    .so-votes { display: flex; flex-direction: column; align-items: center; gap: 6px; color: ${t.textSoft}; }
    .so-votes .arrow { width: 36px; height: 36px; border: 1px solid ${t.border}; border-radius: 50%; text-align: center; line-height: 34px; font-size: 16px; }
    .so-votes .count { font-size: 20px; }
    .so-votes .check { color: ${t.good}; font-size: 26px; }
    .so-body { flex: 1; font-size: 14px; line-height: 1.6; }
    .so-body pre { background: ${t.surfaceAlt}; border-radius: 6px; padding: 12px 14px; font-size: 13px; line-height: 20px; }
    .so-tags { margin: 12px 0; }
    .so-tags span { background: ${t.chipBg}; color: ${t.chipText}; font-size: 12px; border-radius: 4px; padding: 4px 8px; margin-right: 6px; }
    .so-author { margin-left: auto; background: ${t.chipBg}; border-radius: 6px; padding: 8px 10px; font-size: 12px; display: inline-flex; gap: 8px; align-items: center; }
    .so-answer-head { font-size: 18px; margin: 20px 0 12px; border-top: 1px solid ${t.border}; padding-top: 16px; }`,
  body: `
    <div class="so-top"><span class="so-logo">stack<b>exchange</b></span><span style="flex:1;border:1px solid ${t.border};border-radius:6px;padding:7px 12px;color:${t.textSoft};background:${t.bg};">🔍 Search…</span></div>
    <div class="so-wrap">
      <h1>Why does drawing an SVG blob URL onto canvas taint it in Chromium?</h1>
      <div class="so-meta">Asked <b>2 years ago</b> · Modified <b>3 months ago</b> · Viewed <b>48k times</b></div>
      <div class="so-post">
        <div class="so-votes"><span class="arrow">▲</span><span class="count">127</span><span class="arrow">▼</span></div>
        <div class="so-body">
          <p>I serialize a DOM subtree into an SVG with <code>foreignObject</code> and draw it on a canvas. With a <b>data URL</b> everything works, but with a <b>blob URL</b> the canvas becomes tainted and <code>toDataURL()</code> throws a SecurityError:</p>
          <pre>const url = URL.createObjectURL(svgBlob);
img.src = url; // canvas tainted after drawImage
ctx.drawImage(img, 0, 0);
canvas.toDataURL(); // SecurityError</pre>
          <p>Why are blob URLs treated differently from data URLs here?</p>
          <div class="so-tags"><span>javascript</span><span>canvas</span><span>svg</span><span>security</span></div>
          <div style="display:flex;"><div class="so-author">${avatar(3, 30, "4px")}<div><span style="color:${t.accent};">render_nerd</span><br /><b>12.4k</b> ● 34 ● 71</div></div></div>
        </div>
      </div>
      <div class="so-answer-head">2 Answers</div>
      <div class="so-post">
        <div class="so-votes"><span class="arrow">▲</span><span class="count">214</span><span class="arrow">▼</span><span class="check">✔</span></div>
        <div class="so-body"><p>This is tracked in <b>whatwg/html#10641</b>. Chromium treats SVG-in-blob as potentially able to reference other same-origin resources whose loads it cannot prove side-effect free, so it conservatively taints. Data URLs carry the entire document inline, so the load is provably self-contained — keep everything on <code>data:image/svg+xml</code> and the canvas stays origin-clean in all engines.</p></div>
      </div>
    </div>`,
});

archetypes["news-front"] = (t) => ({
  widthPx: 1100,
  heightPx: 700,
  css: `
    #target { font-family: Georgia, serif; }
    .np-mast { text-align: center; border-bottom: 3px double ${t.text}; padding: 18px 0 10px; }
    .np-mast h1 { font-size: 40px; margin: 0; letter-spacing: 2px; }
    .np-date { font-family: "Inter Fixture", sans-serif; font-size: 11px; color: ${t.textSoft}; display: flex; justify-content: space-between; padding: 6px 26px; border-bottom: 1px solid ${t.border}; }
    .np-grid { display: grid; grid-template-columns: 2fr 1.2fr 1fr; gap: 0; }
    .np-col { padding: 18px 22px; border-right: 1px solid ${t.border}; }
    .np-col:last-child { border-right: none; }
    .np-lead h2 { font-size: 30px; line-height: 1.15; margin: 0 0 8px; font-weight: 700; }
    .np-photo { height: 220px; background: url("./assets/photo-landscape.png") center / cover; margin-bottom: 8px; }
    .np-caption { font-family: "Inter Fixture", sans-serif; font-size: 11px; color: ${t.textSoft}; margin-bottom: 10px; }
    .np-col p { font-size: 14px; line-height: 1.55; margin: 0 0 10px; }
    .np-byline { font-family: "Inter Fixture", sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${t.textSoft}; margin-bottom: 6px; }
    .np-item { border-bottom: 1px solid ${t.border}; padding: 10px 0; }
    .np-item h3 { font-size: 17px; line-height: 1.25; margin: 0 0 4px; }
    .np-item p { font-size: 13px; color: ${t.textSoft}; margin: 0; }
    .np-opinion { background: ${t.surfaceAlt}; margin: -18px -22px; padding: 18px 22px; height: calc(100% + 36px); }
    .np-opinion .np-byline { color: ${t.bad}; }`,
  body: `
    <div class="np-mast"><h1>The Daily Renderer</h1></div>
    <div class="np-date"><span>VOL. CXXIV · No. 43,112</span><span>FRIDAY, JULY 3, 2026</span><span>$4.00</span></div>
    <div class="np-grid">
      <div class="np-col np-lead">
        <div class="np-byline">Browser Engines</div>
        <h2>Compositor Thread Reaches Quorum: All Major Engines Now Rasterize Off Main</h2>
        <div class="np-photo"></div>
        <div class="np-caption">Engineers watch tile rasterization telemetry at the annual layout summit. Photo: Staff</div>
        <p>After a decade of incremental architecture work, the last holdout engine moved its final paint phase off the main thread on Tuesday, closing an era in which a busy event loop could visibly stall scrolling.</p>
        <p>The change, years in the making, required untangling synchronous DOM APIs that had assumed direct access to layout state since the 1990s.</p>
      </div>
      <div class="np-col">
        <div class="np-item"><div class="np-byline">Standards</div><h3>foreignObject Turns 25, Quietly Powers a Screenshot Renaissance</h3><p>The obscure SVG element from 2001 now underpins nearly every in-browser capture tool.</p></div>
        <div class="np-item"><h3>Font Foundries Adopt Incremental Transfer by Default</h3><p>Page weights drop as subsetting moves into the protocol layer.</p></div>
        <div class="np-item"><h3>WASM GC Lands in Long-Term Support Releases</h3><p>Managed languages report 40 percent smaller binaries.</p></div>
      </div>
      <div class="np-col"><div class="np-opinion">
        <div class="np-byline">Opinion</div>
        <div class="np-item" style="border-bottom:1px solid ${t.border};"><h3>Stop Shipping Ten Megabytes of JavaScript</h3><p>A plea from your users' batteries. By the editorial board.</p></div>
        <div class="np-item" style="border-bottom:none;"><h3>In Defense of Tables for Layout</h3><p>A contrarian looks back, fondly. By M. Cascade.</p></div>
      </div></div>
    </div>`,
});

archetypes["settings-page"] = (t) => {
  const toggle = (isOn) =>
    `<span class="tgl ${isOn ? "on" : ""}"><span class="knob"></span></span>`;
  return {
    widthPx: 940,
    heightPx: 680,
    css: `
      .st-wrap { display: grid; grid-template-columns: 220px 1fr; height: 100%; }
      .st-nav { border-right: 1px solid ${t.border}; padding: 22px 14px; font-size: 14px; background: ${t.surface}; }
      .st-nav .item { padding: 7px 12px; border-radius: 8px; color: ${t.textSoft}; }
      .st-nav .item.active { background: ${t.surfaceAlt}; color: ${t.text}; font-weight: 700; }
      .st-main { padding: 26px 36px; }
      .st-main h1 { font-size: 22px; margin: 0 0 4px; }
      .st-main .sub { font-size: 13px; color: ${t.textSoft}; margin-bottom: 22px; }
      .st-group { border: 1px solid ${t.border}; border-radius: 12px; background: ${t.surface}; margin-bottom: 18px; overflow: hidden; }
      .st-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid ${t.border}; }
      .st-row:last-child { border-bottom: none; }
      .st-row .info { flex: 1; }
      .st-row .title { font-size: 14px; font-weight: 700; }
      .st-row .desc { font-size: 12.5px; color: ${t.textSoft}; margin-top: 2px; }
      .tgl { width: 40px; height: 22px; border-radius: 999px; background: ${t.border}; position: relative; flex: none; }
      .tgl.on { background: ${t.good}; }
      .tgl .knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); }
      .tgl.on .knob { left: 20px; }
      .st-select { border: 1px solid ${t.border}; border-radius: 8px; padding: 6px 12px; font-size: 13px; background: ${t.bg}; }
      .danger { color: ${t.bad}; border: 1px solid ${t.bad}; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; }`,
    body: `
      <div class="st-wrap">
        <div class="st-nav">
          <div class="item">Account</div>
          <div class="item active">Preferences</div>
          <div class="item">Notifications</div>
          <div class="item">Security</div>
          <div class="item">Billing</div>
          <div class="item">API keys</div>
        </div>
        <div class="st-main">
          <h1>Preferences</h1>
          <div class="sub">Customize how the app looks and behaves.</div>
          <div class="st-group">
            <div class="st-row"><div class="info"><div class="title">Theme</div><div class="desc">Sync with your system or pick a side.</div></div><span class="st-select">${t.isDark ? "Dark" : "Light"} ▾</span></div>
            <div class="st-row"><div class="info"><div class="title">Compact density</div><div class="desc">Show more content with tighter spacing.</div></div>${toggle(true)}</div>
            <div class="st-row"><div class="info"><div class="title">Reduce motion</div><div class="desc">Minimize animations across the interface.</div></div>${toggle(false)}</div>
          </div>
          <div class="st-group">
            <div class="st-row"><div class="info"><div class="title">Desktop notifications</div><div class="desc">Get notified when a capture batch completes.</div></div>${toggle(true)}</div>
            <div class="st-row"><div class="info"><div class="title">Weekly digest</div><div class="desc">A summary of usage and perf regressions, every Monday.</div></div>${toggle(false)}</div>
          </div>
          <span class="danger">Delete workspace</span>
        </div>
      </div>`,
  };
};

archetypes["landing-hero"] = (t) => ({
  widthPx: 1100,
  heightPx: 700,
  css: `
    #target { background: ${t.isDark ? "radial-gradient(1000px 500px at 70% -10%, #1e2a5a, #0b0d17)" : "radial-gradient(1000px 500px at 70% -10%, #dbeafe, #f8fafc)"}; }
    .lh-nav { display: flex; align-items: center; gap: 26px; padding: 20px 48px; font-size: 14px; }
    .lh-logo { font-weight: 700; font-size: 17px; }
    .lh-nav .cta { margin-left: auto; background: ${t.text}; color: ${t.bg}; border-radius: 8px; padding: 8px 16px; font-weight: 700; }
    .lh-hero { text-align: center; padding: 48px 120px 0; }
    .lh-pill { display: inline-block; font-size: 12px; font-weight: 700; border: 1px solid ${t.border}; border-radius: 999px; padding: 5px 14px; background: ${t.surface}; margin-bottom: 18px; }
    .lh-pill span { color: ${t.accent}; }
    .lh-hero h1 { font-size: 56px; letter-spacing: -2.5px; line-height: 1.05; margin: 0 0 16px; background: linear-gradient(180deg, ${t.text}, ${t.textSoft}); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .lh-hero p { font-size: 18px; color: ${t.textSoft}; max-width: 560px; margin: 0 auto 26px; line-height: 1.5; }
    .lh-btns { display: flex; gap: 12px; justify-content: center; }
    .lh-btns span { border-radius: 10px; padding: 12px 24px; font-size: 15px; font-weight: 700; }
    .lh-btns .primary { background: ${t.accent}; color: #ffffff; box-shadow: 0 8px 24px ${t.accent}55; }
    .lh-btns .ghost { border: 1px solid ${t.border}; background: ${t.surface}; }
    .lh-term { max-width: 640px; margin: 40px auto 0; border-radius: 12px 12px 0 0; background: #0d1117; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35); border: 1px solid #30363d; text-align: left; }
    .lh-term-bar { display: flex; gap: 6px; padding: 10px 14px; border-bottom: 1px solid #30363d; }
    .lh-term-bar span { width: 11px; height: 11px; border-radius: 50%; }
    .lh-term pre { margin: 0; padding: 16px 18px; color: #e6edf3; font-size: 13px; line-height: 1.7; }
    .lh-term .p { color: #7ee787; } .lh-term .c { color: #8b949e; }`,
  body: `
    <div class="lh-nav"><span class="lh-logo">⚡ fast-html-to-image</span><span>Docs</span><span>Benchmarks</span><span>Changelog</span><span class="cta">Get started</span></div>
    <div class="lh-hero">
      <div class="lh-pill">🎉 <span>v0.0.1 — now on npm</span></div>
      <h1>Screenshot the DOM.<br />Pixel-perfect. Fast.</h1>
      <p>The fastest in-browser capture engine. Computed-style memoization, raster caching, and a fidelity suite with 200+ fixtures across three engines.</p>
      <div class="lh-btns"><span class="primary">npm install fast-html-to-image</span><span class="ghost">Read the docs →</span></div>
      <div class="lh-term">
        <div class="lh-term-bar"><span style="background:#ff5f57;"></span><span style="background:#febc2e;"></span><span style="background:#28c840;"></span></div>
        <pre><span class="p">❯</span> pnpm bench
<span class="c"># 70-stress · median of 20 runs</span>
fast-html-to-image   <span class="p">89.5ms</span>
snapdom              694.6ms
modern-screenshot    1424.1ms</pre>
      </div>
    </div>`,
});

const firefoxTextMetricsArchetypes = new Set([
  "github-repo",
  "product-page",
  "pricing-tiers",
  "wiki-article",
  "streaming-rows",
  "search-results",
  "blog-article",
  "profile-page",
  "checkout-form",
  "analytics-dashboard",
  "docs-site",
  "qa-question",
  "news-front",
  "settings-page",
  "landing-hero",
]);

const fixtureIds = [];
const manifestEntries = [];
for (const [archetypeName, buildArchetype] of Object.entries(archetypes)) {
  for (const theme of Object.values(themes)) {
    const spec = buildArchetype(theme);
    const id = `site-${archetypeName}-${theme.name}`;
    const html = page(id, theme, spec.widthPx, spec.heightPx, spec.css, spec.body);
    writeFileSync(join(fixturesDir, `${id}.html`), html);
    fixtureIds.push(id);
    manifestEntries.push(
      firefoxTextMetricsArchetypes.has(archetypeName)
        ? `  {\n    id: "${id}",\n    maxDiffRatio: STRICT_MAX_DIFF_RATIO,\n    firefox: firefoxTextMetricsOverride,\n  },`
        : `  { id: "${id}", maxDiffRatio: STRICT_MAX_DIFF_RATIO },`,
    );
  }
}
console.log(`${fixtureIds.length} fixtures written`);
console.log(manifestEntries.join("\n"));
