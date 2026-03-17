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





// Is the sidebar open?

function getSidebarEl() {
  return document.querySelector(
    'div.glass-dynamic.group.fixed.left-0.top-0.z-\\[100100\\].m-4.flex.flex-col.overflow-hidden.max-\\[859px\\]\\:m-0.max-\\[859px\\]\\:rounded-none.max-\\[859px\\]\\:border-0.max-\\[859px\\]\\:shadow-none'
  );
}

function isSidebarOpen() {
  const sidebar = getSidebarEl();
  if (!sidebar) return false;

  const style = sidebar.getAttribute('style') || '';
  return style.includes('height: calc(-48px + 100dvh)') && style.includes('width: 317px');
}

function updateSidebarShift() {
  document.body.classList.toggle('fc-sidebar-open', isSidebarOpen());
}

function observeSidebarState() {
  let sidebarObserver = null;

  function bindToSidebar() {
    const sidebar = getSidebarEl();

    if (!sidebar) {
      document.body.classList.remove('fc-sidebar-open');
      return;
    }

    if (sidebarObserver) sidebarObserver.disconnect();

    updateSidebarShift();

    sidebarObserver = new MutationObserver(() => {
      updateSidebarShift();
    });

    sidebarObserver.observe(sidebar, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  bindToSidebar();

  const pageObserver = new MutationObserver(() => {
    const sidebar = getSidebarEl();
    if (sidebar && (!sidebarObserver || !sidebar.isConnected)) {
      bindToSidebar();
    } else if (!sidebar) {
      document.body.classList.remove('fc-sidebar-open');
    }
  });

  pageObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

observeSidebarState();