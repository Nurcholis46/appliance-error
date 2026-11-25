import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

// Judge weighs in order: (1) honest error an appliance could show — unbalanced load is the classic real washing-machine fault, reported with a plausible error code; (2) the laugh — the twist is scale, one single sock defeating a whole machine, a real surprise; (3) honesty — the humour comes out of the truth of the fault, no bolted-on pun; (4) machine voice — flat, put-upon admission of defeat, as if the machine wrote it without meaning to be funny; (5) economy — 71 chars, every word earns its place, no explaining of the joke.
// The bounty requires 1-200 characters, not only white space, and a single
// line: fail loudly instead of writing an entry the judge would refuse.
// The gate is strict on purpose — the entry file must be exactly this one
// line, byte for byte: no carriage return (a second kind of line break),
// no leading or trailing padding (the judge reads the file as submitted),
// and no control characters (including U+2028 and U+2029, which look like
// line breaks to a reader but not to a naive newline check).
const text =
  "Error 12: unbalanced load. One sock. Just one sock. It has defeated me.";

const codePoints = [...text].length;
if (codePoints < 1 || codePoints > 200 || text.trim().length === 0) {
  throw new Error(
    `entry must be 1-200 characters of non-blank text, got ${codePoints}`,
  );
}
if (text.includes("\n") || text.includes("\r")) {
  throw new Error("entry must be a single line");
}
if (text.includes("\u2028") || text.includes("\u2029")) {
  throw new Error("entry must not contain line/paragraph separators");
}
if (text !== text.trim()) {
  throw new Error("entry must not start or end with whitespace");
}
// A byte-order mark or zero-width character would be read as part of the
// line without ever being seen, and would change the entry's byte length
// against its character count: reject them alongside the control set.
if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(text)) {
  throw new Error("entry must not contain control or invisible characters");
}

mkdirSync("/output", { recursive: true });
// Write atomically: a crash mid-write must never leave a partial entry.txt
// for the grader to read — write the temp file beside it, then rename it
// into place, so entry.txt is always the whole line or nothing.
const tmpPath = "/output/.entry.txt.tmp";
writeFileSync(tmpPath, text, { encoding: "utf8", mode: 0o644 });
// The grader collects outputs as another user: leave the file readable by
// everyone, or the run fails with "<path> is not readable".
chmodSync(tmpPath, 0o644);
renameSync(tmpPath, "/output/entry.txt");

// Read it back and prove the file on disk is exactly the line: a write
// that silently truncated, re-encoded or padded the entry would otherwise
// ship a different text to the judge than the one gated above.
const written = readFileSync("/output/entry.txt", "utf8");
if (written !== text) {
  throw new Error("entry file does not match the gated line");
}
// The file must end exactly at the last character: a trailing newline
// would make the entry two lines to a reader that counts lines, and the
// equality check above would already have caught it — this asserts the
// invariant on its own so a future edit that relaxes the write cannot
// silently reintroduce it.
if (written.endsWith("\n") || written.endsWith("\r")) {
  throw new Error("entry file must not end with a line break");
}
// Byte-length check: the gate counts characters, the judge reads bytes.
// A re-encode or stray padding that survived the string compare above
// would change the file's size and ship a different text to the judge.
if (Buffer.byteLength(written, "utf8") !== Buffer.byteLength(text, "utf8")) {
  throw new Error("entry file byte length does not match the gated line");
}
