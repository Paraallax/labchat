const SUPABASE_URL = "https://izobeyuplyramoojazdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_fftKRus4w4NXriH07kWvQg_Up9qWpy6";


/* ==========================================
   SUPABASE
========================================== */

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   STATE
========================================== */

let currentUsername = "";
let realtimeChannel = null;
let presenceChannel = null;
let userSessionId = crypto.randomUUID();

let isCodeMode = false;
let heartbeatTimer = null;


/* ==========================================
   DOM
========================================== */

const joinScreen =
    document.getElementById("joinScreen");

const chatScreen =
    document.getElementById("chatScreen");

const joinForm =
    document.getElementById("joinForm");

const usernameInput =
    document.getElementById("username");

const usernameError =
    document.getElementById("usernameError");

const currentUser =
    document.getElementById("currentUser");

const connectionStatus =
    document.getElementById("connectionStatus");

const onlineCount =
    document.getElementById("onlineCount");

const messagesContainer =
    document.getElementById("messages");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const codeButton =
    document.getElementById("codeButton");

const codeIndicator =
    document.getElementById("codeIndicator");

const leaveButton =
    document.getElementById("leaveButton");

const pdfSection =
    document.getElementById("pdfSection");

const pdfTitle =
    document.getElementById("pdfTitle");

const pdfStatus =
    document.getElementById("pdfStatus");

const pdfButton =
    document.getElementById("pdfButton");


/* ==========================================
   JOIN
========================================== */

joinForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        usernameError.textContent = "";

        const name =
            usernameInput.value.trim();

        if (!name) {
            return;
        }

        const cleanName =
            name.substring(0, 30);

        const { data, error } =
            await supabaseClient.rpc(
                "claim_username",
                {
                    requested_username:
                        cleanName,

                    requested_session:
                        userSessionId
                }
            );

        if (error) {

            console.error(
                "Username claim error:",
                error
            );

            usernameError.textContent =
                "Could not connect to the server.";

            return;
        }

        if (data !== true) {

            usernameError.textContent =
                "That name is already being used.";

            return;
        }

        currentUsername = cleanName;

        currentUser.textContent =
            currentUsername;

        joinScreen.classList.add(
            "hidden"
        );

        chatScreen.classList.remove(
            "hidden"
        );

        await loadMessages();

        subscribeToMessages();

        startPresence();

        startHeartbeat();

        messageInput.focus();
    }
);


/* ==========================================
   LOAD MESSAGES
========================================== */

async function loadMessages() {

    setStatus("Loading...");

    const { data, error } =
        await supabaseClient
            .from("messages")
            .select("*")
            .gt(
                "expires_at",
                new Date().toISOString()
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "Load messages error:",
            error
        );

        setStatus("Database error");

        return;
    }

    messagesContainer.innerHTML = "";

    if (!data || data.length === 0) {

        showEmptyState();

    } else {

        data.forEach(addMessage);
    }

    setStatus("Online");

    scrollToBottom();
}


/* ==========================================
   REALTIME MESSAGES
========================================== */

function subscribeToMessages() {

    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );
    }

    realtimeChannel =
        supabaseClient
            .channel("labchat-messages")

            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                (payload) => {

                    removeEmptyState();

                    addMessage(
                        payload.new
                    );

                    scrollToBottom();
                }
            )

            .subscribe(
                (status) => {

                    console.log(
                        "Realtime:",
                        status
                    );

                    if (
                        status ===
                        "SUBSCRIBED"
                    ) {

                        setStatus(
                            "Online"
                        );

                    } else if (
                        status ===
                        "CHANNEL_ERROR"
                    ) {

                        setStatus(
                            "Realtime unavailable"
                        );
                    }
                }
            );
}


/* ==========================================
   ONLINE USERS / PRESENCE
========================================== */

function startPresence() {

    if (presenceChannel) {

        supabaseClient.removeChannel(
            presenceChannel
        );
    }

    presenceChannel =
        supabaseClient.channel(
            "labchat-online-users",
            {
                config: {
                    presence: {
                        key: userSessionId
                    }
                }
            }
        );


    presenceChannel.on(
        "presence",
        {
            event: "sync"
        },
        () => {

            updateOnlineCount();
        }
    );


    presenceChannel.on(
        "presence",
        {
            event: "join"
        },
        () => {

            updateOnlineCount();
        }
    );


    presenceChannel.on(
        "presence",
        {
            event: "leave"
        },
        () => {

            updateOnlineCount();
        }
    );


    presenceChannel.subscribe(
        async (status) => {

            if (
                status ===
                "SUBSCRIBED"
            ) {

                await presenceChannel.track(
                    {
                        username:
                            currentUsername
                    }
                );

                updateOnlineCount();
            }
        }
    );
}


function updateOnlineCount() {

    if (!presenceChannel) {
        return;
    }

    const state =
        presenceChannel.presenceState();

    const uniqueUsers =
        new Set();

    Object.values(state).forEach(
        (entries) => {

            entries.forEach(
                (entry) => {

                    if (
                        entry.username
                    ) {

                        uniqueUsers.add(
                            entry.username
                        );
                    }
                }
            );
        }
    );

    const count =
        uniqueUsers.size;

    onlineCount.textContent =
        `${count} ${
            count === 1
                ? "user"
                : "users"
        } online`;
}


/* ==========================================
   HEARTBEAT
========================================== */

function startHeartbeat() {

    stopHeartbeat();

    heartbeatTimer =
        setInterval(
            async () => {

                if (!currentUsername) {
                    return;
                }

                const { error } =
                    await supabaseClient.rpc(
                        "update_user_presence",
                        {
                            requested_session:
                                userSessionId
                        }
                    );

                if (error) {

                    console.error(
                        "Heartbeat error:",
                        error
                    );
                }

            },
            15000
        );
}


function stopHeartbeat() {

    if (heartbeatTimer) {

        clearInterval(
            heartbeatTimer
        );

        heartbeatTimer = null;
    }
}


/* ==========================================
   SEND MESSAGE
========================================== */

messageForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const text =
            messageInput.value;

        if (
            !text.trim() ||
            !currentUsername
        ) {

            return;
        }

        sendButton.disabled = true;

        const { error } =
            await supabaseClient
                .from("messages")
                .insert({
                    username:
                        currentUsername,

                    message:
                        text,

                    is_code:
                        isCodeMode
                });

        if (error) {

            console.error(
                "Send message error:",
                error
            );

            alert(
                "Message could not be sent."
            );

        } else {

            messageInput.value = "";

            autoResizeTextarea();

            messageInput.focus();
        }

        sendButton.disabled = false;
    }
);


/* ==========================================
   ENTER TO SEND
========================================== */

messageInput.addEventListener(
    "keydown",
    (event) => {

        /*
         * Normal mode:
         * Enter = send
         *
         * Shift + Enter:
         * new line
         */

        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !isCodeMode
        ) {

            event.preventDefault();

            messageForm.requestSubmit();
        }


        /*
         * Code mode:
         * Enter = new line
         *
         * Ctrl + Enter = send
         */

        if (
            event.key === "Enter" &&
            event.ctrlKey &&
            isCodeMode
        ) {

            event.preventDefault();

            messageForm.requestSubmit();
        }
    }
);


/* ==========================================
   CODE MODE
========================================== */

codeButton.addEventListener(
    "click",
    () => {

        isCodeMode =
            !isCodeMode;

        if (isCodeMode) {

            codeButton.classList.add(
                "active"
            );

            codeIndicator.classList.remove(
                "hidden"
            );

            messageInput.placeholder =
                "Write your code here...";

        } else {

            codeButton.classList.remove(
                "active"
            );

            codeIndicator.classList.add(
                "hidden"
            );

            messageInput.placeholder =
                "Type a message...";
        }

        messageInput.focus();
    }
);


/* ==========================================
   DISPLAY MESSAGE
========================================== */

function addMessage(message) {

    if (!message) {
        return;
    }

    const expires =
        new Date(
            message.expires_at
        );

    if (
        Number.isNaN(
            expires.getTime()
        ) ||
        expires <= new Date()
    ) {

        return;
    }


    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {

        return;
    }


    removeEmptyState();


    const messageElement =
        document.createElement(
            "article"
        );

    messageElement.className =
        "message";

    messageElement.dataset.messageId =
        message.id;


    if (
        message.username ===
        currentUsername
    ) {

        messageElement.classList.add(
            "mine"
        );
    }


    /*
     * CODE MESSAGE
     */

    if (message.is_code) {

        messageElement.classList.add(
            "code-message"
        );

        const codeHeader =
            document.createElement(
                "div"
            );

        codeHeader.className =
            "code-header";


        const codeAuthor =
            document.createElement(
                "span"
            );

        codeAuthor.textContent =
            `${message.username} • ${formatTime(
                message.created_at
            )}`;


        const copyButton =
            createCopyButton(
                message.message,
                "Copy Code"
            );


        codeHeader.appendChild(
            codeAuthor
        );

        codeHeader.appendChild(
            copyButton
        );


        const codeContent =
            document.createElement(
                "pre"
            );

        codeContent.className =
            "code-content";

        codeContent.textContent =
            message.message;


        messageElement.appendChild(
            codeHeader
        );

        messageElement.appendChild(
            codeContent
        );


    /*
     * NORMAL MESSAGE
     */

    } else {

        const header =
            document.createElement(
                "div"
            );

        header.className =
            "message-header";


        const username =
            document.createElement(
                "span"
            );

        username.className =
            "message-user";

        username.textContent =
            message.username;


        const time =
            document.createElement(
                "span"
            );

        time.className =
            "message-time";

        time.textContent =
            formatTime(
                message.created_at
            );


        header.appendChild(
            username
        );

        header.appendChild(
            time
        );


        const text =
            document.createElement(
                "div"
            );

        text.className =
            "message-text";

        text.textContent =
            message.message;

        linkify(text);


        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "message-actions";


        const copyButton =
            createCopyButton(
                message.message,
                "Copy"
            );


        actions.appendChild(
            copyButton
        );


        messageElement.appendChild(
            header
        );

        messageElement.appendChild(
            text
        );

        messageElement.appendChild(
            actions
        );
    }


    messagesContainer.appendChild(
        messageElement
    );


    /*
     * Remove from UI when its
     * 5-minute lifetime ends.
     */

    const remaining =
        expires.getTime() -
        Date.now();


    if (remaining > 0) {

        setTimeout(
            () => {

                messageElement.remove();

                if (
                    messagesContainer
                        .children
                        .length === 0
                ) {

                    showEmptyState();
                }

            },
            remaining
        );
    }
}


/* ==========================================
   COPY
========================================== */

function createCopyButton(
    text,
    label
) {

    const button =
        document.createElement(
            "button"
        );

    button.type = "button";

    button.className =
        "copy-button";

    button.textContent =
        label;


    button.addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    text
                );

                button.textContent =
                    "Copied!";

                setTimeout(
                    () => {

                        button.textContent =
                            label;

                    },
                    1200
                );

            } catch (error) {

                console.error(
                    "Copy failed:",
                    error
                );

                button.textContent =
                    "Copy failed";
            }
        }
    );


    return button;
}


/* ==========================================
   LINKIFY
========================================== */

function linkify(element) {

    const text =
        element.textContent;

    const urlRegex =
        /(https?:\/\/[^\s]+)/g;

    const parts =
        text.split(urlRegex);

    element.textContent = "";


    parts.forEach(
        (part) => {

            if (
                /^https?:\/\//i.test(
                    part
                )
            ) {

                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    part;

                link.textContent =
                    part;

                link.target =
                    "_blank";

                link.rel =
                    "noopener noreferrer";

                element.appendChild(
                    link
                );

            } else {

                element.appendChild(
                    document.createTextNode(
                        part
                    )
                );
            }
        }
    );
}


/* ==========================================
   TIME
========================================== */

function formatTime(timestamp) {

    return new Date(timestamp)
        .toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


/* ==========================================
   EMPTY STATE
========================================== */

function showEmptyState() {

    if (
        document.querySelector(
            ".empty-state"
        )
    ) {

        return;
    }


    const empty =
        document.createElement(
            "div"
        );

    empty.className =
        "empty-state";


    const title =
        document.createElement(
            "strong"
        );

    title.textContent =
        "No messages yet";


    const subtitle =
        document.createTextNode(
            "Start the conversation."
        );


    empty.appendChild(
        title
    );

    empty.appendChild(
        subtitle
    );


    messagesContainer.appendChild(
        empty
    );
}


function removeEmptyState() {

    const empty =
        document.querySelector(
            ".empty-state"
        );

    if (empty) {
        empty.remove();
    }
}


/* ==========================================
   STATUS
========================================== */

function setStatus(status) {

    connectionStatus.textContent =
        status;
}


/* ==========================================
   TEXTAREA AUTO RESIZE
========================================== */

messageInput.addEventListener(
    "input",
    autoResizeTextarea
);


function autoResizeTextarea() {

    messageInput.style.height =
        "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            220
        ) + "px";
}


/* ==========================================
   SCROLL
========================================== */

function scrollToBottom() {

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


/* ==========================================
   LEAVE
========================================== */

async function leaveChat() {

    stopHeartbeat();


    try {

        await supabaseClient.rpc(
            "release_username",
            {
                requested_session:
                    userSessionId
            }
        );

    } catch (error) {

        console.error(
            "Release username error:",
            error
        );
    }


    if (presenceChannel) {

        try {

            await presenceChannel.untrack();

        } catch (error) {

            console.error(
                "Presence untrack error:",
                error
            );
        }


        await supabaseClient.removeChannel(
            presenceChannel
        );

        presenceChannel = null;
    }


    if (realtimeChannel) {

        await supabaseClient.removeChannel(
            realtimeChannel
        );

        realtimeChannel = null;
    }


    currentUsername = "";

    messagesContainer.innerHTML = "";

    chatScreen.classList.add(
        "hidden"
    );

    joinScreen.classList.remove(
        "hidden"
    );

    usernameInput.value = "";

    usernameError.textContent = "";

    messageInput.value = "";

    isCodeMode = false;

    codeButton.classList.remove(
        "active"
    );

    codeIndicator.classList.add(
        "hidden"
    );

    messageInput.placeholder =
        "Type a message...";

    onlineCount.textContent =
        "0 online";

    autoResizeTextarea();
}


leaveButton.addEventListener(
    "click",
    leaveChat
);


/* ==========================================
   CLEANUP WHEN TAB CLOSES
========================================== */

window.addEventListener(
    "beforeunload",
    () => {

        /*
         * Best-effort cleanup.
         * The heartbeat + 45-second
         * expiration protects against
         * crashed/closed tabs.
         */

        stopHeartbeat();
    }
);
