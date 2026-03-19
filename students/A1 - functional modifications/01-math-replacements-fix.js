(() => {
  const LOG = "[MATH01]";

  console.log(LOG, "loaded");

  const STREAM_URL_PART = "https://core-pickaxe-api.pickaxe.co/stream";
  const CONVO_URL_PART = "https://core-pickaxe-api.pickaxe.co/conversation";

  const PATTERN_REPLACEMENTS = {
    "\\[": "\n $$ \n",
    "\\]": "\n $$ \n",
    "\\(": " $$ ",
    "\\)": " $$ ",
    "<think>": "<div id='reason' class='reasoning'>",
    "</think>": "</div>",
  };

  const RAW_PATTERNS = Object.keys(PATTERN_REPLACEMENTS);
  const MAX_PATTERN_LEN = Math.max(...RAW_PATTERNS.map(x => x.length));

  function getUrl(input) {
    try {
      if (typeof input === "string") return input;
      if (input?.url) return input.url;
    } catch (_) {}
    return "";
  }

  function applyReplacements(text) {
    let out = text;

    for (const [pattern, replacement] of Object.entries(PATTERN_REPLACEMENTS)) {
      if (out.includes(pattern)) {
        out = out.split(pattern).join(replacement);
      }
    }

    return out;
  }

  function formatInlineMath(text) {
    return text.replace(/([\s.(,"'])\$([^$]+)\$([\s.),"'])/g, "$1$$$$$2$$$$$3");
  }

  function findRawPartialSuffix(text) {
    let longest = "";

    for (const pattern of RAW_PATTERNS) {
      for (let i = pattern.length - 1; i > 0; i--) {
        const partial = pattern.slice(0, i);
        if (text.endsWith(partial) && partial.length > longest.length) {
          longest = partial;
        }
      }
    }

    return longest;
  }

  function createProcessedToken(rawToken, state) {
    const combined = state.rawCarry + rawToken;
    const safeLen = Math.max(0, combined.length - (MAX_PATTERN_LEN - 1));

    let processable = combined.slice(0, safeLen);
    let tail = combined.slice(safeLen);

    processable = applyReplacements(processable);

    const partial = findRawPartialSuffix(tail);
    if (partial) {
      state.rawCarry = partial;
      tail = tail.slice(0, -partial.length);
    } else {
      state.rawCarry = "";
    }

    tail = applyReplacements(tail);

    let out = processable + tail;

    state.mathBuffer += out;
    if (out.includes("$")) state.seenMath = true;

    return out;
  }

  function flushMathBuffer(state) {
    if (!state.mathBuffer) return "";

    let out = state.mathBuffer;
    out = formatInlineMath(out);

    state.mathBuffer = "";
    state.seenMath = false;

    return `data: ${JSON.stringify({ token: out })}\n`;
  }

  const previousFetch = window.fetch;

  window.fetch = function(input, init) {
    const url = getUrl(input);

    console.log(LOG, "fetch called:", url || "(no url)");

    return previousFetch.call(this, input, init).then((response) => {
      if (!url || !url.includes(STREAM_URL_PART)) {
        return response;
      }

      console.log(LOG, "stream response seen");
      console.log(LOG, "status:", response.status);

      const contentType = response.headers.get("content-type") || "";
      console.log(LOG, "content-type:", contentType);

      if (!contentType.includes("text/event-stream")) {
        console.log(LOG, "not SSE, returning original response");
        return response;
      }

      if (!response.body) {
        console.log(LOG, "response.body missing, returning original response");
        return response;
      }

      const sourceReader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const abortSignal = init?.signal;
      console.log(LOG, "abortSignal exists:", !!abortSignal);
      console.log(LOG, "abortSignal.aborted at start:", abortSignal?.aborted);

      const state = {
        rawCarry: "",
        mathBuffer: "",
        seenMath: false,
        abortHandler: null,
        aborted: false,
      };

      const newStream = new ReadableStream({
        async start(controller) {
          console.log(LOG, "ReadableStream.start()");

          state.abortHandler = async () => {
            console.log(LOG, "abort received");
            state.aborted = true;

            try { await sourceReader.cancel(); } catch (_) {}

            try {
              controller.error(new DOMException("Stream aborted by user", "AbortError"));
            } catch (_) {}
          };

          if (abortSignal) {
            if (abortSignal.aborted) {
              console.log(LOG, "signal already aborted before listener");
              await state.abortHandler();
              return;
            }

            abortSignal.addEventListener("abort", state.abortHandler);
            console.log(LOG, "abort listener attached");
          }

          async function pump() {
            try {
              if (state.aborted) return;

              const { done, value } = await sourceReader.read();

              if (done) {
                if (state.aborted) {
                  try {
                    controller.error(new DOMException("Stream aborted by user", "AbortError"));
                  } catch (_) {}
                  return;
                }

                if (state.rawCarry) {
                  const tailToken = applyReplacements(state.rawCarry);
                  state.mathBuffer += tailToken;
                  state.rawCarry = "";
                }

                if (state.mathBuffer) {
                  const flushed = flushMathBuffer(state);
                  if (flushed) {
                    controller.enqueue(encoder.encode(flushed));
                    console.log(LOG, "flushed mathBuffer on done");
                  }
                }

                if (abortSignal && state.abortHandler) {
                  abortSignal.removeEventListener("abort", state.abortHandler);
                }

                controller.close();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");
              let output = "";
              let changedSomething = false;

              for (const line of lines) {
                if (!line.startsWith("data: ")) {
                  output += line + "\n";
                  continue;
                }

                const payload = line.slice(6);

                if (payload === "[DONE]") {
                  if (state.mathBuffer) {
                    const flushed = flushMathBuffer(state);
                    if (flushed) {
                      output += flushed;
                      changedSomething = true;
                    }
                  }

                  output += "data: [DONE]\n";
                  continue;
                }

                try {
                  const parsed = JSON.parse(payload);

                  if (typeof parsed.token === "string") {
                    const originalToken = parsed.token;
                    const processedToken = createProcessedToken(parsed.token, state);

                    if (processedToken !== originalToken) {
                      changedSomething = true;
                      console.log(LOG, "modified token:", {
                        before: originalToken,
                        after: processedToken
                      });
                    }

                    if (!state.seenMath) {
                      parsed.token = processedToken;
                      output += "data: " + JSON.stringify(parsed) + "\n";
                    }
                  } else {
                    output += line + "\n";
                  }
                } catch (_) {
                  output += line + "\n";
                }
              }

              if (state.seenMath && state.mathBuffer.length > 250) {
                const flushed = flushMathBuffer(state);
                output += flushed;
                changedSomething = true;
                console.log(LOG, "flushed mathBuffer by size");
              }

              if (output) {
                controller.enqueue(encoder.encode(output));
              }

              if (changedSomething) {
                console.log(LOG, "chunk modified and forwarded");
              }

              pump();
            } catch (err) {
              if (abortSignal && state.abortHandler) {
                abortSignal.removeEventListener("abort", state.abortHandler);
              }

              if (err?.name === "AbortError" || state.aborted) {
                try {
                  controller.error(new DOMException("Stream aborted by user", "AbortError"));
                } catch (_) {}
              } else {
                console.log(LOG, "stream error:", err);
                try {
                  controller.error(err);
                } catch (_) {}
              }
            }
          }

          pump();
        },

        cancel(reason) {
          console.log(LOG, "ReadableStream.cancel()", reason);
          state.aborted = true;
          return sourceReader.cancel(reason).catch(() => {});
        }
      });

      console.log(LOG, "returning wrapped SSE response");

      return new Response(newStream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    });
  };

  const OriginalXHR = XMLHttpRequest;

  XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    let requestUrl = "";

    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      requestUrl = url || "";
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    Object.defineProperty(xhr, "responseText", {
      get() {
        const originalResponse =
          Object.getOwnPropertyDescriptor(OriginalXHR.prototype, "responseText")
            .get.call(this);

        if (!requestUrl || !requestUrl.startsWith(CONVO_URL_PART) || !originalResponse) {
          return originalResponse;
        }

        let modified = originalResponse;
        for (const [pattern, replacement] of Object.entries({
          "\\\\[": "\\n $$ \\n",
          "\\\\]": "\\n $$ \\n",
          "\\\\(": " $$ ",
          "\\\\)": " $$ ",
          "<think>": "<div id='reason' class='reasoning'>",
          "</think>": "</div>",
        })) {
          modified = modified.replaceAll(pattern, replacement);
        }

        modified = formatInlineMath(modified);

        console.log(LOG, "XHR conversation responseText modified");

        return modified;
      }
    });

    return xhr;
  };

  console.log(LOG, "patches installed");
})();