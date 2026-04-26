import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  detectInstalledSkillClients,
  getSkillClientNames,
  getSkillClients,
  installDetectedOrAllSkills,
  installSkills,
  removeSkillFile,
  removeSkills,
  resolveSkillRoot,
  type SkillClientDefinition,
  writeSkillFile,
} from "../src/utils/install-skill.js";
import {
  CANONICAL_AGENTS_DIR,
  CANONICAL_SKILLS_SUBDIR,
  SKILL_NAME,
} from "../src/utils/constants.js";
import { SKILL_TEMPLATE } from "../src/utils/skill-template.js";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "install-skill-test-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

const findClient = (name: string): SkillClientDefinition => {
  const client = getSkillClients().find((entry) => entry.name === name);
  if (!client) throw new Error(`expected client ${name} in getSkillClients`);
  return client;
};

describe("getSkillClients", () => {
  it("flags Cursor, Codex, OpenCode as universal sharing canonical .agents/skills", () => {
    const universalNames = ["Cursor", "Codex", "OpenCode"];
    for (const name of universalNames) {
      const client = findClient(name);
      expect(client.universal).toBe(true);
      expect(client.projectRoot).toBe(`${CANONICAL_AGENTS_DIR}/${CANONICAL_SKILLS_SUBDIR}`);
      expect(client.globalRoot).toBe(
        path.join(os.homedir(), CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR),
      );
    }
  });

  it("flags Claude Code as non-universal with .claude paths", () => {
    const claudeCode = findClient("Claude Code");
    expect(claudeCode.universal).toBe(false);
    expect(claudeCode.projectRoot).toBe(".claude/skills");
    expect(claudeCode.globalRoot).toContain(".claude");
    expect(claudeCode.globalRoot).toContain("skills");
  });

  it("includes additional universal agents (Amp, Cline, Gemini CLI, GitHub Copilot, Warp)", () => {
    const universalAdditions = ["Amp", "Cline", "Gemini CLI", "GitHub Copilot", "Warp"];
    for (const name of universalAdditions) {
      const client = findClient(name);
      expect(client.universal).toBe(true);
      expect(client.supported).toBe(true);
    }
  });

  it("flags VS Code, Zed as unsupported with reasons", () => {
    const unsupported = getSkillClients().filter((client) => !client.supported);
    const names = unsupported.map((client) => client.name);
    expect(names).toEqual(expect.arrayContaining(["VS Code", "Zed"]));
    for (const client of unsupported) {
      expect(client.unsupportedReason).toBeTruthy();
      expect(client.projectRoot).toBeNull();
      expect(client.globalRoot).toBeNull();
    }
  });
});

describe("getSkillClientNames", () => {
  it("returns at least the legacy 4 plus the universal additions", () => {
    const names = getSkillClientNames();
    expect(names).toContain("Claude Code");
    expect(names).toContain("Cursor");
    expect(names).toContain("Codex");
    expect(names).toContain("OpenCode");
    expect(names).toContain("Amp");
    expect(names).toContain("Cline");
  });
});

describe("resolveSkillRoot", () => {
  it("resolves universal project to <cwd>/.agents/skills", () => {
    const cursor = findClient("Cursor");
    expect(resolveSkillRoot(cursor, "project", tempDir)).toBe(
      path.resolve(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR),
    );
  });

  it("resolves universal global to ~/.agents/skills (not the per-agent global)", () => {
    const cursor = findClient("Cursor");
    expect(resolveSkillRoot(cursor, "global", tempDir)).toBe(
      path.join(os.homedir(), CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR),
    );
  });

  it("resolves Claude Code project to <cwd>/.claude/skills", () => {
    const claudeCode = findClient("Claude Code");
    expect(resolveSkillRoot(claudeCode, "project", tempDir)).toBe(
      path.resolve(tempDir, ".claude", "skills"),
    );
  });

  it("returns null for unsupported clients regardless of scope", () => {
    const zed = findClient("Zed");
    expect(resolveSkillRoot(zed, "global", tempDir)).toBeNull();
    expect(resolveSkillRoot(zed, "project", tempDir)).toBeNull();
  });
});

describe("installSkills", () => {
  it("dedups writes when multiple universal agents share the canonical project root", () => {
    const results = installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor", "Codex", "OpenCode"],
    });

    const successes = results.filter((result) => result.success);
    expect(successes).toHaveLength(3);
    expect(successes.filter((result) => result.deduped)).toHaveLength(2);

    const canonical = path.join(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR);
    expect(fs.existsSync(path.join(canonical, SKILL_NAME, "SKILL.md"))).toBe(true);
    // Should NOT have written to per-agent dirs
    expect(fs.existsSync(path.join(tempDir, ".cursor", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, ".codex", "skills"))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, ".opencode", "skills"))).toBe(false);
  });

  it("writes a separate file for non-universal Claude Code", () => {
    installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor", "Claude Code"],
    });

    const canonical = path.join(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR);
    const claudePath = path.join(tempDir, ".claude", "skills");
    expect(fs.existsSync(path.join(canonical, SKILL_NAME, "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(claudePath, SKILL_NAME, "SKILL.md"))).toBe(true);
  });

  it("rewrites a stale skill file (different content) on every run", () => {
    const skillFilePath = path.join(
      tempDir,
      CANONICAL_AGENTS_DIR,
      CANONICAL_SKILLS_SUBDIR,
      SKILL_NAME,
      "SKILL.md",
    );
    fs.mkdirSync(path.dirname(skillFilePath), { recursive: true });
    fs.writeFileSync(skillFilePath, "stale-content\n");

    installSkills({ scope: "project", cwd: tempDir, selectedClients: ["Cursor"] });
    expect(fs.readFileSync(skillFilePath, "utf8")).toBe(SKILL_TEMPLATE);

    // Re-run also writes (no TOCTOU optimization), but content stays canonical.
    installSkills({ scope: "project", cwd: tempDir, selectedClients: ["Cursor"] });
    expect(fs.readFileSync(skillFilePath, "utf8")).toBe(SKILL_TEMPLATE);
  });

  it("returns skipped results for unsupported clients without writing", () => {
    const results = installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["VS Code"],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.skipped).toBe(true);
    expect(results[0]?.error).toContain("VS Code");
  });
});

describe("writeSkillFile", () => {
  it("creates a SKILL.md file at <skillRoot>/<SKILL_NAME>/SKILL.md", () => {
    const skillRoot = path.join(tempDir, "skill-home");
    const skillPath = writeSkillFile(skillRoot);
    expect(skillPath).toBe(path.join(skillRoot, SKILL_NAME, "SKILL.md"));
    expect(fs.existsSync(skillPath)).toBe(true);
    expect(fs.readFileSync(skillPath, "utf8")).toBe(SKILL_TEMPLATE);
  });

  it("creates nested directories if they do not exist", () => {
    const skillRoot = path.join(tempDir, "deep", "nested", "skill-home");
    const skillPath = writeSkillFile(skillRoot);
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it("overwrites an existing SKILL.md", () => {
    const skillRoot = path.join(tempDir, "skill-home");
    fs.mkdirSync(path.join(skillRoot, SKILL_NAME), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, SKILL_NAME, "SKILL.md"), "old content");

    const skillPath = writeSkillFile(skillRoot);
    expect(fs.readFileSync(skillPath, "utf8")).toBe(SKILL_TEMPLATE);
  });
});

describe("removeSkillFile", () => {
  it("returns false when the skill directory does not exist", () => {
    expect(removeSkillFile(path.join(tempDir, "missing"))).toBe(false);
  });

  it("returns true and deletes the directory when present", () => {
    const skillRoot = path.join(tempDir, "skill-home");
    writeSkillFile(skillRoot);
    expect(removeSkillFile(skillRoot)).toBe(true);
    expect(fs.existsSync(path.join(skillRoot, SKILL_NAME))).toBe(false);
  });
});

describe("detectInstalledSkillClients", () => {
  let homeBackup: string | undefined;
  let claudeBackup: string | undefined;
  let codexBackup: string | undefined;
  let xdgBackup: string | undefined;

  beforeEach(() => {
    homeBackup = process.env.HOME;
    claudeBackup = process.env.CLAUDE_CONFIG_DIR;
    codexBackup = process.env.CODEX_HOME;
    xdgBackup = process.env.XDG_CONFIG_HOME;
    process.env.HOME = tempDir;
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CODEX_HOME;
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    if (homeBackup === undefined) delete process.env.HOME;
    else process.env.HOME = homeBackup;
    if (claudeBackup === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = claudeBackup;
    if (codexBackup === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = codexBackup;
    if (xdgBackup === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = xdgBackup;
  });

  it("returns empty when no agent dirs exist under HOME", () => {
    expect(detectInstalledSkillClients()).toEqual([]);
  });

  it("detects Cursor when ~/.cursor exists", () => {
    fs.mkdirSync(path.join(tempDir, ".cursor"));
    expect(detectInstalledSkillClients()).toEqual(["Cursor"]);
  });

  it("detects Cursor and Claude Code when both home dirs exist", () => {
    fs.mkdirSync(path.join(tempDir, ".cursor"));
    fs.mkdirSync(path.join(tempDir, ".claude"));
    const detected = detectInstalledSkillClients();
    expect(detected).toContain("Cursor");
    expect(detected).toContain("Claude Code");
  });

  it("honors CODEX_HOME env override", () => {
    const customCodex = path.join(tempDir, "custom-codex");
    fs.mkdirSync(customCodex);
    process.env.CODEX_HOME = customCodex;
    expect(detectInstalledSkillClients()).toContain("Codex");
  });

  it("honors CLAUDE_CONFIG_DIR env override", () => {
    const customClaude = path.join(tempDir, "custom-claude");
    fs.mkdirSync(customClaude);
    process.env.CLAUDE_CONFIG_DIR = customClaude;
    expect(detectInstalledSkillClients()).toContain("Claude Code");
  });

  it("honors XDG_CONFIG_HOME for OpenCode detection", () => {
    const customXdg = path.join(tempDir, "custom-xdg");
    fs.mkdirSync(path.join(customXdg, "opencode"), { recursive: true });
    process.env.XDG_CONFIG_HOME = customXdg;
    expect(detectInstalledSkillClients()).toContain("OpenCode");
  });

  it("does not include unsupported clients (VS Code, Zed) regardless of detection", () => {
    expect(detectInstalledSkillClients()).not.toContain("VS Code");
    expect(detectInstalledSkillClients()).not.toContain("Zed");
  });
});

describe("installDetectedOrAllSkills", () => {
  let homeBackup: string | undefined;

  beforeEach(() => {
    homeBackup = process.env.HOME;
    process.env.HOME = tempDir;
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CODEX_HOME;
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    if (homeBackup === undefined) delete process.env.HOME;
    else process.env.HOME = homeBackup;
  });

  it("installs to detected agents when at least one is detected", () => {
    fs.mkdirSync(path.join(tempDir, ".cursor"));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "iorall-cwd-"));
    try {
      const results = installDetectedOrAllSkills("project", cwd);
      const successes = results.filter((r) => r.success);
      expect(successes.map((r) => r.client)).toEqual(["Cursor"]);
      expect(
        fs.existsSync(
          path.join(cwd, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR, SKILL_NAME, "SKILL.md"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("falls back to all supported agents when nothing is detected", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "iorall-cwd-"));
    try {
      const results = installDetectedOrAllSkills("project", cwd);
      const successes = results.filter((r) => r.success);
      expect(successes.length).toBeGreaterThan(1);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});

describe("installSkills with no selectedClients", () => {
  it("installs to every supported client (project scope)", () => {
    const results = installSkills({ scope: "project", cwd: tempDir });
    const supportedCount = getSkillClients().filter((c) => c.supported).length;
    expect(results.filter((r) => r.success)).toHaveLength(supportedCount);
    expect(results.filter((r) => r.skipped)).toHaveLength(
      getSkillClients().filter((c) => !c.supported).length,
    );
  });
});

describe("removeSkills", () => {
  it("removes ALL universal agents only when ALL of them are targeted (full canonical wipe)", () => {
    installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor", "Codex", "OpenCode"],
    });

    const universalSupportedNames = getSkillClients()
      .filter((c) => c.supported && c.universal)
      .map((c) => c.name);
    const results = removeSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: universalSupportedNames,
    });

    expect(results).toHaveLength(universalSupportedNames.length);
    expect(results.filter((r) => r.removed)).toHaveLength(1);
    const dedupedResults = results.filter((r) => r.deduped);
    expect(dedupedResults).toHaveLength(universalSupportedNames.length - 1);
    expect(
      fs.existsSync(path.join(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR, SKILL_NAME)),
    ).toBe(false);
  });

  it("refuses to delete a shared canonical file when other universal agents still need it", () => {
    installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor", "Codex", "OpenCode"],
    });

    // Only target Cursor - Codex, OpenCode and other universal agents still
    // share the same .agents/skills file and should keep it.
    const results = removeSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.removed).toBe(false);
    expect(results[0]?.sharedWith).toEqual(expect.arrayContaining(["Codex", "OpenCode"]));
    // File must still exist - other agents are still using it.
    expect(
      fs.existsSync(
        path.join(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR, SKILL_NAME, "SKILL.md"),
      ),
    ).toBe(true);
  });

  it("removes a non-universal agent's own file without touching the shared canonical", () => {
    installSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Cursor", "Claude Code"],
    });

    const results = removeSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Claude Code"],
    });

    expect(results[0]?.removed).toBe(true);
    // Claude Code's path goes away.
    expect(fs.existsSync(path.join(tempDir, ".claude", "skills", SKILL_NAME))).toBe(false);
    // Shared canonical stays.
    expect(
      fs.existsSync(path.join(tempDir, CANONICAL_AGENTS_DIR, CANONICAL_SKILLS_SUBDIR, SKILL_NAME)),
    ).toBe(true);
  });

  it("returns removed: false (not deduped, not sharedWith) when nothing was installed", () => {
    const results = removeSkills({
      scope: "project",
      cwd: tempDir,
      selectedClients: ["Claude Code"],
    });
    expect(results[0]?.removed).toBe(false);
    expect(results[0]?.deduped).toBeUndefined();
    expect(results[0]?.sharedWith).toBeUndefined();
  });
});

describe("SKILL_TEMPLATE", () => {
  it("starts with valid YAML frontmatter naming the skill", () => {
    expect(SKILL_TEMPLATE.startsWith("---\n")).toBe(true);
    expect(SKILL_TEMPLATE).toContain(`name: ${SKILL_NAME}`);
  });

  it("declares Bash in allowed-tools", () => {
    expect(SKILL_TEMPLATE).toMatch(/allowed-tools:\s*\n\s*-\s*Bash/);
  });

  it("instructs the agent to run the watch CLI", () => {
    expect(SKILL_TEMPLATE).toContain("npx -y @react-grab/cli watch");
  });

  it("warns the agent against running watch on already-pasted content", () => {
    expect(SKILL_TEMPLATE).toMatch(/already pasted/i);
    expect(SKILL_TEMPLATE).toMatch(/do NOT run this skill/i);
  });
});
