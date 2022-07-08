let timeButtons = 0;
let thisRide = null;

const typeColorMap = {
    "normal":"#aec8a8",
    "alert":"#ec4d4d"
};
const Http = new XMLHttpRequest();

//control for the message prompt
const messagePrompt = new promptControl();

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return false;
}

function w_avg(values, counts) {
    totalproduct = 0;
    totalcount = 0;

    for (let i in values) {
        totalproduct += values[i] * counts[i];
        totalcount += counts[i];
    }

    return totalproduct / totalcount;
}

function numberToStringFormatter(value, decimals) {
    stringValue = value.toString();

    if (stringValue.indexOf('.') == -1) {
        let appendDecimals = "";
        for (let i = 0; i < decimals; i++) {
            appendDecimals = appendDecimals + "0";
        }
        
        stringValue = stringValue + "." + appendDecimals;
    } else {
        if (stringValue.split('.')[1].length < decimals) {
            for (let i = stringValue.split('.')[1].length; i < decimals; i++) {
                stringValue = stringValue + "0";
            }
        }
    }

    return stringValue
}

function timeStringFormater(dateForFormat) {
    let hours = dateForFormat.getUTCHours().toString();
    let minutes = dateForFormat.getUTCMinutes().toString();
    let seconds = dateForFormat.getUTCSeconds().toString();

    hours = hours.length == 1 ? "0" + hours : hours;
    minutes = minutes.length == 1 ? "0" + minutes : minutes;
    seconds = seconds.length == 1 ? "0" + seconds : seconds;

    let timeString = hours + ":" + minutes + ":" + seconds;

    return timeString;
}

function showButtons(panelId) {
    panelElement = document.getElementById(panelId);
    
    panelElement.style.display = "block";
    panelElement.style.height = "0px";
    panelElement.classList.add("openButtonPanelAnimate");
    setTimeout(() => {
        panelElement = document.getElementById(panelId);

        panelElement.style.height = "64px";
        panelElement.classList.remove("openButtonPanelAnimate");

        // get all buttons
        buttons = panelElement.getElementsByTagName('button');

        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.classList.remove("hiddenButton");
            button.classList.add("showButtonAnimation");
        }

        setTimeout(() => {
            panelElement = document.getElementById(panelId);
            buttons = panelElement.getElementsByTagName('button');

            for (let i = 0; i < buttons.length; i++) {
                let button = buttons[i];
                button.classList.remove("showButtonAnimation");
            }
        }, 200);
    }, 1000);
}

function hideButtons(panelId) {
    panelElement = document.getElementById(panelId);
    buttons = panelElement.getElementsByTagName('button');

    for (let i = 0; i < buttons.length; i++) {
        let button = buttons[i];
        button.classList.add("hideButtonAnimation");
    }

    setTimeout(() => {
        panelElement = document.getElementById(panelId);
        buttons = panelElement.getElementsByTagName('button');

        for (let i = 0; i < buttons.length; i++) {
            let button = buttons[i];
            button.classList.remove("hideButtonAnimation");
            button.classList.add("hiddenButton");
        }

        panelElement.classList.add("closeButtonPanelAnimate");

        setTimeout(() => {
            panelElement = document.getElementById(panelId);

            panelElement.style.display = "none";
            panelElement.classList.remove("closeButtonPanelAnimate");
        }, 1000);
    }, 200);
}

function toggleTimeButtons() {
    if (timeButtons == 0) {
        showButtons('timeButtons');
        timeButtons = 1;
    } else {
        hideButtons('timeButtons');
        timeButtons = 0;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    thisRide = new rideControl(getCookie('name'));
    thisRide.resetRide();
});