const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const applyInlineMarkdown = (value: string) => {
  let output = escapeHtml(value);

  output = output.replaceAll(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" class="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4 hover:text-emerald-200">$1</a>',
  );
  output = output.replaceAll(
    /`([^`]+)`/g,
    '<code class="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.92em] text-white">$1</code>',
  );
  output = output.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replaceAll(/\*([^*]+)\*/g, "<em>$1</em>");

  return output;
};

export const renderMarkdown = (markdown: string) => {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: string[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      const language = trimmed.slice(3).trim();
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(
        `<pre class="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-6 text-white"><code${language ? ` data-language="${escapeHtml(language)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = applyInlineMarkdown(headingMatch[2]);
      const headingClasses = [
        "",
        "mt-10 text-4xl font-semibold tracking-tight text-white",
        "mt-10 text-3xl font-semibold tracking-tight text-white",
        "mt-8 text-2xl font-semibold tracking-tight text-white",
        "mt-6 text-xl font-semibold tracking-tight text-white",
        "mt-6 text-lg font-semibold tracking-tight text-white",
        "mt-4 text-base font-semibold uppercase tracking-[0.16em] text-white/80",
      ];

      blocks.push(`<h${level} class="${headingClasses[level]}">${content}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(
          `<li class="ml-5 list-disc pl-1">${applyInlineMarkdown(lines[index].trim().replace(/^[-*]\s+/, ""))}</li>`,
        );
        index += 1;
      }

      blocks.push(
        `<ul class="space-y-2 text-base leading-7 text-white/78">${items.join("")}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(
          `<li class="ml-5 list-decimal pl-1">${applyInlineMarkdown(lines[index].trim().replace(/^\d+\.\s+/, ""))}</li>`,
        );
        index += 1;
      }

      blocks.push(
        `<ol class="space-y-2 text-base leading-7 text-white/78">${items.join("")}</ol>`,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        `<blockquote class="border-l-2 border-emerald-400/60 pl-4 text-base italic leading-7 text-white/72">${applyInlineMarkdown(quoteLines.join(" "))}</blockquote>`,
      );
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && lines[index].trim()) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      `<p class="text-base leading-8 text-white/78">${applyInlineMarkdown(paragraphLines.join(" "))}</p>`,
    );
  }

  return blocks.join("\n");
};
