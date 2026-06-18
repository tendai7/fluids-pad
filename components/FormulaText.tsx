/**
 * Renders formula strings with proper sub/superscripts.
 * Converts: P_v → P<sub>v</sub>, h_{f1} → h<sub>f1</sub>, V^2 → V<sup>2</sup>
 */
export function FormulaText({ text }: { text: string }) {
  const parts = parseFormula(text);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "sub") return <sub key={i}>{part.value}</sub>;
        if (part.type === "sup") return <sup key={i}>{part.value}</sup>;
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}

type Part = { type: "text" | "sub" | "sup"; value: string };

function parseFormula(text: string): Part[] {
  const parts: Part[] = [];
  let i = 0;
  let current = "";

  while (i < text.length) {
    const ch = text[i];

    if ((ch === "_" || ch === "^") && i + 1 < text.length) {
      if (current) { parts.push({ type: "text", value: current }); current = ""; }
      const type = ch === "_" ? "sub" : "sup";
      i++;
      if (text[i] === "{") {
        // multi-char: _{word} or ^{word}
        const end = text.indexOf("}", i);
        if (end !== -1) {
          parts.push({ type, value: text.slice(i + 1, end) });
          i = end + 1;
        } else {
          parts.push({ type, value: text[i] });
          i++;
        }
      } else {
        // single char
        parts.push({ type, value: text[i] });
        i++;
      }
    } else {
      current += ch;
      i++;
    }
  }

  if (current) parts.push({ type: "text", value: current });
  return parts;
}
