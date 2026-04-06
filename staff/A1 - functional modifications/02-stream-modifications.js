
  
  function errorMessageHandler(){
      setTimeout(function(){ //waits 50ms for the "error message" to load
      var errBox = document.querySelector('div.text-\\[14px\\].max-\\[1024px\\]\\:text-\\[14px\\].max-\\[899px\\]\\:text-\\[14px\\].font-semibold'); //gets the "error message"
      if (errBox){
          const txtBox = document.querySelector('textarea.resize-none');          
          if (txtBox) {  //Inserts last request back into input
                  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLTextAreaElement.prototype,
                      'value'
                  ).set;
                  nativeTextareaValueSetter.call(txtBox, latestRequest);
                  const inputEvent = new Event('input', { bubbles: true });
                  txtBox.dispatchEvent(inputEvent);
          }
          errBox.textContent = "There has been an error. Please try sending your message again";
          var allMsgs = document.querySelectorAll('div.gap-y-3.text-left')
          allMsgs[allMsgs.length-1].style.backgroundColor = 'rgba(200, 200, 200, 0.5)';  //makes last message gray
      }
      }, 50); 
  
  }
  
  

  let originalFetch = window.fetch;
  
  // Overwrite the global fetch function
window.fetch = async function(...args) {
    const [input, config] = args;
    const url = typeof input === "string" ? input : input?.url;

      if (url.includes("https://core-pickaxe-api.pickaxe.co/stream")) {

          // User clicked stop before the stream request actually started:
          // block this request entirely so it never goes through
          if (blockNextStreamRequest) {
              blockNextStreamRequest = false;
              pendingStopRequest = false;
              currentAbortController = null;
              stopButtonOff(handleClick, toggleHover);
              throw new DOMException("Stream blocked before start", "AbortError");
          }

          currentAbortController = new AbortController();
          const signal = currentAbortController.signal;

          // User clicked stop in the tiny gap before controller creation:
          // abort immediately now that controller exists
          if (pendingStopRequest) {
              pendingStopRequest = false;
              currentAbortController.abort();
          }

          try {
              setTimeout(() => {
                  addEditButton();
              }, 2000);

              const response = await originalFetch(url, { ...config, signal });
              const out = response.clone();

              (async () => {
                  try {
                      const r = out.body.getReader();
                      while (!(await r.read()).done) {}

                      currentAbortController = null;
                      pendingStopRequest = false;
                      blockNextStreamRequest = false;

                  } catch (_) {}
              })();

              return response;

          } catch (error) {
              currentAbortController = null;
              pendingStopRequest = false;
              blockNextStreamRequest = false;
              stopButtonOff(handleClick, toggleHover);
              throw error;
          }
      }
      else {
          return await originalFetch(url, {...config});
      }
  };
  
function stripSnippetHtml(text) {
    const html = String(text || "");

    const wrap = document.createElement("div");
    wrap.innerHTML = html;

    wrap.querySelectorAll('.sp-snippets, .fb-snippets, .sp-snippet, .fb-snippet').forEach(el => {
        el.remove();
    });

    return wrap.innerText.trim();
}

function stopStream() {
    pendingStopRequest = true;
    blockNextStreamRequest = true;

    if (currentAbortController) {
        currentAbortController.abort();
    }

    const txtBox = document.querySelector('textarea.resize-none');
    if (txtBox) {
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        ).set;

        const cleanText = stripSnippetHtml(latestRequest);

        nativeTextareaValueSetter.call(txtBox, cleanText);
        const inputEvent = new Event('input', { bubbles: true });
        txtBox.dispatchEvent(inputEvent);
    }

    setTimeout(function() {
        var errBox = document.querySelector('div.text-\\[14px\\].max-\\[1024px\\]\\:text-\\[14px\\].max-\\[899px\\]\\:text-\\[14px\\].font-semibold');
        if (errBox) {
            errBox.textContent = "This response was stopped by the user.";
        }

        var allMsgs = document.querySelectorAll('div.gap-y-3.text-left');
        var lastMsg = allMsgs[allMsgs.length - 1];
        if (!lastMsg) return;

        lastMsg.style.backgroundColor = 'rgba(200, 200, 200, 0.5)';

        const alreadyHasLabel = Array.from(lastMsg.querySelectorAll('small'))
            .some(el => el.textContent === 'Stopped');

        if (!alreadyHasLabel) {
            const p = document.createElement('p');
            p.setAttribute('align', 'right');

            const small = document.createElement('small');
            small.textContent = 'Stopped';
            small.style.color = 'grey';

            p.appendChild(small);
            lastMsg.appendChild(p);
        }
    }, 100);
}
  
  
