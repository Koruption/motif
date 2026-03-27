const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeImageUrl = (value: string) => {
  const githubBlobMatch = value.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
  );

  if (!githubBlobMatch) {
    return value;
  }

  const [, owner, repo, path] = githubBlobMatch;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
};

const normalizeRawHtmlTag = (tag: string) =>
  tag.replace(
    /\ssrc=(["'])(.*?)\1/i,
    (_, quote: string, url: string) =>
      ` src=${quote}${normalizeImageUrl(url)}${quote}`,
  );

const buildImageTag = (alt: string, url: string) =>
  `<img src="${escapeHtml(normalizeImageUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy" />`;

const normalizeLanguage = (value: string) => {
  const language = value.trim().toLowerCase();

  if (!language) return "plaintext";
  if (language === "ts") return "typescript";
  if (language === "js") return "javascript";
  if (language === "sh" || language === "zsh") return "bash";

  return language;
};

const applyInlineMarkdown = (value: string) => {
  const preservedTags: string[] = [];
  const preservedMath: string[] = [];
  const placeholderValue = value.replaceAll(/<[^>]+>/g, (tag) => {
    const placeholder = `__RAW_HTML_${preservedTags.length}__`;
    preservedTags.push(normalizeRawHtmlTag(tag));
    return placeholder;
  });
  const mathPlaceholderValue = placeholderValue.replaceAll(
    /\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\n])+\$/g,
    (math) => {
      const placeholder = `__MATH_${preservedMath.length}__`;
      preservedMath.push(math);
      return placeholder;
    },
  );

  let output = escapeHtml(mathPlaceholderValue);

  output = output.replaceAll(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt: string, url: string) => buildImageTag(alt, url),
  );
  output = output.replaceAll(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${escapeHtml(url)}" class="text-emerald-300 underline decoration-emerald-500/60 underline-offset-4 hover:text-emerald-200">${label}</a>`,
  );
  output = output.replaceAll(
    /`([^`]+)`/g,
    '<code class="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.92em] text-white">$1</code>',
  );
  output = output.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replaceAll(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replaceAll(/__MATH_(\d+)__/g, (_, index: string) => {
    return preservedMath[Number(index)] ?? "";
  });
  output = output.replaceAll(/__RAW_HTML_(\d+)__/g, (_, index: string) => {
    return preservedTags[Number(index)] ?? "";
  });

  return output;
};

export const renderMarkdown = (markdown: string) => {
  const normalizedMarkdown = markdown
    .replaceAll("\r\n", "\n")
    .replaceAll(/\s*\$\$([\s\S]+?)\$\$\s*/g, "\n\n$$$1$$\n\n");
  const lines = normalizedMarkdown.split("\n");
  const blocks: string[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push('<hr class="my-10 border-white/10" />');
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      const language = normalizeLanguage(trimmed.slice(3).trim());
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      const code = escapeHtml(codeLines.join("\n"));
      const languageLabel = language === "plaintext" ? "text" : language;

      blocks.push(
        `<div class="code-block"><div class="code-block__header"><span class="code-block__label">${escapeHtml(languageLabel)}</span></div><pre class="code-block__pre overflow-x-auto rounded-b-2xl border border-t-0 border-white/10 bg-black/55 p-4 text-sm leading-6 text-white"><code class="language-${escapeHtml(language)}" data-language="${escapeHtml(language)}">${code}</code></pre></div>`,
      );
      continue;
    }

    if (trimmed.startsWith("$$")) {
      const mathLines: string[] = [];

      if (trimmed !== "$$") {
        const singleLineContent = trimmed.slice(2, -2).trim();

        if (trimmed.endsWith("$$") && trimmed.length > 4) {
          blocks.push(
            `<div class="math-display">$$${singleLineContent}$$</div>`,
          );
          index += 1;
          continue;
        }

        mathLines.push(trimmed.slice(2));
      }

      index += 1;

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentTrimmed = currentLine.trim();

        if (currentTrimmed.endsWith("$$")) {
          const closingLine = currentTrimmed.slice(0, -2).trim();

          if (closingLine) {
            mathLines.push(closingLine);
          }

          index += 1;
          break;
        }

        mathLines.push(currentLine);
        index += 1;
      }

      blocks.push(
        `<div class="math-display">$$${mathLines.join("\n").trim()}$$</div>`,
      );
      continue;
    }

    if (/^<[^>]+>$/.test(trimmed)) {
      blocks.push(
        trimmed.replaceAll(/<img\b[^>]*>/gi, (tag) => normalizeRawHtmlTag(tag)),
      );
      index += 1;
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
