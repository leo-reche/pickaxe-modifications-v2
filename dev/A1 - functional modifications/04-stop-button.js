//Stop Button
let bgcols = []

function stopButtonOn(handleClick, toggleHover){
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button");
    const sendButton = txtBoxButtons?.[txtBoxButtons.length - 1];

    if (!sendButton) return;

    sendButton.removeEventListener('click', handleClick);
    sendButton.removeEventListener('mouseenter', toggleHover);
    sendButton.removeEventListener('mouseleave', toggleHover);

    sendButton.removeAttribute('disabled');
    sendButton.addEventListener('click', handleClick);
    sendButton.addEventListener('mouseenter', toggleHover);
    sendButton.addEventListener('mouseleave', toggleHover);

    setTimeout(stopButtonUpdate, 500);
}

function stopButtonOff(handleClick,toggleHover){
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button");

    const sendButton = txtBoxButtons?.[txtBoxButtons.length - 1];

    if (!sendButton) return;

    const svg = sendButton.querySelector("svg")?.querySelector("path");
    if (svg) {
        svg.setAttribute('d', "m16.175 11-5.6-5.6L12 4l8 8-8 8-1.425-1.4 5.6-5.6H4v-2z");
    }

    sendButton.removeEventListener('click', handleClick);
    sendButton.removeEventListener('mouseenter', toggleHover);
    sendButton.removeEventListener('mouseleave', toggleHover);

}

function handleClick(event) {
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button");
    const sendButton = txtBoxButtons[txtBoxButtons.length - 1];

    event.preventDefault();
    event.stopPropagation();

    stopStream();

    if (sendButton) {
        sendButton.querySelector("svg").querySelector("path").setAttribute('d', "m16.175 11-5.6-5.6L12 4l8 8-8 8-1.425-1.4 5.6-5.6H4v-2z");
        sendButton.setAttribute("style", bgcols[0]);
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
    const txtBoxButtons = document.querySelector('textarea.resize-none')?.closest("div.relative.flex")?.querySelectorAll("button");
    const sendButton = txtBoxButtons?.[txtBoxButtons.length - 1];

    if (sendButton){
        const currentStyle = sendButton.getAttribute("style");

        if (currentStyle && !bgcols.includes(currentStyle)){
            bgcols.push(currentStyle);
        }

        const txtBoxArea = document.querySelector('textarea.resize-none')?.closest("div.relative.flex");

        const stopList = txtBoxArea?.querySelectorAll('path[d="M6 6h12v12H6z"]');

        if (stopList && stopList.length > 0){
            stopButtonOn(handleClick, toggleHover);
        } else {
            stopButtonOff(handleClick, toggleHover);
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






