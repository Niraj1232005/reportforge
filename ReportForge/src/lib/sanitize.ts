const DISALLOWED_RICH_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
]);

const ALLOWED_RICH_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "span",
  "mark",
]);

const ALLOWED_STYLE_PROPERTIES = new Set([
  "font-weight",
  "font-style",
  "text-decoration",
  "font-family",
  "font-size",
  "background-color",
  "text-align",
]);

const sanitizeStyleAttribute = (styleValue: string) => {
  return styleValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [property, rawValue] = entry.split(":", 2);
      const normalizedProperty = property?.trim().toLowerCase();
      const normalizedValue = rawValue?.trim().replace(/["<>]/g, "");

      if (
        !normalizedProperty ||
        !normalizedValue ||
        !ALLOWED_STYLE_PROPERTIES.has(normalizedProperty)
      ) {
        return null;
      }

      return `${normalizedProperty}: ${normalizedValue}`;
    })
    .filter(Boolean)
    .join("; ");
};

const sanitizeFallbackRichHtml = (value: string) => {
  return value
    .replace(/<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
};

const sanitizeNode = (node: Node, documentRef: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (DISALLOWED_RICH_TAGS.has(tagName)) {
    return null;
  }

  if (!ALLOWED_RICH_TAGS.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();
    element.childNodes.forEach((child) => {
      const sanitizedChild = sanitizeNode(child, documentRef);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    });
    return fragment;
  }

  const cleanElement = documentRef.createElement(tagName);
  const styleValue = element.getAttribute("style");
  const sanitizedStyle = styleValue ? sanitizeStyleAttribute(styleValue) : "";

  if (sanitizedStyle) {
    cleanElement.setAttribute("style", sanitizedStyle);
  }

  if (tagName === "td" || tagName === "th") {
    const colspan = element.getAttribute("colspan");
    const rowspan = element.getAttribute("rowspan");
    if (colspan && /^\d+$/.test(colspan)) {
      cleanElement.setAttribute("colspan", colspan);
    }
    if (rowspan && /^\d+$/.test(rowspan)) {
      cleanElement.setAttribute("rowspan", rowspan);
    }
  }

  element.childNodes.forEach((child) => {
    const sanitizedChild = sanitizeNode(child, documentRef);
    if (sanitizedChild) {
      cleanElement.appendChild(sanitizedChild);
    }
  });

  return cleanElement;
};

export const sanitizeRichTextHtml = (value: string) => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return sanitizeFallbackRichHtml(String(value || ""));
  }

  try {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${value || ""}</div>`, "text/html");
    const sourceRoot = parsed.body.firstElementChild;

    if (!sourceRoot) {
      return "";
    }

    const cleanRoot = parsed.createElement("div");
    sourceRoot.childNodes.forEach((child) => {
      const sanitizedChild = sanitizeNode(child, parsed);
      if (sanitizedChild) {
        cleanRoot.appendChild(sanitizedChild);
      }
    });

    return cleanRoot.innerHTML.trim();
  } catch {
    return sanitizeFallbackRichHtml(String(value || ""));
  }
};

export const sanitizeSingleLineText = (
  value: unknown,
  fallback = "",
  maxLength = 160
) => {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const result = normalized.slice(0, maxLength);
  return result || fallback;
};

export const sanitizeSafeRedirectPath = (
  value: string | null | undefined,
  fallback = "/dashboard"
) => {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/")) {
    return fallback;
  }
  if (candidate.startsWith("//")) {
    return fallback;
  }
  if (/^[a-z]+:/i.test(candidate)) {
    return fallback;
  }
  return candidate;
};
