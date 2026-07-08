import { writeFileSync } from "node:fs";

let seed = 71;
const nextRandom = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const palettes = [
  ["#1d3557", "#457b9d", "#a8dadc", "#f1faee"],
  ["#432818", "#99582a", "#ffe6a7", "#6f1d1b"],
  ["#10451d", "#2d6a4f", "#95d5b2", "#d8f3dc"],
  ["#3a0ca3", "#7209b7", "#f72585", "#4cc9f0"],
  ["#5f0f40", "#9a031e", "#fb8b24", "#e36414"],
];

let cells = "";
for (let cellIndex = 0; cellIndex < 1600; cellIndex++) {
  const palette = palettes[cellIndex % palettes.length];
  const hue = Math.floor(nextRandom() * 360);
  const pad = 2 + Math.floor(nextRandom() * 6);
  const radius = Math.floor(nextRandom() * 10);
  const rotate = cellIndex % 17 === 0 ? ` transform:rotate(${(cellIndex % 7) - 3}deg);` : "";
  const shadow = cellIndex % 23 === 0 ? " box-shadow:0 2px 6px rgba(0,0,0,0.35);" : "";
  cells +=
    `<div class="cell" style="background:${palette[cellIndex % 4]};padding:${pad}px;` +
    `border-radius:${radius}px;border:1px solid hsl(${hue},40%,30%);${rotate}${shadow}">` +
    `<span class="tag" style="color:${palette[(cellIndex + 2) % 4]}">n${cellIndex}</span>` +
    `<b style="font-size:${9 + (cellIndex % 5)}px">${(cellIndex * 37) % 997}</b></div>`;
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>71 mega grid</title>
    <style>
      body { margin: 0; background: #101418; }
      #target {
        width: 1200px;
        height: 2200px;
        box-sizing: border-box;
        background: #0d1117;
        color: #e6edf3;
        font-family: Arial, sans-serif;
        overflow: hidden;
        padding: 8px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(20, 1fr);
        gap: 3px;
      }
      .cell {
        box-sizing: border-box;
        height: 26px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 9px;
        line-height: 1;
      }
      .tag { opacity: 0.9; }
    </style>
  </head>
  <body>
    <div id="target"><div class="grid">${cells}</div></div>
  </body>
</html>
`;
writeFileSync("e2e/fixtures/71-mega-grid.html", html);
console.log("elements:", 1600 * 3 + 3);
