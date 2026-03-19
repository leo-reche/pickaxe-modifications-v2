(() => {
//START

const SNIPPETS = [
    {
      key: "summarize",
      label: "/summarize",
      desc: "Summarise the following clearly and concisely.",
      prompt: "Summarise the following clearly and concisely. Focus only on the most important ideas."
    },
    {
      key: "write-notes",
      label: "/write-notes",
      desc: "Turn the content into concise study notes.",
      prompt: "Convert the following content into concise study notes. Use bullet points and keep them easy to review."
    },
    {
      key: "learn-mode",
      label: "/learn-mode",
      desc: "Interactive learning explanation.",
      prompt: "Explain the topic step by step as if teaching a university student. Ask guiding questions and help the student reason through the concept instead of just giving the answer."
    },
    {
      key: "questions",
      label: "/questions",
      desc: "Generate university-level questions.",
      prompt: "Generate thoughtful university-level questions about the following content. Include conceptual, analytical, and discussion questions suitable for a university seminar."
    },
    {
      key: "pros-cons",
      label: "/pros-cons",
      desc: "Analyse advantages and disadvantages.",
      prompt: "Analyse the topic by clearly presenting the main advantages and disadvantages, including potential trade-offs."
    },
    {
      key: "eli5",
      label: "/eli5",
      desc: "Explain in very simple terms.",
      prompt: "Explain the following as if teaching someone with no prior knowledge. Use simple language and intuitive examples."
    },
    {
      key: "improve",
      label: "/improve",
      desc: "Improve writing quality.",
      prompt: "Improve the clarity, structure, and readability of the following text while preserving the original meaning."
    }
];

const state = {
  ta:null,
  bar:null,
  pop:null,
  open:false,
  items:[],
  active:0,
  pending:null,
  chipActive:-1,
  chipBackspaceArmedAt:0,
  chipBackspaceArmMs:350
};
const qs = (sel, root=document) => root.querySelector(sel);

// --- Fetch patch (inject snippet markers into outgoing message) ---
const origFetch = window.fetch;
window.fetch = async function(input, init){
  try{
    const url = typeof input === "string" ? input : input?.url;

    if(url && url.includes("core-pickaxe-api.pickaxe.co/submit") && init?.body){
      const body = JSON.parse(init.body);

      if(body && typeof body.value === "string"){
        const snippets = getActiveSnippets();
        if(snippets.length){
          const snippetHtml = buildSnippetsHtml(snippets);

          // 1) inject into outgoing message (server-side value)
          body.value = snippetHtml + "\n\n" + body.value;
          init.body = JSON.stringify(body);

          // 2) remember for UI bubble injection
          state.pending = { html: snippetHtml, at: Date.now() };

          // 3) schedule UI injection ~1s later (bubble should exist)
          setTimeout(() => injectSnippetsIntoLatestUserBubble(snippetHtml), 100);
          setTimeout(() => injectSnippetsIntoLatestUserBubble(snippetHtml), 1000); // cheap retry
        }
      }
    }
  }catch(e){}

  return origFetch(input, init);
};

function escHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escAttr(s){ return escHtml(s); }

function buildSnippetsHtml(snippets){
  // include BOTH sp-* and fb-* classes so it matches your example and stays compatible
  return (
    `<div class="sp-snippets fb-snippets">` +
    snippets.map(s =>
      `<div class="sp-snippet fb-snippet" data-key="${escAttr(s.key)}" data-prompt="${escAttr(s.prompt)}">${escHtml(s.label)}</div>`
    ).join("") +
    `</div>`
  );
}

function injectSnippetsIntoLatestUserBubble(snippetHtml){
  // target: <div class="flex w-full justify-end"> ... <div class="pxe-prose">...</div>
  const grid = qs('div.grid.grid-cols-1.gap-y-6.w-full');
  if(!grid) return;

  const outs = grid.querySelectorAll('div.flex.w-full.justify-end');
  const last = outs && outs.length ? outs[outs.length - 1] : null;
  if(!last) return;

  const prose = last.querySelector('.pxe-prose');
  if(!prose) return;

  // don't double-insert
  if (prose.querySelector('.fb-snippets, .sp-snippets')) return;

  prose.insertAdjacentHTML("afterbegin", snippetHtml);
}

// --- UI plumbing (slash popup + chips above textarea) ---
function findTextarea(){
  return qs('textarea[placeholder="What would you like to talk about?"]')
      || qs("main textarea")
      || qs("textarea");
}

function ensureBar(ta){
  const needsNewBar = !state.bar || !state.bar.isConnected;

  if (needsNewBar) {
    const bar = document.createElement("div");
    bar.id = "sp-snippet-bar";
    bar.hidden = true;

    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-sn]");
      if (!btn) return;
      const chip = btn.closest(".sp-sn-chip");
      if (chip) chip.remove();
      syncBarHidden();
      notifySnippetsChanged();
    });

    state.bar = bar;
  }

  // always force the bar to sit immediately before the current textarea
  if (state.bar.previousSibling !== ta) {
    ta.parentNode.insertBefore(state.bar, ta);
  }

  return state.bar;
}

function ensurePopup(){
  if (state.pop && state.pop.isConnected) return state.pop;
  const pop = document.createElement("div");
  pop.id = "sp-snippet-pop";
  pop.hidden = true;
  pop.innerHTML = `<div class="sp-sn-title">Snippets</div><div class="sp-sn-list"></div>`;
  document.body.appendChild(pop);

  pop.addEventListener("mousedown", e => e.preventDefault());
  pop.addEventListener("click", (e) => {
    const btn = e.target.closest(".sp-sn-item");
    if (!btn) return;
    pick(Number(btn.getAttribute("data-idx") || "0"));
  });

  state.pop = pop;
  return pop;
}

function syncBarHidden(){
  if (!state.bar) return;
  state.bar.hidden = state.bar.children.length === 0;
}

function notifySnippetsChanged(){
  if (!state.ta) return;
  state.ta.dispatchEvent(new Event("input", { bubbles:true }));
  state.ta.dispatchEvent(new CustomEvent("sp:snippets-changed", {
    bubbles:true,
    detail: getActiveSnippets()
  }));
}

function getActiveSnippets(){
  const bar = document.querySelector("#sp-snippet-bar");
  if(!bar) return [];
  return [...bar.querySelectorAll(".sp-sn-chip")].map(ch => ({
    key: ch.getAttribute("data-key") || "",
    label: ch.getAttribute("data-label") || "",
    prompt: ch.getAttribute("data-prompt") || ""
  }));
}

function getSnippetChips(){
  const bar = document.querySelector("#sp-snippet-bar");
  if (!bar) return [];
  return [...bar.querySelectorAll(".sp-sn-chip")];
}

function clearSnippetSelection(){
  state.chipActive = -1;
  getSnippetChips().forEach(ch => ch.classList.remove("is-selected"));
}

function setSnippetSelection(idx){
  const chips = getSnippetChips();

  if (!chips.length){
    clearSnippetSelection();
    return;
  }

  const next = Math.max(0, Math.min(idx, chips.length - 1));
  state.chipActive = next;

  chips.forEach((ch, i) => {
    ch.classList.toggle("is-selected", i === next);
  });
}

function removeSnippetAt(idx){
  const chips = getSnippetChips();
  const chip = chips[idx];
  if (!chip) return;

  chip.remove();
  syncBarHidden();
  notifySnippetsChanged();

  const remaining = getSnippetChips();
  if (!remaining.length){
    clearSnippetSelection();
    if (state.ta) state.ta.focus();
    return;
  }

  setSnippetSelection(Math.min(idx, remaining.length - 1));
}

function focusTextareaFromChips(toEnd = true){
  clearSnippetSelection();
  if (!state.ta) return;

  state.ta.focus();

  const pos = toEnd ? state.ta.value.length : 0;
  requestAnimationFrame(() => {
    state.ta.setSelectionRange(pos, pos);
  });
}

function armBackspaceForLastSnippet(){
  const chips = getSnippetChips();
  if (!chips.length) return false;

  const now = Date.now();

  // first empty backspace only selects the last chip
  if (state.chipActive === -1){
    setSnippetSelection(chips.length - 1);
    state.chipBackspaceArmedAt = now;
    return true;
  }

  // second backspace deletes only if enough time passed
  if (state.chipActive === chips.length - 1 && (now - state.chipBackspaceArmedAt) >= state.chipBackspaceArmMs){
    removeSnippetAt(state.chipActive);
    state.chipBackspaceArmedAt = 0;
    return true;
  }

  state.chipBackspaceArmedAt = now;
  return true;
}

function addSnippetChip(sn){
  const bar = ensureBar(state.ta);
  const chip = document.createElement("div");
  chip.className = "sp-sn-chip";
  chip.setAttribute("data-key", sn.key);
  chip.setAttribute("data-label", sn.label);
  chip.setAttribute("data-prompt", sn.prompt);

  chip.innerHTML = `
    <b>${escHtml(sn.label)}</b>
    <button type="button" aria-label="Remove snippet" data-remove-sn>✕</button>
  `;

  bar.appendChild(chip);
  syncBarHidden();
  notifySnippetsChanged();
  clearSnippetSelection();
}

function positionPopup(ta){
  const pop = ensurePopup();
  const r = ta.getBoundingClientRect();

  const left = Math.min(r.left + 12, window.innerWidth - 340);

  // anchor popup ABOVE the textarea, using bottom positioning (grows upward)
  const bottom = Math.min(window.innerHeight - r.top + 8, window.innerHeight - 12);

  pop.style.left = left + "px";
  pop.style.bottom = bottom + "px";
  pop.style.top = "auto";
}

function renderPopup(){
  const pop = ensurePopup();
  const list = pop.querySelector(".sp-sn-list");
  list.innerHTML = "";

  if (!state.items.length){
    const empty = document.createElement("div");
    empty.className = "sp-sn-title";
    empty.textContent = "No matches";
    list.appendChild(empty);
    return;
  }

  state.items.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sp-sn-item";
    btn.setAttribute("data-idx", String(i));
    btn.setAttribute("aria-selected", i === state.active ? "true" : "false");
    btn.innerHTML = `<div class="sp-sn-slash">${escHtml(s.label)}</div><div><div class="sp-sn-desc">${escHtml(s.desc)}</div></div>`;
    list.appendChild(btn);
  });
}

function openPopup(){
  ensurePopup();
  state.open = true;
  state.pop.hidden = false;
  state.active = 0;
  updatePopupFromTyping(); // sets state.items (top 3) + renders + positions
}

function closePopup(){
  if (!state.pop) return;
  state.pop.hidden = true;
  state.open = false;
  state.items = [];
  state.active = 0;
}

function escapeRegExp(s){
return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSlashToken(ta){
  const pos = ta.selectionStart ?? 0;
  const left = ta.value.slice(0, pos);
  const lastSlash = left.lastIndexOf("/");
  if (lastSlash < 0) return null;

  const prev = left[lastSlash - 1];
  if (prev && !/\s/.test(prev)) return null;

  // token is whatever is after "/" up to caret
  return left.slice(lastSlash + 1);
}

function updatePopupFromTyping(){
  if (!state.ta) return;

  const token = getSlashToken(state.ta);

  // if "/" is gone, or token contains whitespace => close
  if (token === null || /\s/.test(token)){
    closePopup();
    return;
  }

  // treat the token as a regex; if invalid, fall back to a prefix match
  let re = null;
  if (token.length){
    try{
      re = new RegExp(token, "i");
    }catch(e){
      re = new RegExp("^" + escapeRegExp(token), "i");
    }
  }

  const all = SNIPPETS.slice();
  const filtered = !token.length
    ? all
    : all.filter(s => re.test(String(s.label || "").replace(/^\//,"")));

  state.items = filtered.slice(0, 3);      // <-- top 3 only
  state.active = Math.min(state.active, Math.max(0, state.items.length - 1));
  if (state.active < 0) state.active = 0;

  renderPopup();
  positionPopup(state.ta);
}

function setTextareaValue(ta, value){
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  if (setter) {
    setter.call(ta, value);
  } else {
    ta.value = value;
  }

  ta.dispatchEvent(new Event("input", { bubbles:true }));
}

function removeSlashTokenIfPresent(ta){
  const pos = ta.selectionStart ?? 0;
  const left = ta.value.slice(0, pos);
  const lastSlash = left.lastIndexOf("/");
  if (lastSlash < 0) return;

  const prev = left[lastSlash - 1];
  if (prev && !/\s/.test(prev)) return;

  const token = left.slice(lastSlash + 1);
  if (/\s/.test(token)) return;

  const nextValue = ta.value.slice(0, lastSlash) + ta.value.slice(pos);
  setTextareaValue(ta, nextValue);

  requestAnimationFrame(() => {
    ta.setSelectionRange(lastSlash, lastSlash);
  });
}

function pick(idx){
  const sn = state.items[idx];
  if (!sn) return;
  removeSlashTokenIfPresent(state.ta);
  addSnippetChip(sn);
  closePopup();
  state.ta.focus();
}

function onKeyDown(e){
  const ta = e.target;
  if (!(ta instanceof HTMLTextAreaElement)) return;

  if (!state.ta) state.ta = ta;
  ensureBar(ta);

  const chips = getSnippetChips();
  const hasChips = chips.length > 0;
  const taEmpty = ta.value.length === 0;
  const caretAtStart = (ta.selectionStart ?? 0) === 0 && (ta.selectionEnd ?? 0) === 0;
  const caretAtEnd = (ta.selectionStart ?? 0) === ta.value.length && (ta.selectionEnd ?? 0) === ta.value.length;

  // open on "/"
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "/"){
    clearSnippetSelection();
    setTimeout(() => openPopup(), 0);
    return;
  }

  // close on Space
  if (e.key === " " && state.open){
    closePopup();
    return;
  }

  if (state.open){
    setTimeout(updatePopupFromTyping, 0);

    if (e.key === "Escape"){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      closePopup();
      return;
    }

    if (e.key === "ArrowDown"){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      state.active = Math.min(state.active + 1, Math.max(0, state.items.length - 1));
      renderPopup();
      return;
    }

    if (e.key === "ArrowUp"){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      state.active = Math.max(state.active - 1, 0);
      renderPopup();
      return;
    }

    if (e.key === "Enter" || e.key === "Tab"){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      pick(state.active);
      return;
    }
  }

  // textarea <-> snippet navigation
  if (!state.open && hasChips){
    if (state.chipActive === -1 && taEmpty && e.key === "ArrowLeft"){
      e.preventDefault();
      setSnippetSelection(chips.length - 1);
      return;
    }

    if (state.chipActive === -1 && caretAtStart && e.key === "ArrowUp"){
      e.preventDefault();
      setSnippetSelection(0);
      return;
    }

    if (state.chipActive === -1 && taEmpty && e.key === "Backspace"){
      e.preventDefault();
      armBackspaceForLastSnippet();
      return;
    }

    if (state.chipActive >= 0){
      if (e.key === "ArrowLeft"){
        e.preventDefault();
        setSnippetSelection(Math.max(0, state.chipActive - 1));
        return;
      }

      if (e.key === "ArrowRight"){
        e.preventDefault();

        if (state.chipActive >= chips.length - 1){
          focusTextareaFromChips(false);
        } else {
          setSnippetSelection(state.chipActive + 1);
        }
        return;
      }

      if (e.key === "ArrowDown"){
        e.preventDefault();
        focusTextareaFromChips(true);
        return;
      }

      if (e.key === "ArrowUp"){
        e.preventDefault();
        focusTextareaFromChips(false);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete"){
        e.preventDefault();
        removeSnippetAt(state.chipActive);
        return;
      }

      if (e.key === "Escape"){
        e.preventDefault();
        focusTextareaFromChips(true);
        return;
      }
    }

    if (state.chipActive === -1 && caretAtEnd && e.key === "ArrowLeft" && taEmpty){
      e.preventDefault();
      setSnippetSelection(chips.length - 1);
      return;
    }
  }

  // typing while a chip is selected should return to textarea
  if (state.chipActive >= 0 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
    clearSnippetSelection();
  }
}


function attach(ta){
  if (!ta || ta.dataset.spSnAttached) return;
  ta.dataset.spSnAttached = "1";
  state.ta = ta;
  closePopup();
  ensureBar(ta);

  ta.addEventListener("keydown", onKeyDown, true);

  document.addEventListener("mousedown", (ev) => {
    if (!state.open) return;
    if (state.pop && state.pop.contains(ev.target)) return;
    if (ev.target === ta) return;
    closePopup();
  });

  window.addEventListener("resize", () => state.open && positionPopup(ta));
  window.addEventListener("scroll",  () => state.open && positionPopup(ta), true);
}

// dynamic page: poll for textarea
const start = Date.now();
const t = setInterval(() => {
  const ta = findTextarea();
  if (ta) attach(ta);
  if (Date.now() - start > 20000) clearInterval(t);
}, 250);

//END
})();