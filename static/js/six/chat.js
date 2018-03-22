let SOCKET = new WebSocket("ws://posync-position-sync.7e14.starter-us-west-2.openshiftapps.com/:8080/");

let CHAT = async() =>
{
    let uuid = uuidv4();
    let userid = "user_" + uuid;

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // wait for connection
    while(SOCKET.readyState != 1)
    {
        console.log("pending connection to chat socket..");
        await new Promise((r) => setTimeout(r, 100));
    }
    console.log("connected to chat server.");

    // start listening chat
    SOCKET.send(JSON.stringify({
        userid: userid
    }));

    // message income
    SOCKET.onmessage = (event) =>
    {
        let line = document.createElement("div");
        line.textContent = event.data;
        chat_history.appendChild(line);
        chat_history.scrollTo(0, chat_history.scrollHeight);
    }

    // send message
    var is_chatting = false;
    document.addEventListener("keydown", (e)=>
    {
        if (e.keyCode != 13) { return; }

        if (!is_chatting)
        {
            message_input.style.visibility = "visible";
            message_input.focus();
            message_input.scrollTo(0, message_input.scrollHeight);
            is_chatting = true;
        }
        else
        {
            if (message_input.value == "")
            {
                return;
            }

            message_input.style.visibility = "hidden";
            is_chatting = false;

            SOCKET.send(JSON.stringify({
                userid: userid,
                username: username.value,
                msg: message_input.value,
            }));
            message_input.value = "";
        }

        return;
    });
}
CHAT().then(() => console.log("chat connection initialized"));
