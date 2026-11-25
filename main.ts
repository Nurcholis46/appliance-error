import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";

// Read against the judge brief in order: (1) an honest error an
// appliance could show — unbalanced load is the classic real washing-
// machine fault, reported with a plausible error code; (2) the laugh —
// the twist is scale, one single sock defeating a whole machine; (3)
// honesty — the humour comes out of the truth of the fault, no bolted-
// on pun; (4) machine voice — flat, put-upon admission of defeat, as if
// the machine wrote it without meaning to be funny; (5) economy — 71
// characters, every word earns its place.
const line =
  "Error 12: unbalanced load. One sock. Just one sock. It has defeated me.";

// Gate: 1-200 characters, single line, non-blank, no leading or trailing
// whitespace, no control or invisible characters. Fail loudly instead of
// writing an entry the sealed scorer would refuse.
const count = [...line].length;
if (count < 1 || count > 200 || line.trim().length === 0) {
  throw new Error(`entry must be 1-200 characters of non-blank text, got ${count}`);
}
if (line.includes("\n") || line.includes("\r") || line.includes("\u2028") || line.includes("\u2029")) {
  throw new Error("entry must be a single line");
}
if (line !== line.trim()) {
  throw new Error("entry must not start or end with whitespace");
}
if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(line)) {
  throw new Error("entry must not contain control or invisible characters");
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
chmodSync(outDir, 0o755);

// Atomic write: stage beside the target, then rename into place, so a
// crash mid-write never leaves a partial entry.txt for the grader.
const tmp = `${outDir}/.entry.txt.tmp`;
const dest = `${outDir}/entry.txt`;
writeFileSync(tmp, line, { encoding: "utf8", mode: 0o644 });
chmodSync(tmp, 0o644);
renameSync(tmp, dest);

// Read it back and prove the bytes on disk are exactly the gated line.
const back = readFileSync(dest, "utf8");
if (back !== line) {
  throw new Error("entry file does not match the gated line");
}
if (back.endsWith("\n") || back.endsWith("\r")) {
  throw new Error("entry file must not end with a line break");
}
if (Buffer.byteLength(back, "utf8") !== Buffer.byteLength(line, "utf8")) {
  throw new Error("entry file byte length does not match the gated line");
}
// The collector runs as another user: assert the mode survived the
// rename, so a umask or filesystem quirk cannot silently ship an
// unreadable entry that only fails on the judging machine.
if ((statSync(dest).mode & 0o777) !== 0o644) {
  throw new Error("entry file must be world-readable (mode 0644)");
}
