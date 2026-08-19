const SUPABASE_URL = "https://izobeyuplyramoojazdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_fftKRus4w4NXriH07kWvQg_Up9qWpy6";


/* ==========================================
   SUPABASE
========================================== */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* ==========================================
   STATE
========================================== */

let currentUser = null;
let currentProfile = null;

let realtimeChannel = null;
let presenceChannel = null;

let userSessionId =
    crypto.randomUUID();

let isCodeMode = false;


/* ==========================================
   DOM
========================================== */

const loginOverlay =
    document.getElementById("loginOverlay");

const loginModal =
    document.getElementById("loginModal");

const loginForm =
    document.getElementById("loginForm");

const loginIdentifier =
    document.getElementById("loginIdentifier");

const loginPassword =
    document.getElementById("loginPassword");

const loginButton =
    document.getElementById("loginButton");

const loginError =
    document.getElementById("loginError");

const closeLoginButton =
    document.getElementById("closeLoginButton");

const openLoginButton =
    document.getElementById("openLoginButton");

const loginNotice =
    document.getElementById("loginNotice");

const chatScreen =
    document.getElementById("chatScreen");

const currentUserElement =
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
   INITIALIZATION
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeLabChat
);


async function initializeLabChat() {

    console.log("LabChat initializing...");

    setStatus("Connecting...");

    setupLoginControls();

    setupMessageControls();

    setupKeyboardShortcuts();

    disableChatControls();

    await restoreSession();

}


/* ==========================================
   LOGIN CONTROLS
========================================== */

function setupLoginControls() {


    /* LOGIN FORM */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /* CLOSE LOGIN */

    if (closeLoginButton) {

        closeLoginButton.addEventListener(
            "click",
            closeLogin
        );

    }


    /* OPEN LOGIN */

    if (openLoginButton) {

        openLoginButton.addEventListener(
            "click",
            openLogin
        );

    }


    /* CLICK OUTSIDE MODAL */

    if (loginOverlay) {

        loginOverlay.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    loginOverlay
                ) {

                    closeLogin();
                }

            }
        );

    }

}


/* ==========================================
   KEYBOARD SHORTCUTS
========================================== */

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        (event) => {

            /*
             * Ctrl + Shift + L
             * Open login
             */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() === "l"
            ) {

                event.preventDefault();

                openLogin();

                return;
            }


            /*
             * Escape
             * Close login
             */

            if (
                event.key === "Escape" &&
                loginOverlay &&
                !loginOverlay.classList.contains(
                    "hidden"
                )
            ) {

                closeLogin();
            }

        }
    );

}


/* ==========================================
   OPEN LOGIN
========================================== */

function openLogin() {

    if (!loginOverlay) {
        return;
    }

    loginOverlay.classList.remove(
        "hidden"
    );

    if (loginError) {
        loginError.textContent = "";
    }

    setTimeout(
        () => {

            if (loginIdentifier) {
                loginIdentifier.focus();
            }

        },
        50
    );
}


/* ==========================================
   CLOSE LOGIN
========================================== */

function closeLogin() {

    if (!loginOverlay) {
        return;
    }

    loginOverlay.classList.add(
        "hidden"
    );

}


/* ==========================================
   LOGIN
========================================== */

async function handleLogin(event) {

    event.preventDefault();

    if (!loginIdentifier || !loginPassword) {
        return;
    }


    const identifier =
        loginIdentifier.value.trim();

    const password =
        loginPassword.value;


    if (!identifier || !password) {
        return;
    }


    clearLoginError();

    setLoginLoading(true);


    /*
     * Current database architecture:
     *
     * Supabase Auth uses email + password.
     *
     * The profiles table currently contains
     * username / role / is_active, but no
     * email column.
     */

    if (!identifier.includes("@")) {

        showLoginError(
            "Please use your Supabase Auth email. Username / ID login will be added separately."
        );

        setLoginLoading(false);

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword(
            {
                email: identifier,
                password: password
            }
        );


    if (error) {

        console.error(
            "Login error:",
            error
        );

        showLoginError(
            getLoginErrorMessage(error)
        );

        setLoginLoading(false);

        return;
    }


    if (!data || !data.user) {

        showLoginError(
            "Login failed. Please try again."
        );

        setLoginLoading(false);

        return;
    }


    const success =
        await loadUserProfile(
            data.user
        );


    if (!success) {

        await supabaseClient.auth.signOut();

        setLoginLoading(false);

        return;
    }


    loginPassword.value = "";

    setLoginLoading(false);

}


/* ==========================================
   RESTORE EXISTING SESSION
========================================== */

async function restoreSession() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            setStatus(
                "Authentication error"
            );

            return;
        }


        if (!data.session) {

            setStatus("Offline");

            return;
        }


        await loadUserProfile(
            data.session.user
        );


    } catch (error) {

        console.error(
            "Session restore error:",
            error
        );

        setStatus(
            "Authentication error"
        );

    }

}


/* ==========================================
   AUTH STATE LISTENER
========================================== */

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        console.log(
            "Auth event:",
            event
        );


        if (
            event === "SIGNED_OUT"
        ) {

            await resetLabChat();

            return;
        }


        if (
            event === "SIGNED_IN" &&
            session &&
            !currentProfile
        ) {

            await loadUserProfile(
                session.user
            );

        }

    }
);


/* ==========================================
   LOAD PROFILE
========================================== */

async function loadUserProfile(user) {

    if (!user) {
        return false;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, username, role, is_active"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile load error:",
            error
        );

        showLoginError(
            "Could not load your profile. Check your profiles table permissions."
        );

        return false;
    }


    if (!data) {

        showLoginError(
            "Your account does not have a LabChat profile."
        );

        return false;
    }


    /*
     * Account disabled
     */

    if (
        data.is_active !== true
    ) {

        showLoginError(
            "Your LabChat account is inactive. Contact an administrator."
        );

        return false;
    }


    /*
     * ADMIN
     */

    if (
        data.role === "admin"
    ) {

        console.log(
            "Admin login detected."
        );

        /*
         * Admin dashboard is one folder
         * above labchat.
         */

        window.location.href =
            "../admin/admin.html";

        return true;
    }


    /*
     * NORMAL USER
     */

    if (
        data.role !== "user"
    ) {

        showLoginError(
            "Your account has an invalid role."
        );

        return false;
    }


    currentUser = user;

    currentProfile = data;


    currentUserElement.textContent =
        data.username;


    closeLogin();


    if (loginNotice) {

        loginNotice.classList.add(
            "hidden"
        );

    }


    enableChatControls();


    setStatus("Online");


    /*
     * Load application data
     */

    await loadMessages();

    await loadActivePDF();

    subscribeToMessages();

    startPresence();


    messageInput.focus();


    console.log(
        "LabChat user logged in:",
        data.username
    );


    return true;
}


/* ==========================================
   LOGIN ERROR
========================================== */

function showLoginError(message) {

    if (!loginError) {
        return;
    }

    loginError.textContent =
        message;
}


function clearLoginError() {

    if (!loginError) {
        return;
    }

    loginError.textContent = "";

}


/* ==========================================
   LOGIN BUTTON STATE
========================================== */

function setLoginLoading(loading) {

    if (!loginButton) {
        return;
    }


    loginButton.disabled =
        loading;


    loginButton.textContent =
        loading
            ? "Logging in..."
            : "Login";

}


/* ==========================================
   LOGIN ERROR MESSAGES
========================================== */

function getLoginErrorMessage(error) {

    if (!error) {
        return "Login failed.";
    }


    const message =
        error.message || "";


    if (
        message.toLowerCase().includes(
            "invalid login credentials"
        )
    ) {

        return "Incorrect email or password.";
    }


    if (
        message.toLowerCase().includes(
            "email not confirmed"
        )
    ) {

        return "Your email has not been confirmed.";
    }


    return message ||
        "Unable to login.";
}


/* ==========================================
   CHAT CONTROLS
========================================== */

function enableChatControls() {

    if (messageInput) {
        messageInput.disabled = false;

        messageInput.placeholder =
            "Type a message...";
    }


    if (sendButton) {
        sendButton.disabled = false;
    }


    if (codeButton) {
        codeButton.disabled = false;
    }

}


function disableChatControls() {

    if (messageInput) {

        messageInput.disabled = true;

        messageInput.placeholder =
            "Login to send a message...";

    }


    if (sendButton) {
        sendButton.disabled = true;
    }


    if (codeButton) {
        codeButton.disabled = true;
    }

}


/* ==========================================
   LOAD MESSAGES
========================================== */

async function loadMessages() {

    setStatus("Loading...");


    const {
        data,
        error
    } =
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

        setStatus(
            "Database error"
        );

        return;
    }


    messagesContainer.innerHTML = "";


    if (
        !data ||
        data.length === 0
    ) {

        showEmptyState();

    } else {

        data.forEach(
            addMessage
        );

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
            .channel(
                "labchat-messages"
            )


            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                (payload) => {

                    /*
                     * Only display valid,
                     * non-expired messages.
                     */

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

                    }


                    else if (
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
   LOAD ACTIVE PDF
========================================== */

async function loadActivePDF() {

    if (!pdfSection) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("pdf_documents")
            .select(
                "file_name, github_url"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {

        console.error(
            "Load PDF error:",
            error
        );

        pdfSection.classList.add(
            "hidden"
        );

        return;
    }


    if (!data) {

        pdfSection.classList.add(
            "hidden"
        );

        return;
    }


    if (!data.github_url) {

        pdfSection.classList.add(
            "hidden"
        );

        return;
    }


    pdfTitle.textContent =
        data.file_name;


    pdfStatus.textContent =
        "Active lab document";


    pdfButton.href =
        data.github_url;


    pdfSection.classList.remove(
        "hidden"
    );

}


/* ==========================================
   ONLINE USERS / PRESENCE
========================================== */

function startPresence() {

    if (!currentProfile) {
        return;
    }


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
                        key:
                            userSessionId
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
                            currentProfile.username,

                        user_id:
                            currentProfile.id
                    }
                );


                updateOnlineCount();

            }

        }
    );

}


/* ==========================================
   UPDATE ONLINE COUNT
========================================== */

function updateOnlineCount() {

    if (!presenceChannel) {
        return;
    }


    const state =
        presenceChannel.presenceState();


    const uniqueUsers =
        new Set();


    Object.values(state)
        .forEach(
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
   SEND MESSAGE
========================================== */

messageForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            openLogin();

            return;
        }


        const text =
            messageInput.value;


        if (
            !text.trim()
        ) {

            return;
        }


        sendButton.disabled =
            true;


        const {
            error
        } =
            await supabaseClient
                .from("messages")
                .insert(
                    {
                        username:
                            currentProfile.username,

                        message:
                            text,

                        is_code:
                            isCodeMode
                    }
                );


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


        sendButton.disabled =
            false;

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
         *
         * Enter = send
         *
         * Shift + Enter =
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
         *
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


        if (!currentUser) {

            openLogin();

            return;
        }


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

        }


        else {

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
        currentProfile &&
        message.username ===
        currentProfile.username
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

    }


    /*
     * NORMAL MESSAGE
     */

    else {

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
     * Remove message when its
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


    button.type =
        "button";


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
        text.split(
            urlRegex
        );


    element.textContent =
        "";


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

            }


            else {

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

    if (connectionStatus) {

        connectionStatus.textContent =
            status;

    }

}


/* ==========================================
   TEXTAREA AUTO RESIZE
========================================== */

messageInput.addEventListener(
    "input",
    autoResizeTextarea
);


function autoResizeTextarea() {

    if (!messageInput) {
        return;
    }


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

    if (!messagesContainer) {
        return;
    }


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}


/* ==========================================
   SIGN OUT
========================================== */

async function leaveChat() {

    console.log(
        "Signing out..."
    );


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


    await supabaseClient.auth.signOut();

}


if (leaveButton) {

    leaveButton.addEventListener(
        "click",
        leaveChat
    );

}


/* ==========================================
   RESET AFTER SIGN OUT
========================================== */

async function resetLabChat() {

    currentUser = null;

    currentProfile = null;


    isCodeMode = false;


    if (currentUserElement) {

        currentUserElement.textContent =
            "Guest";

    }


    if (loginNotice) {

        loginNotice.classList.remove(
            "hidden"
        );

    }


    if (messagesContainer) {

        messagesContainer.innerHTML =
            "";

    }


    if (pdfSection) {

        pdfSection.classList.add(
            "hidden"
        );

    }


    if (codeButton) {

        codeButton.classList.remove(
            "active"
        );

    }


    if (codeIndicator) {

        codeIndicator.classList.add(
            "hidden"
        );

    }


    if (messageInput) {

        messageInput.value =
            "";

        messageInput.placeholder =
            "Login to send a message...";

    }


    onlineCount.textContent =
        "0 online";


    disableChatControls();


    setStatus(
        "Signed out"
    );


    openLogin();

}


/* ==========================================
   PAGE CLEANUP
========================================== */

window.addEventListener(
    "beforeunload",
    () => {

        if (presenceChannel) {

            try {

                presenceChannel.untrack();

            } catch (error) {

                console.error(
                    "Presence cleanup error:",
                    error
                );

            }

        }

    }
);
