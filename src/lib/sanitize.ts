// Pure string-sanitization helpers. No deps, safe everywhere. Used to neutralize
// user-controlled input before it reaches logs (risk #4) or Firestore (risk #3).

// Matches C0 control characters (U+0000-U+001F: includes newline/tab/CR) plus
// DEL (U+007F). Built from a string so no literal control chars live in source.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

/** Remove control characters. Prevents log-line injection/forgery and malformed
 *  stored strings without touching ordinary printable/Unicode text. */
export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, "");
}

/** Cap a string to `maxLen` characters. */
export function clampText(input: string, maxLen: number): string {
  return input.length > maxLen ? input.slice(0, maxLen) : input;
}
