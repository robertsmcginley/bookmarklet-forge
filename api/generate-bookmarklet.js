import OpenAI from "openai";

const GEMINI_MODEL = "gemini-3.5-flash";
const OPENAI_MODEL = "gpt-5.5";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getSystemPrompt() {
  return `
You generate safe, simple JavaScript bookmarklets.

Return ONLY valid JSON with this exact shape:
{
  "title": "Short bookmarklet title",
  "summary": "One sentence explaining what it does.",
  "javascript": "(() => { ... })();"
}

Rules:
- The javascript value must be a complete immediately-invoked function expression.
- Use plain browser JavaScript only.
- Do not use external libraries.
- Do not use fetch, XMLHttpRequest, WebSocket, sendBeacon, or external network calls.
- Do not steal cookies, localStorage, sessionStorage, passwords, tokens, or private account data.
- Do not submit forms, click purchase buttons, delete data, or perform irreversible actions.
- Prefer visible, reversible page actions such as highlighting, hiding, extracting, counting, listing, copying, or formatting.
- Use alert or prompt for simple output.
- Avoid innerHTML. Use createElement, textContent, appendChild, and safe DOM APIs.
- Keep the code short and compact.
- The javascript field should be one complete single-line IIFE string.
- Prefer concise code over verbose code.
  `.trim();
}

function getBookmarkletSchema() {
  return {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "A short title for the bookmarklet."
      },
      summary: {
        type: "string",
        description: "One sentence explaining what the bookmarklet does."
      },
      javascript: {
        type: "string",
        description: "A complete JavaScript immediately-invoked function expression."
      }
    },
    required: ["title", "summary", "javascript"],
    additionalProperties: false
  };
}

function extractJson(text) {
  const trimmed = String(text || "").trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error(
        `AI response did not contain valid JSON. Raw response: ${trimmed.slice(0, 300)}`
      );
    }

    return JSON.parse(match[0]);
  }
}

function validateGeneratedResult(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response was not a JSON object.");
  }

  if (!parsed.title || !parsed.summary || !parsed.javascript) {
    throw new Error("AI response was missing title, summary, or javascript.");
  }

  if (typeof parsed.javascript !== "string") {
    throw new Error("AI javascript field was not a string.");
  }

  return {
    title: String(parsed.title).trim(),
    summary: String(parsed.summary).trim(),
    javascript: String(parsed.javascript).trim()
  };
}

async function getRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON request body.");
    }
  }

  return {};
}

async function generateWithGemini(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = `${getSystemPrompt()}

User request:
${request}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseJsonSchema: getBookmarkletSchema()
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini request failed with status ${response.status}.`;

    throw new Error(message);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  if (!text) {
    throw new Error(
      `Gemini returned no text. Raw response: ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  const parsed = extractJson(text);
  return validateGeneratedResult(parsed);
}

async function generateWithOpenAI(request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const client = new OpenAI({
    apiKey
  });

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    reasoning: {
      effort: "low"
    },
    input: [
      {
        role: "developer",
        content: getSystemPrompt()
      },
      {
        role: "user",
        content: request
      }
    ]
  });

  const parsed = extractJson(response.output_text);
  return validateGeneratedResult(parsed);
}

async function generateBookmarklet(request, providerPreference) {
  const provider = String(providerPreference || "").toLowerCase();

  if (provider === "gemini") {
    return {
      provider: "gemini",
      result: await generateWithGemini(request)
    };
  }

  if (provider === "openai") {
    return {
      provider: "openai",
      result: await generateWithOpenAI(request)
    };
  }

  if (process.env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      result: await generateWithGemini(request)
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      result: await generateWithOpenAI(request)
    };
  }

  throw new Error("No AI provider configured. Add GEMINI_API_KEY or OPENAI_API_KEY.");
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const body = await getRequestBody(req);
    const { request, provider } = body;

    if (!request || typeof request !== "string") {
      return res.status(400).json({
        error: "Missing required field: request"
      });
    }

    if (request.length > 1000) {
      return res.status(400).json({
        error: "Request is too long. Keep it under 1000 characters."
      });
    }

    const generated = await generateBookmarklet(request, provider);

    return res.status(200).json({
      provider: generated.provider,
      title: generated.result.title,
      summary: generated.result.summary,
      javascript: generated.result.javascript
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to generate bookmarklet."
    });
  }
}
