  // syncing with database
  function syncConversation(responseId,formId,studioUserId,pastedContent,url){

  if (url.includes("https://core-pickaxe-api.pickaxe.co/stream")) {
      try {
      const apiUrl = "https://dashboard-backend-395477780264.europe-west1.run.app";
      const payload = { 
          responseId: responseId,
          formId: formId,
          userId: studioUserId,
          pastedContent: pastedContent
      };

      originalFetch(apiUrl, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
      });
      pastedContent.length = 0;
      } catch (e) {
      }
  }
  }
  
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


      if (url.includes("https://core-pickaxe-api.pickaxe.co/submit")){   //Massive if{} to get the formid,responseid,lastmessage,documents
          try {
              // Extract from request body
              formId = JSON.parse(config.body).pickaxeId
          } catch(e){}
          try {
              responseId = JSON.parse(config.body).sessionId
          } catch(e){}
          try {
              latestRequest = JSON.parse(config.body).value
          } catch(e){}
          try {
              studioUserId = JSON.parse(config.body).sender
          } catch(e){}
          try {
              documents = JSON.parse(config.body).documentIds
          } catch(e){}
  
  
          try {
              const response = await originalFetch(url, config);
              const responseClone = response.clone();
              
              // Extract submissionId from response
              const responseData = await responseClone.json();
              if (responseData.submissionId) {
                  currentSubmissionId = responseData.submissionId;
              }
              
              return response;
          } catch (error) {
              console.error("Error in /submit:", error);
              return await originalFetch(url, config);
          }
      }
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

                      errorMessageHandler();
                      setTimeout(() => {
                          syncConversation(responseId, formId, studioUserId, pastedContent, url);
                      }, 2000);
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

function abortCurrentStreamOnly() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
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
  
  
