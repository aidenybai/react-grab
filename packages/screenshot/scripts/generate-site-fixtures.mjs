import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "e2e", "fixtures");
mkdirSync(fixturesDir, { recursive: true });

const range = (count) => Array.from({ length: count }, (_, index) => index);

const themes = {
  light: {
    name: "light",
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

const avatarPalette = ["#d23b2e", "#2f6fdb", "#14a06c", "#7a3b8f", "#b8860b", "#0f766e", "#be185d", "#4338ca"];
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
    heightPx: 740,
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
    ["Sara Chen", "@sara_builds", "Shipped a 6x faster DOM screenshot library today. Computed-style memoization is criminally underrated.", "284", "1.2K", "98"],
    ["Dev Patel", "@devpatel", "hot take: most perf problems are just getComputedStyle in a loop", "97", "410", "23"],
    ["Mia Torres", "@miatorres", "Reading the WHATWG spec on foreignObject taint rules so you do not have to. Thread below.", "51", "220", "40"],
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
    heightPx: 760,
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
    ["Building a browser screenshot engine from scratch", "CodeStream", "812K views · 3 weeks ago", "24:31"],
    ["Why your web app is slow (and how to fix it)", "PerfLab", "1.4M views · 2 months ago", "18:02"],
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
    heightPx: 720,
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
        .map((index) => `<span style="background:linear-gradient(135deg,${avatarPalette[index]},${avatarPalette[(index + 2) % 8]});"></span>`)
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
    ["Hobby", "$0", "For side projects", ["1 project", "10K captures/mo", "Community support"], false],
    ["Pro", "$29", "For growing teams", ["Unlimited projects", "1M captures/mo", "Priority support", "Custom fonts", "SLA 99.9%"], true],
    ["Enterprise", "Custom", "For large orgs", ["Dedicated infra", "SSO / SAML", "Audit logs", "99.99% SLA"], false],
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
  heightPx: 760,
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
    ["Show HN: I made a DOM screenshot library 6x faster than snapdom", "github.com/aidenybai", 412, 187],
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
      #target { background: ${t.name === "dark" ? "#1a1a10" : "#f6f6ef"}; }
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
    heightPx: 740,
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
    ["GitHub", "[react-grab] PR #523: screenshot — CI passed", "All 18 checks have passed on screenshot-new.", "5:12 AM", true, false],
    ["Vercel", "Deployment ready: react-grab-website", "Your production deployment is now live.", "4:48 AM", true, true],
    ["Linear", "12 issues assigned to you in Cycle 14", "Capture pipeline hardening, WebKit raster quirks…", "Yesterday", false, false],
    ["Stripe", "Your invoice for June is available", "Amount due: $290.00 — auto-pay scheduled.", "Yesterday", false, false],
    ["npm", "Package published: fast-html-to-image@0.0.1", "You published a new package version.", "Jul 1", false, true],
    ["Datadog", "[P2] Latency alert resolved: capture-api", "p95 back under 120ms after 14 minutes.", "Jul 1", false, false],
    ["Figma", "Mia left 4 comments in 'Landing v3'", "Can we make the hero CTA pop more?", "Jun 30", false, false],
    ["Calendly", "Reminder: perf review tomorrow 10:00", "You have an upcoming meeting.", "Jun 30", false, false],
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
      .gm-nav div.item.active { background: ${t.name === "dark" ? "#3c2b1e" : "#fce8e6"}; font-weight: 700; }
      .gm-nav div.item span { float: right; font-size: 12px; color: ${t.textSoft}; }
      .mail { display: flex; align-items: center; gap: 10px; padding: 9px 16px; border-bottom: 1px solid ${t.border}; font-size: 13px; background: ${t.name === "dark" ? "#10151c" : "#f2f6fc"}; }
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
    [0, "aiden", "9:04 AM", "prototype-delegated style maps + reusing the encoded PNG when markup hash matches. the spread of ~340 props per memo hit was pure GC churn"],
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
      .sl-side { background: ${t.name === "dark" ? "#19171d" : "#3f0e40"}; color: #ffffff; padding: 14px 0; font-size: 14px; }
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
    ["Backlog", ["Firefox settle-frame skip regression check", "Investigate AVIF output option", "Iframe bridge timeout tuning"], "#8590a2"],
    ["In Progress", ["Prototype-delegated style maps", "Site fixture generator (50 pages)"], "#2f6fdb"],
    ["In Review", ["Minimal-escape SVG data URLs", "Animated memo grid fixture"], "#b8860b"],
    ["Done", ["PNG raster cache", "Memoized diff-cache", "Baseline probe batching", "Uint8Array base64 fast path"], "#14a06c"],
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
      .kb-col { width: 258px; background: ${t.name === "dark" ? "#101204" : "#f1f2f4"}; color: ${t.name === "dark" ? "#b6c2cf" : "#172b4d"}; border-radius: 12px; padding: 10px; }
      .kb-col-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; padding: 4px 6px 10px; }
      .kb-dot { width: 10px; height: 10px; border-radius: 50%; }
      .kb-count { margin-left: auto; font-weight: 400; font-size: 12px; opacity: 0.7; }
      .kb-card { background: ${t.name === "dark" ? "#22272b" : "#ffffff"}; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.4; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(9, 30, 66, 0.25); }
      .kb-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
      .kb-tag { font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 6px; }
      .kb-add { font-size: 13px; opacity: 0.7; padding: 6px; }`,
    body: `
      <div class="kb-top">Capture Engine Roadmap <span class="badge">Board</span><span class="badge">Private</span><span style="margin-left:auto;display:flex;">${avatar(0, 26)}${avatar(1, 26)}${avatar(2, 26)}</span></div>
      <div class="kb-cols">${cols}</div>`,
  };
};
