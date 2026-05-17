interface MarkdownPreviewProps {
  markdown: string;
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string; key: string }
  | { type: "paragraph"; text: string; key: string }
  | { type: "list"; items: string[]; key: string }
  | { type: "code"; language: string | null; code: string; key: string };

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === "heading") {
          const HeadingTag =
            block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <HeadingTag
              className="pt-2 text-base font-semibold text-zinc-100"
              key={block.key}
            >
              {block.text}
            </HeadingTag>
          );
        }

        if (block.type === "list") {
          return (
            <ul className="space-y-2 pl-4 text-sm leading-6 text-zinc-300" key={block.key}>
              {block.items.map((item) => (
                <li className="list-disc" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              className="overflow-x-auto rounded-md border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-200"
              key={block.key}
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        return (
          <p className="text-sm leading-7 text-zinc-300" key={block.key}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage: string | null = null;
  let insideCode = false;

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraph.join(" "),
        key: `p-${blocks.length}`,
      });
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({
        type: "list",
        items: listItems,
        key: `list-${blocks.length}`,
      });
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```")) {
      if (insideCode) {
        blocks.push({
          type: "code",
          language: codeLanguage,
          code: codeLines.join("\n"),
          key: `code-${blocks.length}`,
        });
        codeLines = [];
        codeLanguage = null;
        insideCode = false;
      } else {
        flushParagraph();
        flushList();
        codeLanguage = trimmedLine.slice(3).trim() || null;
        insideCode = true;
      }
      continue;
    }

    if (insideCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
        key: `heading-${blocks.length}`,
      });
      continue;
    }

    const listMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmedLine);
  }

  flushParagraph();
  flushList();

  if (insideCode && codeLines.length > 0) {
    blocks.push({
      type: "code",
      language: codeLanguage,
      code: codeLines.join("\n"),
      key: `code-${blocks.length}`,
    });
  }

  return blocks;
}
