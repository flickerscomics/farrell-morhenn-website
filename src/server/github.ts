// Reads and commits the site's files through a GitHub App installed only on
// this repository. Every commit names the repository owner as author and
// committer, so changes are attributed to the owner's account.

export interface RepoFile {
  path: string;
  sha: string;
  text: string;
}

export interface RepoEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

/** What the admin service needs from the repository. Tests use an in-memory version. */
export interface Repo {
  read(path: string): Promise<RepoFile | null>;
  list(dir: string): Promise<RepoEntry[]>;
  /** Creates or updates a file. Pass the sha you read to update; omit it to create. */
  write(path: string, base64: string, message: string, sha?: string): Promise<{ sha: string }>;
  remove(path: string, sha: string, message: string): Promise<void>;
  /** Saves several text files (null deletes one) in a single commit, so the site rebuilds once. */
  commitFiles(files: { path: string; text: string | null }[], message: string): Promise<void>;
}

/** The file changed (or appeared) since it was read. */
export class ConflictError extends Error {}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function textToBase64(text: string): string {
  return bytesToBase64(encoder.encode(text));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
}

export function base64ToText(b64: string): string {
  return decoder.decode(base64ToBytes(b64));
}

// ─── App authentication ────────────────────────────────────────────────────

function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  const bytes: number[] = [];
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

/** GitHub issues PKCS#1 keys ("BEGIN RSA PRIVATE KEY"); Web Crypto needs PKCS#8. */
export function pemToPkcs8(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  const der = base64ToBytes(body);
  if (pem.includes("BEGIN PRIVATE KEY")) return der;
  const algorithm = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLength(der.length), ...der];
  const inner = [0x02, 0x01, 0x00, ...algorithm, ...octet];
  return Uint8Array.from([0x30, ...derLength(inner.length), ...inner]);
}

function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? encoder.encode(bytes) : bytes;
  return bytesToBase64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function appJwt(appId: string, privateKeyPem: string, now = Date.now()): Promise<string> {
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(privateKeyPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const iat = Math.floor(now / 1000) - 60;
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iat, exp: iat + 540, iss: appId }))}`;
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

export interface GitHubConfig {
  appId: string;
  installationId: string;
  privateKey: string;
  repo: string; // owner/name
  branch: string;
  authorName: string;
  authorEmail: string;
}

let cachedToken: { token: string; expires: number; installation: string } | null = null;

export class GitHubRepo implements Repo {
  constructor(private cfg: GitHubConfig) {}

  private async token(): Promise<string> {
    if (cachedToken && cachedToken.installation === this.cfg.installationId && cachedToken.expires - Date.now() > 5 * 60_000) return cachedToken.token;
    const jwt = await appJwt(this.cfg.appId, this.cfg.privateKey);
    const res = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(this.cfg.installationId)}/access_tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "farrell-morhenn-admin" },
    });
    if (!res.ok) throw new Error(`GitHub app sign-in failed (${res.status})`);
    const data = (await res.json()) as { token: string; expires_at: string };
    cachedToken = { token: data.token, expires: Date.parse(data.expires_at), installation: this.cfg.installationId };
    return data.token;
  }

  private url(path: string) {
    const clean = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${this.cfg.repo}/contents/${clean}`;
  }

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "farrell-morhenn-admin",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  }

  async read(path: string): Promise<RepoFile | null> {
    const res = await this.call(`${this.url(path)}?ref=${encodeURIComponent(this.cfg.branch)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Couldn't read ${path} from GitHub (${res.status})`);
    const data = (await res.json()) as { type: string; content?: string; sha: string };
    if (data.type !== "file" || typeof data.content !== "string") return null;
    return { path, sha: data.sha, text: base64ToText(data.content) };
  }

  async list(dir: string): Promise<RepoEntry[]> {
    const res = await this.call(`${this.url(dir)}?ref=${encodeURIComponent(this.cfg.branch)}`);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Couldn't list ${dir} on GitHub (${res.status})`);
    const data = (await res.json()) as RepoEntry[];
    return Array.isArray(data) ? data.map(({ name, path, sha, type }) => ({ name, path, sha, type })) : [];
  }

  private person() {
    return { name: this.cfg.authorName, email: this.cfg.authorEmail };
  }

  async write(path: string, base64: string, message: string, sha?: string): Promise<{ sha: string }> {
    const res = await this.call(this.url(path), {
      method: "PUT",
      body: JSON.stringify({ message, content: base64, branch: this.cfg.branch, author: this.person(), committer: this.person(), ...(sha ? { sha } : {}) }),
    });
    if (res.status === 409 || res.status === 422) throw new ConflictError(path);
    if (!res.ok) throw new Error(`Couldn't save ${path} to GitHub (${res.status})`);
    const data = (await res.json()) as { content: { sha: string } };
    return { sha: data.content.sha };
  }

  async commitFiles(files: { path: string; text: string | null }[], message: string): Promise<void> {
    const repo = `https://api.github.com/repos/${this.cfg.repo}/git`;
    const branch = encodeURIComponent(this.cfg.branch);
    const ok = async (res: Response, what: string) => {
      if (res.status === 409 || res.status === 422) throw new ConflictError(what);
      if (!res.ok) throw new Error(`Couldn't ${what} on GitHub (${res.status})`);
      return res.json() as Promise<Record<string, unknown>>;
    };
    const ref = (await ok(await this.call(`${repo}/ref/heads/${branch}`), "read the branch")) as { object: { sha: string } };
    const head = (await ok(await this.call(`${repo}/commits/${ref.object.sha}`), "read the latest commit")) as { tree: { sha: string } };
    const tree = (await ok(
      await this.call(`${repo}/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", ...(f.text === null ? { sha: null } : { content: f.text }) })),
        }),
      }),
      "prepare the changes",
    )) as { sha: string };
    const commit = (await ok(
      await this.call(`${repo}/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha], author: this.person(), committer: this.person() }),
      }),
      "save the changes",
    )) as { sha: string };
    await ok(await this.call(`${repo}/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) }), "publish the changes");
  }

  async remove(path: string, sha: string, message: string): Promise<void> {
    const res = await this.call(this.url(path), {
      method: "DELETE",
      body: JSON.stringify({ message, sha, branch: this.cfg.branch, author: this.person(), committer: this.person() }),
    });
    if (res.status === 409 || res.status === 422) throw new ConflictError(path);
    if (!res.ok && res.status !== 404) throw new Error(`Couldn't delete ${path} on GitHub (${res.status})`);
  }
}
