 function getCleanEditableMessageText(messageDiv) {
    const markdownDiv = messageDiv.querySelector('.pxe-markdown');
    if (!markdownDiv) return null;

    const clone = markdownDiv.cloneNode(true);
    clone.querySelectorAll('.sp-snippets, .fb-snippets, .sp-snippet, .fb-snippet').forEach(el => el.remove());

    return clone.innerText.trim();
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
        const messageStillGenerating = typeof currentAbortController !== "undefined" && currentAbortController !== null;
        if (messageStillGenerating) {
            abortCurrentStreamOnly();
        }

        // B. Data Extraction
        const text = getCleanEditableMessageText(messageDiv);
        if (text === null) {
            console.error("Could not find .pxe-markdown content");
            return;
        }

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
  
  
  
  
  
  
  
