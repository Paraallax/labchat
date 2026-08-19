/* =========================================================
   LABCHAT
   Main Client Application
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
    "https://izobeyuplyramoojazdg.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_fftKRus4w4NXriH07kWvQg_Up9qWpy6";


/* =========================================================
   SUPABASE CLIENT
========================================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let currentProfile = null;

let realtimeChannel = null;

let presenceChannel = null;

let isCodeMode = false;

let userSessionId =
    crypto.randomUUID();


/* =========================================================
   DOM ELEMENTS
========================================================= */


/* ---------- Login ---------- */

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


/* ---------- Chat ---------- */

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


/* ---------- PDF ---------- */

const pdfSection =
    document.getElementById("pdfSection");

const pdfTitle =
    document.getElementById("pdfTitle");

const pdfStatus =
    document.getElementById("pdfStatus");

const pdfButton =
    document.getElementById("pdfButton");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeLabChat
);


async function initializeLabChat() {

    console.log(
        "LabChat initializing..."
    );


    setStatus(
        "Connecting..."
    );


    /*
     * Set up UI controls first.
     */

    setupLoginControls();

    setupMessageControls();

    setupKeyboardShortcuts();

    disableChatControls();


    /*
     * IMPORTANT
     *
     * PDF is PUBLIC.
     *
     * Therefore load it BEFORE checking
     * whether the user is logged in.
     */

    await loadActivePDF();


    /*
     * Restore Supabase authentication.
     */

    await restoreSession();


    console.log(
        "LabChat initialization complete."
    );
}


/* =========================================================
   LOGIN CONTROLS
========================================================= */

function setupLoginControls() {


    /*
     * Login form
     */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /*
     * Close button
     */

    if (closeLoginButton) {

        closeLoginButton.addEventListener(
            "click",
            closeLogin
        );

    }


    /*
     * Open login button
     */

    if (openLoginButton) {

        openLoginButton.addEventListener(
            "click",
            openLogin
        );

    }


    /*
     * Clicking outside modal closes login.
     */

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


/* =========================================================
   MESSAGE CONTROLS
========================================================= */

function setupMessageControls() {


    /*
     * Message form
     */

    if (messageForm) {

        messageForm.addEventListener(
            "submit",
            handleMessageSubmit
        );

    }


    /*
     * Message keyboard handling
     */

    if (messageInput) {

        messageInput.addEventListener(
            "keydown",
            handleMessageKeydown
        );


        messageInput.addEventListener(
            "input",
            autoResizeTextarea
        );

    }


    /*
     * Code mode
     */

    if (codeButton) {

        codeButton.addEventListener(
            "click",
            toggleCodeMode
        );

    }


    /*
     * Sign out
     */

    if (leaveButton) {

        leaveButton.addEventListener(
            "click",
            leaveChat
        );

    }

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        (event) => {


            /*
             * Ctrl + Shift + L
             *
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
             *
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


/* =========================================================
   OPEN LOGIN
========================================================= */

function openLogin() {

    if (!loginOverlay) {
        return;
    }


    loginOverlay.classList.remove(
        "hidden"
    );


    clearLoginError();


    setTimeout(
        () => {

            if (loginIdentifier) {

                loginIdentifier.focus();

            }

        },
        50
    );

}


/* =========================================================
   CLOSE LOGIN
========================================================= */

function closeLogin() {

    if (!loginOverlay) {
        return;
    }


    loginOverlay.classList.add(
        "hidden"
    );

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    if (
        !loginIdentifier ||
        !loginPassword
    ) {

        console.error(
            "Login elements are missing."
        );

        return;
    }


    const identifier =
        loginIdentifier.value.trim();


    const password =
        loginPassword.value;


    if (
        !identifier ||
        !password
    ) {

        showLoginError(
            "Please enter your email and password."
        );

        return;
    }


    clearLoginError();

    setLoginLoading(
        true
    );


    /*
     * Current architecture uses
     * Supabase Auth email/password.
     */

    if (
        !identifier.includes("@")
    ) {

        showLoginError(
            "Please use your Supabase Auth email."
        );

        setLoginLoading(
            false
        );

        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword(
                    {
                        email:
                            identifier,

                        password:
                            password
                    }
                );


        if (error) {

            console.error(
                "Login error:",
                error
            );

            showLoginError(
                getLoginErrorMessage(
                    error
                )
            );

            setLoginLoading(
                false
            );

            return;
        }


        if (
            !data ||
            !data.user
        ) {

            showLoginError(
                "Login failed. Please try again."
            );

            setLoginLoading(
                false
            );

            return;
        }


        const success =
            await loadUserProfile(
                data.user
            );


        if (!success) {

            await supabaseClient.auth.signOut();

            setLoginLoading(
                false
            );

            return;
        }


        loginPassword.value = "";


        setLoginLoading(
            false
        );


    } catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        showLoginError(
            "An unexpected error occurred."
        );

        setLoginLoading(
            false
        );

    }

}


/* =========================================================
   RESTORE SESSION
========================================================= */

async function restoreSession() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .getSession();


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


        /*
         * No existing session.
         *
         * This is completely normal.
         *
         * The public PDF should still be visible.
         */

        if (
            !data ||
            !data.session
        ) {

            setStatus(
                "Signed out"
            );

            showGuestState();

            return;
        }


        /*
         * Existing session found.
         */

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


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

supabaseClient.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        console.log(
            "Auth event:",
            event
        );


        if (
            event ===
            "SIGNED_OUT"
        ) {

            await resetLabChat();

            return;
        }


        if (
            event ===
            "SIGNED_IN" &&
            session
        ) {

            /*
             * Don't load the profile twice
             * if it is already loaded.
             */

            if (
                !currentProfile
            ) {

                await loadUserProfile(
                    session.user
                );

            }

        }

    }
);


/* =========================================================
   LOAD USER PROFILE
========================================================= */

async function loadUserProfile(user) {

    if (!user) {

        return false;

    }


    try {

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
                "Could not load your profile."
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
         * Check account status.
         */

        if (
            data.is_active !== true
        ) {

            showLoginError(
                "Your LabChat account is inactive."
            );

            return false;
        }


        /*
         * ADMIN
         */

        if (
            data.role ===
            "admin"
        ) {

            console.log(
                "Admin login detected."
            );


            window.location.href =
                "../admin/admin.html";


            return true;
        }


        /*
         * NORMAL USER
         */

        if (
            data.role !==
            "user"
        ) {

            showLoginError(
                "Your account has an invalid role."
            );

            return false;
        }


        /*
         * Save authenticated user.
         */

        currentUser =
            user;

        currentProfile =
            data;


        /*
         * Update UI.
         */

        if (currentUserElement) {

            currentUserElement.textContent =
                data.username;

        }


        if (loginNotice) {

            loginNotice.classList.add(
                "hidden"
            );

        }


        closeLogin();


        /*
         * Enable chat.
         */

        enableChatControls();


        setStatus(
            "Loading..."
        );


        /*
         * Load chat data.
         */

        await loadMessages();

        await loadActivePDF();

        subscribeToMessages();

        startPresence();


        /*
         * Focus message box.
         */

        if (messageInput) {

            messageInput.focus();

        }


        console.log(
            "LabChat user logged in:",
            data.username
        );


        return true;


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        showLoginError(
            "Could not load your LabChat profile."
        );

        return false;

    }

}


/* =========================================================
   GUEST STATE
========================================================= */

function showGuestState() {

    currentUser =
        null;

    currentProfile =
        null;


    if (currentUserElement) {

        currentUserElement.textContent =
            "Guest";

    }


    if (loginNotice) {

        loginNotice.classList.remove(
            "hidden"
        );

    }


    disableChatControls();


    /*
     * IMPORTANT:
     *
     * We DO NOT hide the PDF here.
     *
     * PDF is public.
     */

    loadActivePDF();

}


/* =========================================================
   LOGIN ERROR
========================================================= */

function showLoginError(message) {

    if (!loginError) {
        return;
    }


    loginError.textContent =
        message;

}


/* =========================================================
   CLEAR LOGIN ERROR
========================================================= */

function clearLoginError() {

    if (!loginError) {
        return;
    }


    loginError.textContent =
        "";

}


/* =========================================================
   LOGIN BUTTON STATE
========================================================= */

function setLoginLoading(
    loading
) {

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


/* =========================================================
   LOGIN ERROR MESSAGE
========================================================= */

function getLoginErrorMessage(
    error
) {

    if (!error) {

        return "Login failed.";

    }


    const message =
        error.message || "";


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "invalid login credentials"
        )
    ) {

        return "Incorrect email or password.";

    }


    if (
        lower.includes(
            "email not confirmed"
        )
    ) {

        return "Your email has not been confirmed.";

    }


    return (
        message ||
        "Unable to login."
    );

}


/* =========================================================
   CHAT ENABLE / DISABLE
========================================================= */

function enableChatControls() {


    if (messageInput) {

        messageInput.disabled =
            false;

        messageInput.placeholder =
            "Type a message...";

    }


    if (sendButton) {

        sendButton.disabled =
            false;

    }


    if (codeButton) {

        codeButton.disabled =
            false;

    }

}


/* =========================================================
   DISABLE CHAT
========================================================= */

function disableChatControls() {


    if (messageInput) {

        messageInput.disabled =
            true;

        messageInput.placeholder =
            "Login to send a message...";

    }


    if (sendButton) {

        sendButton.disabled =
            true;

    }


    if (codeButton) {

        codeButton.disabled =
            true;

    }

}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadMessages() {

    if (!messagesContainer) {
        return;
    }


    setStatus(
        "Loading..."
    );


    try {

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


        messagesContainer.innerHTML =
            "";


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


        setStatus(
            "Online"
        );


        scrollToBottom();


    } catch (error) {

        console.error(
            "Unexpected message load error:",
            error
        );

        setStatus(
            "Database error"
        );

    }

}


/* =========================================================
   REALTIME MESSAGES
========================================================= */

function subscribeToMessages() {


    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

        realtimeChannel =
            null;

    }


    realtimeChannel =
        supabaseClient
            .channel(
                "labchat-messages"
            )


            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "messages"
                },


                (payload) => {

                    console.log(
                        "New message:",
                        payload.new
                    );


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


                    else if (
                        status ===
                        "TIMED_OUT"
                    ) {

                        setStatus(
                            "Realtime timeout"
                        );

                    }

                }
            );

}


/* =========================================================
   LOAD PUBLIC PDF
========================================================= */

async function loadActivePDF() {

    console.log(
        "Loading public PDF..."
    );


    if (!pdfSection) {

        console.error(
            "pdfSection not found."
        );

        return;
    }


    /*
     * Hide temporarily while loading.
     */

    pdfSection.classList.add(
        "hidden"
    );


    try {

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


        /*
         * Database / RLS error.
         */

        if (error) {

            console.error(
                "Public PDF load error:",
                error
            );


            if (pdfStatus) {

                pdfStatus.textContent =
                    "Unable to load document.";

            }


            return;
        }


        /*
         * No active PDF.
         */

        if (!data) {

            console.log(
                "No active PDF found."
            );


            return;
        }


        /*
         * Missing URL.
         */

        if (!data.github_url) {

            console.error(
                "PDF exists but github_url is empty."
            );


            if (pdfTitle) {

                pdfTitle.textContent =
                    data.file_name ||
                    "Lab PDF";

            }


            if (pdfStatus) {

                pdfStatus.textContent =
                    "PDF link is missing.";

            }


            pdfSection.classList.remove(
                "hidden"
            );


            return;
        }


        /*
         * Set PDF information.
         */

        if (pdfTitle) {

            pdfTitle.textContent =
                data.file_name ||
                "Lab PDF";

        }


        if (pdfStatus) {

            pdfStatus.textContent =
                "Active lab document";

        }


        if (pdfButton) {

            pdfButton.href =
                data.github_url;

            pdfButton.target =
                "_blank";

            pdfButton.rel =
                "noopener noreferrer";

        }


        /*
         * SHOW PDF
         *
         * This happens regardless of
         * whether the user is logged in.
         */

        pdfSection.classList.remove(
            "hidden"
        );


        console.log(
            "Public PDF loaded:",
            data.file_name,
            data.github_url
        );


    } catch (error) {

        console.error(
            "Unexpected PDF error:",
            error
        );

    }

}


/* =========================================================
   PRESENCE
========================================================= */

function startPresence() {


    if (!currentProfile) {
        return;
    }


    if (presenceChannel) {

        supabaseClient.removeChannel(
            presenceChannel
        );

        presenceChannel =
            null;

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


    /*
     * Presence sync
     */

    presenceChannel.on(
        "presence",
        {
            event:
                "sync"
        },
        updateOnlineCount
    );


    /*
     * User joined
     */

    presenceChannel.on(
        "presence",
        {
            event:
                "join"
        },
        updateOnlineCount
    );


    /*
     * User left
     */

    presenceChannel.on(
        "presence",
        {
            event:
                "leave"
        },
        updateOnlineCount
    );


    /*
     * Subscribe
     */

    presenceChannel.subscribe(
        async (status) => {

            if (
                status ===
                "SUBSCRIBED"
            ) {

                try {

                    await presenceChannel.track(
                        {
                            username:
                                currentProfile.username,

                            user_id:
                                currentProfile.id
                        }
                    );


                    updateOnlineCount();


                } catch (error) {

                    console.error(
                        "Presence tracking error:",
                        error
                    );

                }

            }

        }
    );

}


/* =========================================================
   UPDATE ONLINE COUNT
========================================================= */

function updateOnlineCount() {

    if (
        !presenceChannel ||
        !onlineCount
    ) {

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


/* =========================================================
   SEND MESSAGE
========================================================= */

async function handleMessageSubmit(
    event
) {

    event.preventDefault();


    /*
     * Guest cannot send.
     */

    if (!currentUser) {

        openLogin();

        return;
    }


    if (!messageInput) {
        return;
    }


    const text =
        messageInput.value;


    if (!text.trim()) {

        return;

    }


    if (sendButton) {

        sendButton.disabled =
            true;

    }


    try {

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


            return;

        }


        messageInput.value =
            "";


        autoResizeTextarea();


        messageInput.focus();


    } catch (error) {

        console.error(
            "Unexpected send error:",
            error
        );


        alert(
            "Message could not be sent."
        );


    } finally {

        if (sendButton) {

            sendButton.disabled =
                false;

        }

    }

}


/* =========================================================
   MESSAGE KEYBOARD
========================================================= */

function handleMessageKeydown(
    event
) {


    /*
     * Normal mode:
     *
     * Enter = send
     *
     * Shift + Enter = newline
     */

    if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !isCodeMode
    ) {

        event.preventDefault();

        if (messageForm) {

            messageForm.requestSubmit();

        }

        return;
    }


    /*
     * Code mode:
     *
     * Enter = newline
     *
     * Ctrl + Enter = send
     */

    if (
        event.key === "Enter" &&
        event.ctrlKey &&
        isCodeMode
    ) {

        event.preventDefault();

        if (messageForm) {

            messageForm.requestSubmit();

        }

    }

}


/* =========================================================
   CODE MODE
========================================================= */

function toggleCodeMode() {


    if (!currentUser) {

        openLogin();

        return;
    }


    isCodeMode =
        !isCodeMode;


    if (isCodeMode) {

        if (codeButton) {

            codeButton.classList.add(
                "active"
            );

        }


        if (codeIndicator) {

            codeIndicator.classList.remove(
                "hidden"
            );

        }


        if (messageInput) {

            messageInput.placeholder =
                "Write your code here...";

        }

    }


    else {

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

            messageInput.placeholder =
                "Type a message...";

        }

    }


    if (messageInput) {

        messageInput.focus();

    }

}


/* =========================================================
   DISPLAY MESSAGE
========================================================= */

function addMessage(message) {

    if (
        !message ||
        !messagesContainer
    ) {

        return;

    }


    /*
     * Check expiration.
     */

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


    /*
     * Prevent duplicate messages.
     */

    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {

        return;

    }


    removeEmptyState();


    /*
     * Main message element.
     */

    const messageElement =
        document.createElement(
            "article"
        );


    messageElement.className =
        "message";


    messageElement.dataset.messageId =
        message.id;


    /*
     * Own message.
     */

    if (
        currentProfile &&
        message.username ===
        currentProfile.username
    ) {

        messageElement.classList.add(
            "mine"
        );

    }


    /* =====================================================
       CODE MESSAGE
    ===================================================== */

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


    /* =====================================================
       NORMAL MESSAGE
    ===================================================== */

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


        linkify(
            text
        );


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


    /*
     * Add to chat.
     */

    messagesContainer.appendChild(
        messageElement
    );


    /*
     * Remove automatically when
     * the 5-minute expiration occurs.
     */

    const remaining =
        expires.getTime() -
        Date.now();


    if (
        remaining > 0
    ) {

        setTimeout(
            () => {

                if (
                    messageElement.isConnected
                ) {

                    messageElement.remove();

                }


                if (
                    messagesContainer.children
                        .length === 0
                ) {

                    showEmptyState();

                }

            },
            remaining
        );

    }

}


/* =========================================================
   COPY BUTTON
========================================================= */

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

                await navigator.clipboard
                    .writeText(
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


/* =========================================================
   LINKIFY
========================================================= */

function linkify(element) {

    if (!element) {
        return;
    }


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


/* =========================================================
   TIME
========================================================= */

function formatTime(
    timestamp
) {

    return new Date(
        timestamp
    ).toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================================
   EMPTY STATE
========================================================= */

function showEmptyState() {

    if (!messagesContainer) {
        return;
    }


    if (
        messagesContainer.querySelector(
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


/* =========================================================
   REMOVE EMPTY STATE
========================================================= */

function removeEmptyState() {

    if (!messagesContainer) {
        return;
    }


    const empty =
        messagesContainer.querySelector(
            ".empty-state"
        );


    if (empty) {

        empty.remove();

    }

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
    status
) {

    if (!connectionStatus) {
        return;
    }


    connectionStatus.textContent =
        status;

}


/* =========================================================
   TEXTAREA AUTO RESIZE
========================================================= */

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


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

    if (!messagesContainer) {
        return;
    }


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}


/* =========================================================
   SIGN OUT
========================================================= */

async function leaveChat() {

    console.log(
        "Signing out..."
    );


    try {

        /*
         * Stop presence first.
         */

        if (presenceChannel) {

            try {

                await presenceChannel.untrack();

            } catch (error) {

                console.error(
                    "Presence untrack error:",
                    error
                );

            }


            await supabaseClient
                .removeChannel(
                    presenceChannel
                );


            presenceChannel =
                null;

        }


        /*
         * Remove realtime.
         */

        if (realtimeChannel) {

            await supabaseClient
                .removeChannel(
                    realtimeChannel
                );


            realtimeChannel =
                null;

        }


        /*
         * Sign out from Supabase.
         */

        await supabaseClient.auth.signOut();


    } catch (error) {

        console.error(
            "Sign out error:",
            error
        );

    }

}


/* =========================================================
   RESET AFTER SIGN OUT
========================================================= */

async function resetLabChat() {

    console.log(
        "Resetting LabChat..."
    );


    currentUser =
        null;


    currentProfile =
        null;


    isCodeMode =
        false;


    /*
     * Guest UI.
     */

    if (currentUserElement) {

        currentUserElement.textContent =
            "Guest";

    }


    if (loginNotice) {

        loginNotice.classList.remove(
            "hidden"
        );

    }


    /*
     * Clear chat.
     */

    if (messagesContainer) {

        messagesContainer.innerHTML =
            "";

    }


    /*
     * Reset code mode.
     */

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


    /*
     * Reset message input.
     */

    if (messageInput) {

        messageInput.value =
            "";

        messageInput.placeholder =
            "Login to send a message...";

    }


    /*
     * Reset online count.
     */

    if (onlineCount) {

        onlineCount.textContent =
            "0 online";

    }


    /*
     * Disable chat.
     */

    disableChatControls();


    setStatus(
        "Signed out"
    );


    /*
     * IMPORTANT
     *
     * DO NOT HIDE THE PDF.
     *
     * PDF is public.
     */

    await loadActivePDF();


    /*
     * Show login.
     */

    openLogin();

}


/* =========================================================
   PAGE CLEANUP
========================================================= */

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
