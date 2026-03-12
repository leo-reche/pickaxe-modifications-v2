// RESUBMITTING
// =============== Banner

/*
document.addEventListener("DOMContentLoaded", function() {
  const banner = document.createElement("div");
  banner.className = "fc-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", "polite");
  banner.innerHTML = `
    <span>
      Pickaxe is experiencing a server error today. We're already in contact with them, and apologize for any inconveniences!
    </span>
    <button class="fc-banner__close" type="button" aria-label="Dismiss announcement">×</button>
  `;

  // Add close button functionality
  banner.querySelector(".fc-banner__close").addEventListener("click", () => {
    banner.remove();
  });

  // Insert at the top of the body
  document.body.prepend(banner);

  (function () {
    const banner = document.querySelector('.fc-banner');
    if (!banner) return;

    function setHeightVar() {
      banner.style.setProperty('--fc-banner-h', banner.scrollHeight + 'px');
    }
    setHeightVar();

    window.addEventListener('resize', setHeightVar);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(setHeightVar).catch(() => {});
    }

    function hideBanner() {
      if (banner.classList.contains('is-hiding')) return;
      banner.classList.add('is-hiding');
      banner.addEventListener('transitionend', () => banner.remove(), { once: true });
    }

    const timer = setTimeout(hideBanner, 10000);

    banner.addEventListener('click', function (e) {
      if (e.target.closest('.fc-banner__close')) {
        clearTimeout(timer);
        hideBanner();
      }
    });
  })();



});
*/
  

//=========== Pricing Redirect

function checkPricingRedirect() {
    if (window.location.pathname === "/pricing") {
      window.location.href = "https://docs.google.com/forms/d/1QB7krvh2ypt8No2kzOwfR7DUUHGxFxDnkNIv7a6KJ_I/edit";
    }
  }
  
  // Listen for initial page load
  checkPricingRedirect();
  
  // Listen for history (client-side routing) changes
  window.addEventListener('popstate', checkPricingRedirect);
  
  const origPushState = history.pushState;
  history.pushState = function(...args) {
    origPushState.apply(this, args);
    checkPricingRedirect();
  };
   
  
  // ================ DB Sync
  
  let formId = null;
  let responseId = null;
  let studioUserId = null;
  let latestRequest = null;
  let documents = null;
  let wasStopped = false;
  let pastedContent = [""];
  let currentAbortController = null;
  let currentSubmissionId = null; //This will store the Submission ID
  
  
  
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

      originalFetch2(apiUrl, {
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
  
  
  let originalFetch2 = window.fetch;
  
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    return originalFetch2.call(this, input, init)
      .then(response => {
        // If this request has the SSE URL
        if (url === 'https://core-pickaxe-api.pickaxe.co/stream') {
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('text/event-stream')) {
            
            // PATTERNS CONFIGURATION - Now a dictionary/object
  
            const PATTERN_REPLACEMENTS = {
            
                  '\\[': '\n $$ \n',     // Replace \[ with $$
                  '\\]': '\n $$ \n',     // Replace \] with $$
                  '\\(': ' $$ ',     // Replace \( with $$
                  '\\)': ' $$ ',     // Replace \) with $$
                  '<think>':'<div id=\'reason\' class=\'reasoning\'>',
                  '</think>':'</div>',
            };
  
  
            // Get all patterns for partial detection
            const ALL_PATTERNS = Object.keys(PATTERN_REPLACEMENTS);
            
            // Get the original response body stream
            const originalStream = response.body;
            const reader = originalStream.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            
            // Buffer to handle partial patterns across chunks
            let partialBuffer = '';
            
            // Get the abort signal if it exists
            const abortSignal = init?.signal;
            let isAborted = false;
  
            
            // Create a new ReadableStream that will process and pass through the data
            const newStream = new ReadableStream({
              async start(controller) {
                
                // Set up abort handler if signal exists
                const handleAbort = async () => {
                    console.log("handleAbort");
                    isAborted = true;

                    try {
                        await reader.cancel();
                    } catch (err) {
                    }

                    try {
                        controller.close();
                    } catch (err) {
                    }
                };
                
                if (abortSignal) {

                  if (abortSignal.aborted) {
                    // Already aborted
                    handleAbort();
                    return;
                  }
                  
                  // Listen for abort event
                  abortSignal.addEventListener('abort', handleAbort);
                }
                
                let mathBuffer = '';
                async function pump() {
                  try {
                    // Check if aborted before reading
                    if (isAborted) {;
                      return;
                    }
                    
                    const { done, value } = await reader.read();
                    
                    if (done) {
  
                      // Clean up abort listener if it exists
                      if (abortSignal) {
                        abortSignal.removeEventListener('abort', handleAbort);
                      }
                      
                      controller.close();
                      return;
                    }
                    
                    // Check again after read in case abort happened during read
                    if (isAborted) {
                      return;
                    }
                    
                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // Parse the SSE lines and modify token content
                    let mathModeOn = false
                    let modifiedChunk = '';
                    const lines = chunk.split('\n');
                    
                    lines.forEach(line => {
                      if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        try {
                          const parsed = JSON.parse(jsonStr);
                          if (parsed.token) {
                            // Combine with partial buffer for pattern detection
                            let tokenToProcess = partialBuffer + parsed.token;
                            
                            // Replace all pattern instances with their specific replacements
                            let modifiedToken = tokenToProcess;
                            let patternsFound = false;
  
                            if (modifiedToken.includes("$")){
                              mathModeOn = true
                            }
  
                            // substitute on the modified token
                            Object.entries(PATTERN_REPLACEMENTS).forEach(([pattern, replacement]) => {
                              if (modifiedToken.includes(pattern)) {
                                
                                patternsFound = true;
                                // Replace all instances of the pattern with its specific replacement
                                modifiedToken = modifiedToken.split(pattern).join(replacement);
                              }
                            });
  
                            // Handle partial patterns at the end
                            partialBuffer = '';
                            let longestPartial = '';
                            
                            ALL_PATTERNS.forEach(pattern => {
                              for (let i = pattern.length - 1; i > 0; i--) {
                                const partialPattern = pattern.substring(0, i);
                                if (modifiedToken.endsWith(partialPattern)) {
                                  if (partialPattern.length > longestPartial.length) {
                                    longestPartial = partialPattern;
                                  }
                                }
                              }
                            });
                            
                            if (longestPartial) {
                              // Remove the partial from the token and store it in buffer
                              partialBuffer = longestPartial;
                              modifiedToken = modifiedToken.slice(0, -longestPartial.length);
                            }
                            
                            // Reconstruct the data line with modified token
                            parsed.token = modifiedToken;
                            modifiedChunk += 'data: ' + JSON.stringify(parsed) + '\n';
  
                          } else {
                            // Non-token data, pass through unchanged
                            modifiedChunk += line + '\n';
                          }
                        } catch (e) {
                          // Non-JSON lines, pass through unchanged
                          modifiedChunk += line + '\n';
                        }
                      } else {
                        // Non-data lines, pass through unchanged
                        modifiedChunk += line + '\n';
                      }
                    });
                    
                    // Remove the extra newline at the end if present
                    if (modifiedChunk.endsWith('\n\n')) {
                      modifiedChunk = modifiedChunk.slice(0, -1);
                    } else if (chunk.endsWith('\n') && !modifiedChunk.endsWith('\n')) {
                      modifiedChunk += '\n';
                    }
  
  
                    
                    const mathBufferlines = modifiedChunk.split('\n');
  
                    mathBufferlines.forEach(line => {
                      if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        try {
                          const parsed = JSON.parse(jsonStr);
                          if (parsed.token) {
                            mathBuffer = mathBuffer + parsed.token;
                          }
                        } catch {
  
                        }
                      }
                    })  
  
                    if (mathModeOn || mathBuffer.includes('$')){
                      
                      if (mathBuffer.length < 250 && !mathBuffer.includes("[DONE]")){
                        //just keep reading to keep adding to the maths buffer
                      } else {
                        mathBuffer = mathBuffer.replace(/([\s.(,"'])\$([^$]+)\$([\s.),"])/g, '$1$$$$$2$$$$$3');
                        if (mathBuffer.includes("[DONE]")){
                          mathBuffer = mathBuffer.replace("[DONE]","")
                        }
                        let mathModifiedChunk = '\nevent:delta\ndata: {\"token\": '+JSON.stringify(mathBuffer)+'}\n\n';
                        controller.enqueue(encoder.encode(mathModifiedChunk));
                 
                        mathBuffer = '';
                      }
  
                    } else {
                      // Encode and send the modified chunk
                      controller.enqueue(encoder.encode(modifiedChunk));
           
                      mathBuffer = '';
                    }
                    
  
                      
                      // Continue reading
                    pump();
                  } catch (error) {
                
                    // Clean up abort listener if it exists
                    if (abortSignal) {
                      abortSignal.removeEventListener('abort', handleAbort);
                    }
                    
                    // Propagate the error
                    if (error.name === 'AbortError' || isAborted) {
                      try {
                        controller.close();
                      } catch (_) {}
                    } else {
                      controller.error(error);
                    }
                  }
                }
                
                pump();
              },
              
              cancel(reason) {
        
                isAborted = true;
                
                // Cancel the underlying reader
                return reader.cancel(reason).catch(err => {
            
                });
              }
            });
            
            // Create a new Response with our stream and the original headers
            const newResponse = new Response(newStream, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
            
       
            return newResponse;
          }
        }
        
        // Return the original response for non-SSE endpoints
        return response;
      });
  };
  
  
  let originalFetch = window.fetch;
  
  // Overwrite the global fetch function
  window.fetch = async function(...args) {
  
      const [url, config] = args;
  
     
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
       
      if (url.includes("https://core-pickaxe-api.pickaxe.co/stream")){
  
      
          currentAbortController = new AbortController();
          const signal = currentAbortController.signal;
         
  
          try {  
          setTimeout(() => {
              addEditButton();
            }, 2000);
          const response = await originalFetch(url, { ...config, signal }); //Original fetch
          const out = response.clone(); // return this to your UI
          
  
         (async () => {
              try {
                  const r = out.body.getReader();
                  while (!(await r.read()).done) {}
        
                  currentAbortController = null;
          
                  errorMessageHandler();
                  setTimeout(() => {
                      syncConversation(responseId, formId, studioUserId, pastedContent, url);
                  }, 2000);
              } catch (_) {}
          })();
  
  
  
  
          return response;
  
          } catch (error) {
  
        
          stopButtonOff()
  
          }
      
      } 
      else {
          return await originalFetch(url, {...config});
      }
  };
  
  
  function stopStream() {
    if (currentAbortController) {
        console.log(currentAbortController)
        currentAbortController.abort();
    }

    const txtBox = document.querySelector('textarea.resize-none');
    if (txtBox) {
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        ).set;
        nativeTextareaValueSetter.call(txtBox, latestRequest);
        const inputEvent = new Event('input', { bubbles: true });
        txtBox.dispatchEvent(inputEvent);
    }

    setTimeout(function() {
        // 1. Target the error box and last message
        var errBox = document.querySelector('div.text-\\[14px\\].max-\\[1024px\\]\\:text-\\[14px\\].max-\\[899px\\]\\:text-\\[14px\\].font-semibold');
        if (errBox) {
            errBox.textContent = "This response was stopped by the user.";
        }

        var allMsgs = document.querySelectorAll('div.gap-y-3.text-left');
        var lastMsg = allMsgs[allMsgs.length - 1];
        if (!lastMsg) return;

        lastMsg.style.backgroundColor = 'rgba(200, 200, 200, 0.5)';

        // 2. CHECK: Does the lastMsg already have a "Stopped" label?
        // We look inside lastMsg for any <small> tags containing "Stopped"
        const alreadyHasLabel = Array.from(lastMsg.querySelectorAll('small'))
                                     .some(el => el.textContent === 'Stopped');

        // 3. ONLY append if it doesn't exist yet
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
  
  
 function addEditButton() {
    // 1. CLEANUP: Remove any existing edit buttons to ensure only one exists
    const existingButtons = document.querySelectorAll('.edit-btn-wrapper');
    existingButtons.forEach(btn => btn.remove());

    // 2. TARGET: Find the messages and the specific target container
    const allMsgs = document.querySelectorAll('div.gap-y-3.text-left');
    if (allMsgs.length === 0) return; 

    const messageDiv = allMsgs[allMsgs.length - 1];
    const container = messageDiv.closest("div.flex.gap-x-3");

    if (!container) return; // Safety check if the DOM structure differs

    // 3. BUILD: Define the button HTML
    const buttonHTML = `
        <div class="flex h-4 items-center justify-end gap-3 edit-btn-wrapper" 
             style="margin-top: 8px; opacity: 0; transition: opacity 0.3s ease-in-out;">
          <button id="edit-button" 
            class="flex items-center gap-1 opacity-70 outline-none hover:opacity-100"
            style="color: rgb(0, 0, 0); cursor: pointer; background: none; border: none;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-4 h-4 shrink-0">
              <path fill="grey"
                d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z">
              </path>
            </svg>
          </button>
        </div>
    `;

    // 4. INJECT: Add class for layout and insert the button
    container.classList.add('flex-col');
    messageDiv.insertAdjacentHTML('afterend', buttonHTML);

    const wrapper = messageDiv.nextElementSibling;
    const editButton = wrapper.querySelector('#edit-button');

    // 5. ANIMATE: Fade in effect
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrapper.style.opacity = "1";
        });
    });

    // 6. ACTION: Event Listener
    editButton.addEventListener('click', function () {
        // A. Handle Stream Interruption
        // If a message is still generating, stop it before we try to edit
        const messageStillGenerating = typeof currentAbortController !== 'undefined' && currentAbortController !== null;
        if (messageStillGenerating) {
            stopStream();
        }

        // B. Data Extraction
        const markdownDiv = messageDiv.querySelector('.pxe-markdown');
        if (!markdownDiv) {
            console.error("Could not find .pxe-markdown content");
            return;
        }
        const text = markdownDiv.innerText.trim();

        // C. Inject into Textarea
        const txtBox = document.querySelector('textarea.resize-none');
        if (txtBox) {
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            ).set;
            
            // Set the text and trigger the input event for React/Framework sync
            setter.call(txtBox, text);
            txtBox.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Move focus to the textarea so the user can type immediately
            txtBox.focus();
        }
    });
}
  
  
  
  
  
  
  
  // ============= XHL Replacing Characters
  
  const originalXHR2 = XMLHttpRequest;
  
  
  XMLHttpRequest = function() {
    const xhr = new originalXHR2();
    
    const PATTERN_REPLACEMENTS = {
      
      '\\\\[': '\\n $$ \\n',     // Replace \[ with $$
      '\\\\]': '\\n $$ \\n',     // Replace \] with $$
      '\\\\(': ' $$',     // Replace \( with $$
      '\\\\)': ' $$ ',     // Replace \) with $$
      '<think>':'<div id=\'reason\' class=\'reasoning\'>',
      '</think>':'</div>',
    };
  
    // Store the original open method
    const originalOpen = xhr.open;
    let requestUrl = '';
    
    // Override the open method to capture the URL
    xhr.open = function(method, url, ...args) {
      requestUrl = url;
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    // Override the responseText getter
    Object.defineProperty(xhr, 'responseText', {
      get: function() {
        let originalResponse = Object.getOwnPropertyDescriptor(originalXHR2.prototype, 'responseText').get.call(this);
        
        // Check if this is from the chat conversation endpoint and we have a response
        if (requestUrl && requestUrl.startsWith('https://core-pickaxe-api.pickaxe.co/conversation') && originalResponse) {
          // Apply all pattern replacements using simple string replacement
          let modifiedResponse = originalResponse;
          for (const [pattern, replacement] of Object.entries(PATTERN_REPLACEMENTS)) {
            modifiedResponse = modifiedResponse.replaceAll(pattern, replacement);
          }
  
          modifiedResponse = modifiedResponse.replace(/([\s.(,"'])\$([^$]+)\$([\s.),"])/g, '$1$$$$$2$$$$$3');
          
          // Log right before returning
          
          return modifiedResponse;
        }
        
        return originalResponse;
      }
    });
    
    return xhr;
  };
  
  
  
  
  
  
  //Event listener for the click on expand thinging
  document.addEventListener('click', function(e) {
      if (e.target.classList.contains('reasoning')) {
          e.target.classList.toggle('expanded');
      }
  });
  
  
  
  // Overwrite the global xml object
  const OriginalXHR = XMLHttpRequest;
  
  
  XMLHttpRequest = new Proxy(OriginalXHR, {
  construct(target, args) {
      const xhr = new target(...args);
      let interceptedUrl = '';
  
      const originalOpen = xhr.open;
      xhr.open = function(method, url, ...rest) {
  
      interceptedUrl = url; // Store the URL for later use
      return originalOpen.apply(this, [method, url, ...rest]);
      };
  
      const originalSend = xhr.send;
      xhr.send = function(body) {
  
      if (interceptedUrl.includes("https://core-api.pickaxe.co/feedback")) {   
    
          
          // Parse the body if it's a string, or use it directly if it's already an object
          let payloadData;
          try {
          payloadData = typeof body === 'string' ? JSON.parse(body) : body;
          } catch (e) {
          payloadData = body; // Use as-is if parsing fails
          }
          
          originalFetch("https://hooks.zapier.com/hooks/catch/8011346/u9d1eee/", {
          method: "POST",
          body: JSON.stringify(payloadData)
          });
      }
      
      return originalSend.apply(this, [body]);
      };
  
      return xhr;
  }
  });
  



//========FOOOT



//Stop Button
let bgcols = []

function stopButtonOn(handleClick, toggleHover){

    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button"); //Select textbox
    const sendButton = txtBoxButtons[txtBoxButtons.length - 1]; //Select last element among textbox buttons

    sendButton.removeEventListener('click', handleClick) //Remove if already exists, otherwise do nothing 
    sendButton.removeEventListener('mouseenter', toggleHover)
    sendButton.removeEventListener('mouseleave', toggleHover)

    //change it to a square
    //sendButton.querySelector("svg").querySelector("path").setAttribute('d', "M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"); 


    //and change its functionality
    sendButton.removeAttribute('disabled'); //enable it if disabled, otherwise do nothing
    sendButton.addEventListener('click', handleClick);
    sendButton.addEventListener('mouseenter', toggleHover);
    sendButton.addEventListener('mouseleave', toggleHover);

    setTimeout(stopButtonUpdate,500);  //recheck in 500ms to see if still loading.
}

function stopButtonOff(handleClick,toggleHover){

    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button"); //Select textbox
    const sendButton = txtBoxButtons[txtBoxButtons.length - 1]; //Select last element among textbox buttons
    const svg = sendButton.querySelector("svg").querySelector("path");
    svg.setAttribute('d', "m16.175 11-5.6-5.6L12 4l8 8-8 8-1.425-1.4 5.6-5.6H4v-2z");
    sendButton.removeEventListener('click', handleClick);
    sendButton.removeEventListener('mouseenter', toggleHover);
    sendButton.removeEventListener('mouseleave', toggleHover);
}

function handleClick(event) {

    console.log("Stop-Click")

    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button"); //Select textbox
    const sendButton = txtBoxButtons[txtBoxButtons.length - 1]; //Select last element among textbox buttons

    event.preventDefault();
    event.stopPropagation();
    stopStream();
    if(sendButton){
        sendButton.querySelector("svg").querySelector("path").setAttribute('d', "m16.175 11-5.6-5.6L12 4l8 8-8 8-1.425-1.4 5.6-5.6H4v-2z");
        sendButton.setAttribute("style",bgcols[0])
        sendButton.removeEventListener('click', handleClick);
    }


}
        
function toggleHover(e) {

    //receives only mouseenter & mouseleave events. If enter then bg1 else then bg0
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button"); //Select textbox
    const sendButton = txtBoxButtons[txtBoxButtons.length - 1]; //Select last element among textbox buttons
    if (sendButton){
        sendButton.setAttribute("style", e.type === 'mouseenter' ? bgcols[1] : bgcols[0]); 
    }
    
}


function stopButtonUpdate(){
    
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button"); //Select textbox

    const sendButton = txtBoxButtons[txtBoxButtons.length - 1]; 
    
    if (sendButton){
        
        currentStyle = sendButton.getAttribute("style")
        if (!bgcols.includes(currentStyle)){
            bgcols.push(currentStyle)
        }

        const txtBoxArea = document.querySelector('textarea.resize-none').closest("div.relative.flex");
        const stopList = txtBoxArea.querySelectorAll('path[d="M6 6h12v12H6z"]'); //querying the list of disabled buttons

        if (stopList.length > 0){  //if there is a stop button

            stopButtonOn(handleClick,toggleHover);

        } else {
            stopButtonOff(handleClick,toggleHover);
            
        }
    }
}

let cooloff = false;

function addTextAreaId (){

  if (!document.querySelector("#text-area")){
    const textArea = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")
    if (textArea) {

      textArea.id = "text-area"

      console.log("Text Area Loaded")
      //===========Once a text-area is found

      //Start observing text area for stop buttons
      const observer2 = new MutationObserver(stopButtonUpdate); 
      observer2.observe(textArea, {
        childList: true,
        subtree: true
      });

      // Start observing enter for clicks
      const sendButtonDiv = document.querySelector('textarea.resize-none')?.closest('div.relative.flex')
        ?.querySelectorAll("button");
      const sendButton = sendButtonDiv?.[sendButtonDiv.length - 1];
      sendButton.addEventListener('click', function() {
        cooloff = true;
        setTimeout(() => {
              cooloff = false;
            }, 500);
      });

      //=========================
      
    } else {
      console.log("TextArea not found")
    }
  } else {
    console.log("TextArea found")
  }
  
}


const observer = new MutationObserver(addTextAreaId); //observe whole document for any changes
    observer.observe(document.body, {
    childList: true,
    subtree: true
});






//Paste
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const fileInputSelector = 'input#file-upload';
  const targetSelector = 'textarea.resize-none';
  pastedContent = [];

  const getInput = () => document.querySelector(fileInputSelector);
  const triggerChange = (el) => el && el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  // paste handler (unchanged)
  document.addEventListener('paste', (e) => {
    if (!e.target.matches(targetSelector)) return;
    const items = (e.clipboardData || window.clipboardData).items;

    const dt = e.clipboardData || window.clipboardData;
    const text = dt.getData('text/plain');
    if (text && !text.trim().startsWith('{')) {
        pastedContent.push(text);
    }
  });
});

    /*
    setTimeout( function(){ console.log("pasted: ",pastedContent)},500)
    let imageFile = null;
    for (const it of items) { if (it.type?.startsWith('image/')) { imageFile = it.getAsFile(); break; } }
    if (!imageFile) return;
    e.preventDefault();
    const input = getInput(); if (!input) return;
    if (window.DataTransfer) {
      const dt = new DataTransfer();
      dt.items.add(imageFile);
      input.files = dt.files;
      triggerChange(input);
    }
    
  });

  // drag anywhere in the window -> accept ANY file type
  window.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();

    const input = getInput(); if (!input) return;
    const files = e.dataTransfer.files; if (!files?.length) return;

    // keep ALL dropped files (any type). If your input lacks `multiple`, the browser will use the first.
    input.files = files;
    triggerChange(input);
  });
});
*/




//Share
document.addEventListener('DOMContentLoaded', function () {
  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.setAttribute('aria-label', 'Share');
  shareButton.style.backgroundColor = '#ffffff';
  shareButton.style.color = '#111';
  shareButton.style.position = 'fixed';
  shareButton.style.top = '70px';
  shareButton.style.right = '20px';
  shareButton.style.zIndex = '9999';
  shareButton.style.border = '1px solid rgba(0,0,0,0.12)';
  shareButton.style.padding = '8px 17px';
  shareButton.style.display = 'flex';
  shareButton.style.alignItems = 'center';
  shareButton.style.gap = '8px';
  shareButton.style.borderRadius = '7px';
  shareButton.style.width = "100px";
  shareButton.style.cursor = 'pointer';
  shareButton.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  shareButton.style.fontSize = '14px';
  shareButton.style.fontWeight = '600';
  shareButton.style.lineHeight = '1';
  shareButton.style.transition = 'transform .12s ease, box-shadow .2s ease, background-color .2s ease';

  shareButton.onmouseover = function() {
    shareButton.style.transform = 'translateY(-1px)';
    shareButton.style.boxShadow = '0 6px 14px rgba(0,0,0,0.15)';
  };
  shareButton.onmouseout = function() {
    shareButton.style.transform = 'none';
    shareButton.style.boxShadow = 'none';
  };

  shareButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 16V3"></path>
      <path d="M7 8l5-5 5 5"></path>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path>
    </svg>
    <span>Share</span>`
    ;

    
  document.body.appendChild(shareButton);

  const messageSelector = '.grid.grid-cols-1.gap-y-6.w-full > div';
  let widthWindow = window.innerWidth, navbarOpen = document.querySelector(".overflow-hidden.shadow"), bigNavbar=false, mobileBreakpoint=940;

  function updateButtonVisibility(){
    widthWindow = window.innerWidth;
    navbarOpen = document.querySelector(".overflow-hidden.shadow");
    bigNavbar = !!(navbarOpen && widthWindow <= 900);
    //mobileBreakpoint = navbarOpen ? 1240 : 940;
    mobileBreakpoint = 1080;

    const hasMessages = document.querySelectorAll(messageSelector).length > 0;
    if (hasMessages && widthWindow > mobileBreakpoint && !bigNavbar){  //windon big has messages
      //setTimeout(()=>{ shareButton.style.bottom='20px'; },100);
      shareButton.style.display='flex';
      shareButton.style.right="50px";
      setTimeout(()=>{ shareButton.style.opacity='1'; },10);
    } else if (hasMessages && !bigNavbar){  //navbar closed window small has messages
      shareButton.style.display='flex';
      shareButton.style.right="20px";
      //setTimeout(()=>{ shareButton.style.bottom='80px'; },100);
      setTimeout(()=>{ shareButton.style.opacity='1'; },10);
    } else {  //disappear button
      shareButton.style.opacity='0';
      setTimeout(()=>{ shareButton.style.display='none'; },300);
    }
  }

  const observer = new MutationObserver(updateButtonVisibility);
  observer.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('resize', updateButtonVisibility);
  updateButtonVisibility();

  function loadHtml2Pdf(){
    return new Promise((resolve,reject)=>{
      if (window.html2pdf) return resolve();
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error('Failed to load html2pdf.js'));
      document.head.appendChild(s);
    });
  }

  shareButton.addEventListener('click', async function(){
    const proceed = confirm("Do you want to download this conversation to share as a PDF?");
    if (!proceed) return;

    const messageRows = document.querySelectorAll(messageSelector);
    if (messageRows.length === 0){
      alert('No conversation messages were found on the page.');
      return;
    }

    // Collect external + inline styles (helps fidelity)
    let capturedStyles = '';
    const stylesheetLinks = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of stylesheetLinks){
      try {
        const res = await fetch(link.href, {mode:'cors'});
        if (res.ok) capturedStyles += `<style>${await res.text()}</style>\n`;
      } catch(e){}
    }
    document.querySelectorAll('head > style').forEach(st => { capturedStyles += st.outerHTML + '\n'; });
    capturedStyles += `
      <style>
        ${messageSelector} { margin-bottom: 40px !important; }
        #export-header { padding:20px; border-bottom:2px solid #eee; margin-bottom:20px; text-align:center; font-family:sans-serif; }
        #chat-container-wrapper { max-width: 900px; margin: 20px auto; padding: 0 20px; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style>
    `;

    const pageTitle = document.title || 'Chat History';
    const exportHeader = `
      <div id="export-header">
        <h1 style="font-size:24px; margin:0;">${pageTitle}</h1>
        <p style="margin:5px 0 0; color:#555;">URL: <a href="${window.location.href}" target="_blank">${window.location.href}</a></p>
        <p style="margin:5px 0 0; color:#555;">Exported on: ${new Date().toLocaleString()}</p>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = capturedStyles +
      `<div id="chat-container-wrapper">${exportHeader}${Array.from(messageRows).map(n=>n.outerHTML).join('')}</div>`;
    // Keep it offscreen while rendering
    wrapper.style.position='fixed';
    wrapper.style.left='-99999px';
    document.body.appendChild(wrapper);

    const now = new Date(); now.setHours(now.getHours()+2);
    const timestamp = now.toISOString().slice(0,16).replace("T","_").replace(/:/g,"-");
    const filename = `chat_history_${timestamp}.pdf`;

    try {
      await loadHtml2Pdf();
      await html2pdf()
        .set({
          margin:       [10,10,10,10],
          filename:     filename,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false, letterRendering: true },
          jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
        })
        .from(wrapper.querySelector('#chat-container-wrapper'))
        .save();
    } catch (err){
      alert('Could not generate PDF.');
    } finally {
      document.body.removeChild(wrapper);
    }
  });
});



// Dashboard update
dashLinkUpdate = function () {

const iframe = document.getElementById("Embedded Dashboard");
if (iframe && iframe.src === "https://dashboard-app-395477780264.europe-west1.run.app/") {
    const nextDataEl = document.getElementById("__NEXT_DATA__");
    if (!nextDataEl) return;
    const nextData = JSON.parse(nextDataEl.textContent);
    studioUserId = nextData.props?.pageProps?.studioUserId

    iframe.src = "https://dashboard-app-395477780264.europe-west1.run.app/?userid="+ studioUserId; // <-- new URL here
    document.getElementById("Link Dashboard").href = "https://dashboard-app-395477780264.europe-west1.run.app/?userid="+ studioUserId; 
}
};

  const observer2 = new MutationObserver(dashLinkUpdate); //observe whole document for any changes
    observer2.observe(document.body, {
    childList: true,
    subtree: true

    });



// enter to send

/*
document.addEventListener('keydown', function(event) {
  // Only act on plain Enter (no modifiers)
  setTimeout(() => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const sendButtonDiv = document.querySelector('#studio-root textarea.resize-none')
        ?.closest('div.relative.flex')
        ?.querySelectorAll("button");

      const sendButton = sendButtonDiv?.[sendButtonDiv.length - 1];

      if (sendButton && !cooloff) {
        event.preventDefault(); // prevent default newline behavior
        sendButton.click();
        console.log("Send Button Autoclicked")
        cooloff = true;
        setTimeout(() => {
          cooloff = false;
        }, 500);
      }
    }
  },100);
});

*/
