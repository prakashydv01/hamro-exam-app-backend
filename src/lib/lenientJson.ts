/**
 * JSON.parse that tolerates un-doubled LaTeX backslashes.
 *
 * Strict JSON needs "\\frac{1}{2}" - and "\frac" silently becomes a
 * form-feed + "rac", "\theta" becomes a TAB + "heta", "\sqrt" is a hard
 * syntax error. People pasting math will forget to double every backslash,
 * so inside string literals we repair them before parsing:
 *
 *   \\          kept (already an escaped backslash)
 *   \" \/       kept (valid JSON escapes)
 *   \uXXXX      kept (4 hex digits = real unicode escape)
 *   \n \t ...   kept as JSON escapes UNLESS the letters that follow form a
 *               known LaTeX command (\neq, \theta, \frac, \right, \beta...)
 *   anything else (\sqrt \alpha \( \, \{ ...) -> backslash doubled
 */

// Commands starting with b/f/n/r/t, i.e. the ones that collide with JSON escapes.
const COLLIDING_COMMANDS = new Set([
  // b
  'beta', 'bar', 'begin', 'beth', 'big', 'bigcap', 'bigcirc', 'bigcup', 'bigg', 'biggl', 'biggr', 'bigl', 'bigr',
  'bigvee', 'bigwedge', 'binom', 'boldsymbol', 'bot', 'bowtie', 'box', 'bullet', 'because', 'backslash', 'bmod',
  'bf', 'breve',
  // f
  'frac', 'dfrac', 'tfrac', 'forall', 'frown', 'flat', 'fbox', 'foo',
  // n
  'neq', 'ne', 'nu', 'nabla', 'not', 'notin', 'ni', 'newline', 'nless', 'ngtr', 'nleq', 'ngeq', 'nsubseteq',
  'nmid', 'nparallel', 'neg', 'natural', 'nearrow', 'nwarrow', 'nrightarrow', 'nleftarrow', 'normalsize',
  'nolimits', 'nonumber', 'ncong', 'nsim', 'nexists', 'ni', 'nRightarrow', 'nLeftarrow',
  // r
  'rho', 'right', 'rangle', 'rightarrow', 'Rightarrow', 'rightleftharpoons', 'rfloor', 'rceil', 'rbrace',
  'rbrack', 'rm', 'rule', 'raisebox', 'rightharpoonup', 'real', 'Re',
  // t
  'theta', 'Theta', 'times', 'text', 'textbf', 'textit', 'textrm', 'textsf', 'texttt', 'tan', 'tanh', 'tau',
  'tilde', 'therefore', 'to', 'top', 'triangle', 'triangleleft', 'triangleright', 'tiny', 'tag', 'thinspace',
  'thickspace', 'tbinom', 'text', 'tfrac',
]);

export function repairLatexBackslashes(src: string): string {
  let out = '';
  let inString = false;
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      i++;
      continue;
    }

    // inside a string literal
    if (ch === '"') {
      inString = false;
      out += ch;
      i++;
      continue;
    }

    if (ch !== '\\') {
      out += ch;
      i++;
      continue;
    }

    const next = src[i + 1];
    if (next === undefined) {
      out += '\\\\';
      i++;
      continue;
    }

    // Already-escaped pair, quote or slash: keep both characters as written.
    if (next === '\\' || next === '"' || next === '/') {
      out += ch + next;
      i += 2;
      continue;
    }

    // Real unicode escape
    if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
      out += src.slice(i, i + 6);
      i += 6;
      continue;
    }

    // b f n r t: JSON escape or LaTeX command? Look at the whole letter run.
    if ('bfnrt'.includes(next)) {
      const run = /^[A-Za-z]+/.exec(src.slice(i + 1))![0];
      if (COLLIDING_COMMANDS.has(run)) {
        out += '\\\\';
        i += 1;
        continue;
      }
      out += ch + next; // genuine \n, \t, ...
      i += 2;
      continue;
    }

    // Anything else is not a valid JSON escape -> must be LaTeX; double it.
    out += '\\\\';
    i += 1;
  }

  return out;
}

export function parseLenientJson(raw: string): unknown {
  // Always repair first: strict JSON.parse would SUCCEED on "\frac" and quietly
  // turn it into a form-feed character, which is exactly the bug we avoid.
  return JSON.parse(repairLatexBackslashes(raw));
}