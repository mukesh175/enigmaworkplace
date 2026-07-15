import React from "react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Renders text with both URLs and @mentions (for known user names) turned
// into styled inline elements. mentionNames should be the display names of
// users allowed to be mentioned in this context (conversation participants,
// team members, etc).
export function linkify(
  text: string,
  linkClassName: string,
  mentionNames: string[] = []
): React.ReactNode[] {
  const escapedNames = mentionNames
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  const patternStr = escapedNames.length
    ? `(https?://[^\\s]+)|(@(?:${escapedNames.join("|")})\\b)`
    : `(https?://[^\\s]+)`;
  const regex = new RegExp(patternStr, "g");

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<React.Fragment key={key++}>{text.slice(lastIndex, match.index)}</React.Fragment>);
    }

    if (match[1]) {
      const trailing = match[1].match(/[.,)\]]+$/)?.[0] ?? "";
      const clean = trailing ? match[1].slice(0, -trailing.length) : match[1];
      nodes.push(
        <a key={key++} href={clean} target="_blank" rel="noreferrer" className={`underline ${linkClassName}`}>
          {clean}
        </a>
      );
      if (trailing) nodes.push(<React.Fragment key={key++}>{trailing}</React.Fragment>);
    } else if (match[2]) {
      nodes.push(
        <span key={key++} className="font-bold">
          {match[2]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<React.Fragment key={key++}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return nodes;
}
