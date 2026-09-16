// Run after: pnpm build --manifest
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const root = new URL("../", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "winamp-check-"));
try {
  await copyFile(new URL("scripts/require-pnpm.mjs", root), join(temporary, "require-pnpm.mjs"));
  for (const agent of ["pnpm/11.10.0 npm/? node/v22.22.1", "npm/11.0.0", "yarn/1.22.22", "bun/1.3.0", ""]) {
    const result = spawnSync(process.execPath, ["require-pnpm.mjs"], {
      cwd: temporary, encoding: "utf8", env: { ...process.env, npm_config_user_agent: agent },
    });
    assert.equal(result.status, agent.startsWith("pnpm/") ? 0 : 1, agent);
    if (!agent.startsWith("pnpm/")) assert.match(result.stderr, /Use pnpm install\./);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const html = await readFile(new URL("dist/index.html", root), "utf8");
assert.ok(html.includes(`<title>${pkg.name}</title>`));
assert.ok(html.includes(`name="description" content="${pkg.description}"`));
assert.ok(html.includes(`name="author" content="${pkg.author}"`));
assert.match(html, /name="twitter:card" content="summary"/);
assert.match(html, /property="og:image:width" content="2000"/);
assert.match(html, /rel="icon" type="image\/png"/);

const manifest = JSON.parse(await readFile(new URL("dist/.vite/manifest.json", root), "utf8"));
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
const reachable = (key, seen = new Set()) => {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dependency of manifest[key].imports ?? []) reachable(dependency, seen);
  return seen;
};
const editor = Object.keys(manifest).find((key) => key === "src/features/editor/index.ts");
const runner = Object.keys(manifest).find((key) => key.endsWith("/runExport.ts"));
assert.ok(editor && runner, "Editor and export runner must be separate chunks");
const initial = reachable(entry);
assert.ok(!initial.has(editor) && !initial.has(runner));
assert.ok(!reachable(editor).has(runner), "Editor must not eagerly load exports");
for (const key of initial) {
  const code = await readFile(new URL(`dist/${manifest[key].file}`, root), "utf8");
  assert.ok(!code.includes("browserIsSupported"), "Webamp must stay outside the initial graph");
}

const originalURL = process.env.VITE_SITE_URL;
const metadataCache = await mkdtemp(join(tmpdir(), "winamp-metadata-"));
const metadataServer = {
  cacheDir: metadataCache,
  logLevel: "silent",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
};
try {
  for (const site of ["", "https://example.com/", "not-a-url", "javascript:alert(1)", "https://user:secret@example.com/"]) {
    process.env.VITE_SITE_URL = site;
    let server;
    try {
      if (site && site !== "https://example.com/") {
        await assert.rejects(createServer(metadataServer), /VITE_SITE_URL/);
        continue;
      }
      server = await createServer(metadataServer);
      const rendered = await server.transformIndexHtml("/", await readFile(new URL("index.html", root), "utf8"));
      if (site) {
        assert.match(rendered, /property="og:url" content="https:\/\/example.com\/"/);
        assert.match(rendered, /rel="canonical" href="https:\/\/example.com\/"/);
        assert.equal((rendered.match(/content="https:\/\/example.com\/images\/logo.png"/g) ?? []).length, 2);
      } else {
        assert.ok(!rendered.includes('rel="canonical"') && !rendered.includes('property="og:url"'));
        assert.equal((rendered.match(/content="\/images\/logo.png"/g) ?? []).length, 2);
      }
    } finally {
      await server?.close();
    }
  }
} finally {
  if (originalURL === undefined) delete process.env.VITE_SITE_URL;
  else process.env.VITE_SITE_URL = originalURL;
  await rm(metadataCache, { recursive: true, force: true });
}
console.log("Passed: pnpm guard, metadata, site URL validation, and lazy chunk boundaries.");
