(() => {
  const existing = document.getElementById("bookmarklet-forge-panel");
  const existingStyle = document.getElementById("bookmarklet-forge-style");

  if (existing) {
    existing.remove();
    if (existingStyle) existingStyle.remove();
    return;
  }

  const templates = {
    links: {
      title: "Extract All Links",
      summary: "Finds all links on the current page and displays them in a copyable prompt.",
      fn: function () {
        const links = [...document.querySelectorAll("a[href]")]
          .map((a, i) => {
            const label = a.textContent.trim() || a.href;
            return `${i + 1}. ${label}\n${a.href}`;
          });

        if (!links.length) {
          alert("No links found on this page.");
          return;
        }

        prompt(`Found ${links.length} links. Copy them from below:`, links.join("\n\n"));
      }
    },

    prices: {
      title: "Highlight Prices",
      summary: "Highlights dollar amounts like $19.99, $250, and $1,200 on the current page.",
      fn: function () {
        const priceRegex = /(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$\s?\d+(?:\.\d{2})?)/g;
        const skipTags = ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT", "MARK"];
        let count = 0;

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent || skipTags.includes(parent.tagName)) {
                return NodeFilter.FILTER_REJECT;
              }

              priceRegex.lastIndex = 0;
              return priceRegex.test(node.nodeValue)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          }
        );

        const nodes = [];
        let node;

        while ((node = walker.nextNode())) {
          nodes.push(node);
        }

        nodes.forEach((textNode) => {
          const text = textNode.nodeValue;
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          priceRegex.lastIndex = 0;

          text.replace(priceRegex, (match, _group, offset) => {
            if (offset > lastIndex) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
            }

            const mark = document.createElement("mark");
            mark.textContent = match;
            mark.style.background = "yellow";
            mark.style.color = "black";
            mark.style.padding = "0 2px";
            mark.style.borderRadius = "3px";

            fragment.appendChild(mark);
            lastIndex = offset + match.length;
            count += 1;

            return match;
          });

          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
          }

          textNode.parentNode.replaceChild(fragment, textNode);
        });

        alert(`Highlighted ${count} price match${count === 1 ? "" : "es"}.`);
      }
    },

    reading: {
      title: "Reading Mode",
      summary: "Applies a simple reading mode by improving spacing and hiding common distractions. Run again to remove it.",
      fn: function () {
        const styleId = "bookmarklet-forge-reading-mode-style";
        const existing = document.getElementById(styleId);

        if (existing) {
          existing.remove();
          alert("Reading mode removed.");
          return;
        }

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          body {
            max-width: 850px !important;
            margin: 0 auto !important;
            padding: 32px !important;
            font-size: 18px !important;
            line-height: 1.7 !important;
            background: #ffffff !important;
            color: #111111 !important;
          }

          p, li {
            line-height: 1.7 !important;
          }

          img, video, iframe, aside, nav, footer,
          .ad, .ads, .advertisement, .sponsored,
          [class*="sticky"], [id*="sticky"] {
            display: none !important;
          }
        `;

        document.head.appendChild(style);
        alert("Reading mode applied. Run this bookmarklet again to remove it.");
      }
    },

    images: {
      title: "Hide Images",
      summary: "Toggles images on the current page. Run once to hide images, run again to restore them.",
      fn: function () {
        const images = [...document.images];

        if (!images.length) {
          alert("No images found on this page.");
          return;
        }

        const shouldHide = images.some((img) => img.dataset.bfHidden !== "1");

        images.forEach((img) => {
          if (shouldHide) {
            img.dataset.bfOldDisplay = img.style.display || "";
            img.style.display = "none";
            img.dataset.bfHidden = "1";
          } else {
            img.style.display = img.dataset.bfOldDisplay || "";
            delete img.dataset.bfOldDisplay;
            delete img.dataset.bfHidden;
          }
        });

        alert(`${shouldHide ? "Hidden" : "Restored"} ${images.length} image${images.length === 1 ? "" : "s"}.`);
      }
    },

    emails: {
      title: "Extract Emails",
      summary: "Scans visible page text for email addresses and displays unique matches in a copyable prompt.",
      fn: function () {
        const text = document.body.innerText || "";
        const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];

        if (!emails.length) {
          alert("No email addresses found on this page.");
          return;
        }

        prompt(`Found ${emails.length} email address${emails.length === 1 ? "" : "es"}. Copy from below:`, emails.join("\n"));
      }
    },

    headings: {
      title: "Extract Headings",
      summary: "Finds all H1 through H6 headings on the current page and displays them as a copyable outline.",
      fn: function () {
        const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
          .map((heading) => {
            const level = Number(heading.tagName.slice(1));
            const indent = "  ".repeat(level - 1);
            const text = heading.textContent.trim().replace(/\s+/g, " ");
            return text ? `${indent}${heading.tagName}: ${text}` : "";
          })
          .filter(Boolean);

        if (!headings.length) {
          alert("No headings found on this page.");
          return;
        }

        prompt(
          `Found ${headings.length} heading${headings.length === 1 ? "" : "s"}. Copy the outline below:`,
          headings.join("\n")
        );
      }
    },

    sticky: {
      title: "Toggle Sticky Headers",
      summary: "Toggles fixed and sticky page elements such as sticky headers, floating bars, overlays, and popups.",
      fn: function () {
        const alreadyHidden = document.querySelectorAll("[data-bf-sticky-hidden='1']");

        if (alreadyHidden.length) {
          alreadyHidden.forEach((element) => {
            element.style.display = element.dataset.bfOldDisplay || "";
            delete element.dataset.bfOldDisplay;
            delete element.dataset.bfStickyHidden;
          });

          alert(`Restored ${alreadyHidden.length} sticky/fixed element${alreadyHidden.length === 1 ? "" : "s"}.`);
          return;
        }

        const candidates = [...document.body.querySelectorAll("*")];
        let hiddenCount = 0;

        candidates.forEach((element) => {
          const style = window.getComputedStyle(element);
          const position = style.position;
          const rect = element.getBoundingClientRect();

          const isFixedOrSticky = position === "fixed" || position === "sticky";
          const isVisible = rect.width > 0 && rect.height > 0;

          const isLikelyOverlay =
            rect.width >= window.innerWidth * 0.5 ||
            rect.height >= 40;

          const isNotForgePanel = !element.closest("#bookmarklet-forge-panel");

          if (isFixedOrSticky && isVisible && isLikelyOverlay && isNotForgePanel) {
            element.dataset.bfOldDisplay = element.style.display || "";
            element.style.display = "none";
            element.dataset.bfStickyHidden = "1";
            hiddenCount += 1;
          }
        });

        alert(
          hiddenCount
            ? `Hidden ${hiddenCount} fixed/sticky element${hiddenCount === 1 ? "" : "s"}. Run again to restore.`
            : "No obvious fixed or sticky elements found."
        );
      }
    }
  };

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.textContent !== undefined) element.textContent = options.textContent;
    if (options.title) element.title = options.title;
    if (options.htmlFor) element.htmlFor = options.htmlFor;
    if (options.placeholder) element.placeholder = options.placeholder;
    if (options.readOnly !== undefined) element.readOnly = options.readOnly;

    return element;
  }

  function makeBookmarklet(fn) {
    const rawCode = `(${fn.toString()})();`;
    const bookmarklet = "javascript:" + encodeURIComponent(rawCode);

    return {
      rawCode,
      bookmarklet
    };
  }

  async function copyText(text, statusElement) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }

      statusElement.textContent = "Copied.";
    } catch (error) {
      statusElement.textContent = "Copy failed. You can manually select and copy the text.";
    }
  }

  function clearOutput(output) {
    while (output.firstChild) {
      output.removeChild(output.firstChild);
    }
  }

  function chooseTemplate(request) {
    const text = request.toLowerCase();

    if (text.includes("link")) return "links";
    if (text.includes("price") || text.includes("dollar") || text.includes("$")) return "prices";
    if (text.includes("reading") || text.includes("readability") || text.includes("clean page")) return "reading";
    if (text.includes("image") || text.includes("images") || text.includes("hide pictures")) return "images";
    if (text.includes("email")) return "emails";
    if (text.includes("heading") || text.includes("outline")) return "headings";
    if (text.includes("sticky") || text.includes("fixed header") || text.includes("floating")) return "sticky";

    return null;
  }

  function renderTemplateResult(templateKey, output) {
    const template = templates[templateKey];
    const generated = makeBookmarklet(template.fn);

    clearOutput(output);

    const heading = createElement("div", {
      className: "bookmarklet-forge-result-heading",
      textContent: template.title
    });

    const summary = createElement("div", {
      className: "bookmarklet-forge-result-summary",
      textContent: template.summary
    });

    const buttonRow = createElement("div", {
      className: "bookmarklet-forge-button-row"
    });

    const runButton = createElement("button", {
      className: "bookmarklet-forge-small-button",
      textContent: "Run Test"
    });

    const copyJsButton = createElement("button", {
      className: "bookmarklet-forge-small-button",
      textContent: "Copy JavaScript"
    });

    const copyBookmarkletButton = createElement("button", {
      className: "bookmarklet-forge-small-button",
      textContent: "Copy Bookmarklet"
    });

    const status = createElement("div", {
      className: "bookmarklet-forge-status",
      textContent: ""
    });

    buttonRow.appendChild(runButton);
    buttonRow.appendChild(copyJsButton);
    buttonRow.appendChild(copyBookmarkletButton);

    const bookmarkLabel = createElement("div", {
      className: "bookmarklet-forge-code-label",
      textContent: "Drag this link to your bookmarks bar:"
    });

    const bookmarkLink = createElement("a", {
      className: "bookmarklet-forge-bookmark-link",
      textContent: template.title
    });

    bookmarkLink.href = generated.bookmarklet;
    bookmarkLink.draggable = true;

    const jsLabel = createElement("div", {
      className: "bookmarklet-forge-code-label",
      textContent: "Generated JavaScript:"
    });

    const jsCode = createElement("textarea", {
      className: "bookmarklet-forge-code-box",
      readOnly: true
    });

    jsCode.value = generated.rawCode;

    const bookmarkletLabel = createElement("div", {
      className: "bookmarklet-forge-code-label",
      textContent: "Bookmarklet URL:"
    });

    const bookmarkletCode = createElement("textarea", {
      className: "bookmarklet-forge-code-box",
      readOnly: true
    });

    bookmarkletCode.value = generated.bookmarklet;

    runButton.addEventListener("click", () => {
      try {
        template.fn();
        status.textContent = "Test ran.";
      } catch (error) {
        status.textContent = `Test failed: ${error.message}`;
      }
    });

    copyJsButton.addEventListener("click", () => {
      copyText(generated.rawCode, status);
    });

    copyBookmarkletButton.addEventListener("click", () => {
      copyText(generated.bookmarklet, status);
    });

    output.appendChild(heading);
    output.appendChild(summary);
    output.appendChild(buttonRow);
    output.appendChild(status);
    output.appendChild(bookmarkLabel);
    output.appendChild(bookmarkLink);
    output.appendChild(jsLabel);
    output.appendChild(jsCode);
    output.appendChild(bookmarkletLabel);
    output.appendChild(bookmarkletCode);
  }

  const style = document.createElement("style");
  style.id = "bookmarklet-forge-style";
  style.textContent = `
    #bookmarklet-forge-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 410px;
      height: 100vh;
      background: #111827;
      color: #f9fafb;
      z-index: 2147483647;
      box-shadow: -4px 0 20px rgba(0,0,0,0.35);
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      border-left: 1px solid #374151;
    }

    #bookmarklet-forge-panel * {
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    #bookmarklet-forge-header {
      padding: 16px;
      border-bottom: 1px solid #374151;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #bookmarklet-forge-title {
      font-size: 18px;
      font-weight: bold;
    }

    #bookmarklet-forge-subtitle {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 2px;
    }

    #bookmarklet-forge-close {
      background: transparent;
      color: #f9fafb;
      border: none;
      font-size: 22px;
      cursor: pointer;
    }

    #bookmarklet-forge-body {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    #bookmarklet-forge-label {
      display: block;
      font-size: 14px;
      margin-bottom: 8px;
      color: #d1d5db;
    }

    #bookmarklet-forge-input {
      width: 100%;
      height: 120px;
      resize: vertical;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #4b5563;
      background: #1f2937;
      color: #f9fafb;
      font-size: 14px;
      line-height: 1.4;
    }

    #bookmarklet-forge-input::placeholder {
      color: #9ca3af;
    }

    #bookmarklet-forge-generate {
      margin-top: 12px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
    }

    #bookmarklet-forge-generate:hover {
      background: #1d4ed8;
    }

    #bookmarklet-forge-output {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background: #1f2937;
      border: 1px solid #374151;
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .bookmarklet-forge-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .bookmarklet-forge-chip {
      padding: 6px 8px;
      border-radius: 999px;
      border: 1px solid #4b5563;
      background: #1f2937;
      color: #e5e7eb;
      font-size: 12px;
      cursor: pointer;
    }

    .bookmarklet-forge-chip:hover {
      background: #374151;
    }

    .bookmarklet-forge-result-heading {
      font-size: 16px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .bookmarklet-forge-result-summary {
      color: #d1d5db;
      margin-bottom: 12px;
      white-space: normal;
    }

    .bookmarklet-forge-button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .bookmarklet-forge-small-button {
      padding: 7px 9px;
      border-radius: 7px;
      border: 1px solid #4b5563;
      background: #374151;
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
    }

    .bookmarklet-forge-small-button:hover {
      background: #4b5563;
    }

    .bookmarklet-forge-status {
      min-height: 18px;
      color: #93c5fd;
      font-size: 12px;
      margin-bottom: 10px;
    }

    .bookmarklet-forge-code-label {
      margin-top: 12px;
      margin-bottom: 6px;
      font-size: 12px;
      color: #9ca3af;
      white-space: normal;
    }

    .bookmarklet-forge-code-box {
      width: 100%;
      height: 90px;
      resize: vertical;
      padding: 8px;
      border-radius: 7px;
      border: 1px solid #4b5563;
      background: #111827;
      color: #e5e7eb;
      font-size: 12px;
      line-height: 1.4;
      font-family: Consolas, monospace;
    }

    .bookmarklet-forge-bookmark-link {
      display: inline-block;
      padding: 8px 10px;
      border-radius: 7px;
      background: #2563eb;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .bookmarklet-forge-bookmark-link:hover {
      background: #1d4ed8;
    }
  `;

  document.head.appendChild(style);

  const panel = createElement("div", {
    id: "bookmarklet-forge-panel"
  });

  const header = createElement("div", {
    id: "bookmarklet-forge-header"
  });

  const titleWrap = createElement("div");

  const title = createElement("div", {
    id: "bookmarklet-forge-title",
    textContent: "Bookmarklet Forge"
  });

  const subtitle = createElement("div", {
    id: "bookmarklet-forge-subtitle",
    textContent: "Build tiny tools for this page"
  });

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const closeButton = createElement("button", {
    id: "bookmarklet-forge-close",
    title: "Close",
    textContent: "×"
  });

  header.appendChild(titleWrap);
  header.appendChild(closeButton);

  const body = createElement("div", {
    id: "bookmarklet-forge-body"
  });

  const label = createElement("label", {
    id: "bookmarklet-forge-label",
    htmlFor: "bookmarklet-forge-input",
    textContent: "What do you want your bookmarklet to do?"
  });

  const textarea = createElement("textarea", {
    id: "bookmarklet-forge-input",
    placeholder: "Example: Make a bookmarklet that highlights all prices on this page."
  });

  const chipRow = createElement("div", {
    className: "bookmarklet-forge-chip-row"
  });

  const chipTemplates = [
    ["Extract all links", "links"],
    ["Highlight prices", "prices"],
    ["Reading mode", "reading"],
    ["Hide images", "images"],
    ["Extract emails", "emails"],
    ["Extract headings", "headings"],
    ["Toggle sticky headers", "sticky"]
  ];

  chipTemplates.forEach(([chipText, templateKey]) => {
    const chip = createElement("button", {
      className: "bookmarklet-forge-chip",
      textContent: chipText
    });

    chip.addEventListener("click", () => {
      textarea.value = `Create a bookmarklet that can ${chipText.toLowerCase()} on the current page.`;
      renderTemplateResult(templateKey, output);
    });

    chipRow.appendChild(chip);
  });

  const generateButton = createElement("button", {
    id: "bookmarklet-forge-generate",
    textContent: "Generate Bookmarklet"
  });

  const output = createElement("div", {
    id: "bookmarklet-forge-output",
    textContent:
      "Describe a small webpage action, then click Generate Bookmarklet.\n\n" +
      "Layer 2E currently supports: extracting links, highlighting prices, reading mode, hiding images, extracting emails, extracting headings, and toggling sticky headers."
  });

  generateButton.addEventListener("click", () => {
    const request = textarea.value.trim();

    if (!request) {
      output.textContent = "Describe what you want your bookmarklet to do first.";
      return;
    }

    const templateKey = chooseTemplate(request);

    if (!templateKey) {
      output.textContent =
        `I do not have a built-in template for this yet:\n\n"${request}"\n\n` +
        "Try one of these for now: extract links, highlight prices, reading mode, hide images, extract emails, extract headings, or toggle sticky headers.";
      return;
    }

    renderTemplateResult(templateKey, output);
  });

  closeButton.addEventListener("click", () => {
    panel.remove();
    style.remove();
  });

  body.appendChild(label);
  body.appendChild(textarea);
  body.appendChild(chipRow);
  body.appendChild(generateButton);
  body.appendChild(output);

  panel.appendChild(header);
  panel.appendChild(body);

  document.body.appendChild(panel);
})();