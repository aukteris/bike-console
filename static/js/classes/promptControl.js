class promptControl {
    constructor() {
        this.promptTimeout = null;
        this.promptMessageQueue = [];
    }

    showPrompt(message, duration, type) {
        let promptData = [message,duration,type];
    
        let skip = false;
    
        if (this.promptMessageQueue.length == 0) {
            let promptElement = document.getElementById('prompt');
    
            promptElement.style.display = "block";
            promptElement.classList.add("openAnimation");
    
            this.promptTimeout = setTimeout(function(){this.loopAllPromptMessages() }.bind(this), 500);
            setTimeout(() => {
                let promptElement = document.getElementById('prompt');
                promptElement.classList.remove("openAnimation");
            }, 1000)
        } else {
            if (this.promptMessageQueue.length > 0) {
                for (let i in this.promptMessageQueue) {
                    if (this.promptMessageQueue[i][0] == promptData[0]) {skip = true;}
                }
            }
        }
        if (skip == false) this.promptMessageQueue.push(promptData);
    }

    loopAllPromptMessages() {

        let promptData = this.promptMessageQueue[0];
    
        let promptElement = document.getElementById('prompt');
    
        promptElement.innerHTML = promptData[0]
        promptElement.style.opacity = "100";
        promptElement.style.color = typeColorMap[promptData[2]];
        promptElement.classList.remove("fadeOutAnimation");
        promptElement.classList.add("fadeInAnimation");
    
        setTimeout(function() {
            let promptElement = document.getElementById('prompt');
            promptElement.style.opacity = "0"
            promptElement.classList.remove("fadeInAnimation");
            promptElement.classList.add("fadeOutAnimation");
    
            this.promptMessageQueue.splice(0, 1);
    
            if (this.promptMessageQueue.length == 0) this.closePrompt();
    
            setTimeout(function() {
                promptElement.classList.remove("fadeOutAnimation");
                if (this.promptMessageQueue.length > 0) this.loopAllPromptMessages();     
            }.bind(this), 500);
        }.bind(this), promptData[1]);
    }

    closePrompt() {
        let promptElement = document.getElementById('prompt');
        promptElement.classList.add("closeAnimation");
        setTimeout(function() {
            promptElement = document.getElementById('prompt');
            promptElement.style.display = "none";
            promptElement.classList.remove("closeAnimation");
        }, 1000)
    }
}