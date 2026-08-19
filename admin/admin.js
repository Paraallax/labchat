/* ==========================================
   LABCHAT ADMIN — SUPABASE
========================================== */

const SUPABASE_URL =
    "https://izobeyuplyramoojazdg.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_fftKRus4w4NXriH07kWvQg_Up9qWpy6";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* ==========================================
   STATE
========================================== */

let currentAdmin = null;
let currentProfile = null;

let users = [];

let editingUserId = null;


/* ==========================================
   DOM
========================================== */

const usersTableBody =
    document.getElementById("usersTableBody");

const userSearch =
    document.getElementById("userSearch");

const createUserButton =
    document.getElementById("createUserButton");

const userModal =
    document.getElementById("userModal");

const modalTitle =
    document.getElementById("modalTitle");

const modalClose =
    document.getElementById("modalClose");

const cancelButton =
    document.getElementById("cancelButton");

const userForm =
    document.getElementById("userForm");

const userEmail =
    document.getElementById("userEmail");

const userPassword =
    document.getElementById("userPassword");

const userRole =
    document.getElementById("userRole");

const logoutButton =
    document.getElementById("logoutButton");

const totalUsers =
    document.getElementById("totalUsers");

const activeUsers =
    document.getElementById("activeUsers");

const adminUsers =
    document.getElementById("adminUsers");

const onlineUsers =
    document.getElementById("onlineUsers");

const adminName =
    document.getElementById("adminName");

const adminRole =
    document.getElementById("adminRole");

const toastContainer =
    document.getElementById("toastContainer");


/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeAdmin
);


async function initializeAdmin() {

    try {

        const {
            data: {
                session
            },
            error
        } =
            await supabaseClient
                .auth
                .getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            redirectToLogin();

            return;
        }


        if (!session) {

            redirectToLogin();

            return;
        }


        currentAdmin =
            session.user;


        await verifyAdmin();


    } catch (error) {

        console.error(
            "Admin initialization error:",
            error
        );

        redirectToLogin();
    }
}


/* ==========================================
   VERIFY ADMIN
========================================== */

async function verifyAdmin() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentAdmin.id
            )
            .single();


    if (error) {

        console.error(
            "Profile lookup error:",
            error
        );

        showToast(
            "Could not verify your account.",
            "error"
        );

        await logout();

        return;
    }


    currentProfile = data;


    if (
        currentProfile.role !==
        "admin"
    ) {

        showToast(
            "Admin access required.",
            "error"
        );

        await logout();

        return;
    }


    updateAdminIdentity();

    await loadUsers();

    updateDashboardStats();
}


/* ==========================================
   ADMIN IDENTITY
========================================== */

function updateAdminIdentity() {

    if (adminName) {

        adminName.textContent =
            currentProfile.username ||
            currentProfile.name ||
            currentAdmin.email ||
            "Administrator";
    }


    if (adminRole) {

        adminRole.textContent =
            "Administrator";
    }
}


/* ==========================================
   LOAD USERS
========================================== */

async function loadUsers() {

    showLoading();


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Load users error:",
            error
        );

        showTableMessage(
            "Could not load users."
        );

        return;
    }


    users =
        data || [];


    renderUsers(users);

    updateDashboardStats();
}


/* ==========================================
   RENDER USERS
========================================== */

function renderUsers(list) {

    if (!usersTableBody) {
        return;
    }


    usersTableBody.innerHTML = "";


    if (
        !list ||
        list.length === 0
    ) {

        showTableMessage(
            "No users found."
        );

        return;
    }


    list.forEach(
        user => {

            const row =
                document.createElement(
                    "tr"
                );


            /* USER */

            const userCell =
                document.createElement(
                    "td"
                );

            const userWrapper =
                document.createElement(
                    "div"
                );

            userWrapper.className =
                "user-cell";


            const avatar =
                document.createElement(
                    "div"
                );

            avatar.className =
                "user-avatar";

            avatar.textContent =
                getInitials(
                    user.username ||
                    user.name ||
                    user.email ||
                    "U"
                );


            const identity =
                document.createElement(
                    "div"
                );


            const name =
                document.createElement(
                    "div"
                );

            name.className =
                "user-name";

            name.textContent =
                user.username ||
                user.name ||
                user.email ||
                "Unknown";


            const email =
                document.createElement(
                    "div"
                );

            email.className =
                "user-email";

            email.textContent =
                user.email ||
                "";


            identity.appendChild(
                name
            );

            identity.appendChild(
                email
            );


            userWrapper.appendChild(
                avatar
            );

            userWrapper.appendChild(
                identity
            );

            userCell.appendChild(
                userWrapper
            );


            /* ROLE */

            const roleCell =
                document.createElement(
                    "td"
                );

            const roleBadge =
                document.createElement(
                    "span"
                );

            roleBadge.className =
                `role-badge ${
                    user.role === "admin"
                        ? "role-admin"
                        : "role-user"
                }`;

            roleBadge.textContent =
                user.role || "user";

            roleCell.appendChild(
                roleBadge
            );


            /* STATUS */

            const statusCell =
                document.createElement(
                    "td"
                );

            const statusBadge =
                document.createElement(
                    "span"
                );

            const isActive =
                user.is_active !== false;

            statusBadge.className =
                `status-badge ${
                    isActive
                        ? "status-active"
                        : "status-inactive"
                }`;

            statusBadge.textContent =
                isActive
                    ? "Active"
                    : "Inactive";

            statusCell.appendChild(
                statusBadge
            );


            /* CREATED */

            const createdCell =
                document.createElement(
                    "td"
                );

            createdCell.textContent =
                formatDate(
                    user.created_at
                );


            /* ACTIONS */

            const actionsCell =
                document.createElement(
                    "td"
                );

            const actions =
                document.createElement(
                    "div"
                );

            actions.className =
                "table-actions";


            const editButton =
                document.createElement(
                    "button"
                );

            editButton.className =
                "action-button";

            editButton.type =
                "button";

            editButton.textContent =
                "Edit";

            editButton.addEventListener(
                "click",
                () => openEditModal(user)
            );


            const statusButton =
                document.createElement(
                    "button"
                );

            statusButton.type =
                "button";

            statusButton.className =
                `action-button ${
                    isActive
                        ? "danger"
                        : "success"
                }`;

            statusButton.textContent =
                isActive
                    ? "Deactivate"
                    : "Activate";


            statusButton.addEventListener(
                "click",
                () =>
                    toggleUserStatus(
                        user
                    )
            );


            actions.appendChild(
                editButton
            );

            actions.appendChild(
                statusButton
            );


            /*
             * Prevent accidentally
             * changing your own account
             * through the user controls.
             */

            if (
                user.id ===
                currentAdmin.id
            ) {

                statusButton.disabled =
                    true;

                statusButton.title =
                    "You cannot deactivate yourself.";
            }


            actionsCell.appendChild(
                actions
            );


            row.appendChild(
                userCell
            );

            row.appendChild(
                roleCell
            );

            row.appendChild(
                statusCell
            );

            row.appendChild(
                createdCell
            );

            row.appendChild(
                actionsCell
            );


            usersTableBody.appendChild(
                row
            );
        }
    );
}


/* ==========================================
   SEARCH
========================================== */

if (userSearch) {

    userSearch.addEventListener(
        "input",
        () => {

            const query =
                userSearch.value
                    .trim()
                    .toLowerCase();


            if (!query) {

                renderUsers(users);

                return;
            }


            const filtered =
                users.filter(
                    user => {

                        const values = [
                            user.username,
                            user.name,
                            user.email,
                            user.role
                        ];


                        return values.some(
                            value =>
                                String(
                                    value || ""
                                )
                                .toLowerCase()
                                .includes(
                                    query
                                )
                        );
                    }
                );


            renderUsers(filtered);
        }
    );
}


/* ==========================================
   DASHBOARD STATS
========================================== */

function updateDashboardStats() {

    if (!users) {
        return;
    }


    const active =
        users.filter(
            user =>
                user.is_active !== false
        ).length;


    const admins =
        users.filter(
            user =>
                user.role === "admin"
        ).length;


    if (totalUsers) {

        totalUsers.textContent =
            users.length;
    }


    if (activeUsers) {

        activeUsers.textContent =
            active;
    }


    if (adminUsers) {

        adminUsers.textContent =
            admins;
    }


    /*
     * Real-time online count can later
     * be connected to your existing
     * presence channel.
     */

    if (onlineUsers) {

        onlineUsers.textContent =
            "—";
    }
}


/* ==========================================
   CREATE USER MODAL
========================================== */

if (createUserButton) {

    createUserButton.addEventListener(
        "click",
        openCreateModal
    );
}


function openCreateModal() {

    editingUserId = null;


    if (modalTitle) {

        modalTitle.textContent =
            "Create User";
    }


    if (userForm) {

        userForm.reset();
    }


    if (userRole) {

        userRole.value =
            "user";
    }


    if (userPassword) {

        userPassword.required =
            true;
    }


    openModal();
}


/* ==========================================
   EDIT USER
========================================== */

function openEditModal(user) {

    editingUserId =
        user.id;


    if (modalTitle) {

        modalTitle.textContent =
            "Edit User";
    }


    if (userEmail) {

        userEmail.value =
            user.email || "";
    }


    if (userRole) {

        userRole.value =
            user.role || "user";
    }


    if (userPassword) {

        userPassword.value =
            "";

        userPassword.required =
            false;

        userPassword.placeholder =
            "Leave blank to keep current password";
    }


    openModal();
}


/* ==========================================
   MODAL OPEN / CLOSE
========================================== */

function openModal() {

    if (userModal) {

        userModal.classList.remove(
            "hidden"
        );
    }


    if (userEmail) {

        userEmail.focus();
    }
}


function closeModal() {

    if (userModal) {

        userModal.classList.add(
            "hidden"
        );
    }


    editingUserId =
        null;


    if (userForm) {

        userForm.reset();
    }
}


if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeModal
    );
}


if (cancelButton) {

    cancelButton.addEventListener(
        "click",
        closeModal
    );
}


/* ==========================================
   USER FORM
========================================== */

if (userForm) {

    userForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                userEmail.value
                    .trim();


            const password =
                userPassword.value;


            const role =
                userRole.value;


            if (!email) {

                showToast(
                    "Email / ID is required.",
                    "error"
                );

                return;
            }


            if (
                !editingUserId &&
                !password
            ) {

                showToast(
                    "Password is required.",
                    "error"
                );

                return;
            }


            if (editingUserId) {

                await updateUserProfile(
                    editingUserId,
                    email,
                    password,
                    role
                );

            } else {

                await createUser(
                    email,
                    password,
                    role
                );
            }
        }
    );
}


/* ==========================================
   CREATE USER
========================================== */

async function createUser(
    email,
    password,
    role
) {

    /*
     * IMPORTANT:
     *
     * Creating another Supabase Auth
     * account directly from a browser
     * using signUp/signIn can replace
     * the currently logged-in admin
     * session.
     *
     * Therefore the secure production
     * implementation should use a
     * server-side Edge Function using
     * the Supabase service-role key.
     *
     * We deliberately do NOT put that
     * secret key in this JavaScript.
     */


    showToast(
        "User creation needs a secure server-side Supabase function.",
        "error"
    );
}


/* ==========================================
   UPDATE PROFILE
========================================== */

async function updateUserProfile(
    userId,
    email,
    password,
    role
) {

    /*
     * Profile role can safely be updated
     * through an appropriately protected
     * database function/RLS policy.
     */

    const {
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({
                email: email,
                role: role
            })
            .eq(
                "id",
                userId
            );


    if (error) {

        console.error(
            "Update profile error:",
            error
        );

        showToast(
            "Could not update user.",
            "error"
        );

        return;
    }


    /*
     * Password changes should also be
     * performed server-side for another
     * user's account.
     */

    if (password) {

        showToast(
            "Profile updated. Password change requires the secure server function.",
            "success"
        );

    } else {

        showToast(
            "User updated successfully.",
            "success"
        );
    }


    closeModal();

    await loadUsers();
}


/* ==========================================
   ACTIVATE / DEACTIVATE
========================================== */

async function toggleUserStatus(user) {

    if (
        user.id ===
        currentAdmin.id
    ) {

        showToast(
            "You cannot deactivate yourself.",
            "error"
        );

        return;
    }


    const newStatus =
        user.is_active === false;


    const {
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({
                is_active:
                    newStatus
            })
            .eq(
                "id",
                user.id
            );


    if (error) {

        console.error(
            "Status update error:",
            error
        );

        showToast(
            "Could not change user status.",
            "error"
        );

        return;
    }


    showToast(
        newStatus
            ? "User activated."
            : "User deactivated.",
        "success"
    );


    await loadUsers();
}


/* ==========================================
   LOGOUT
========================================== */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );
}


async function logout() {

    await supabaseClient.auth.signOut();

    redirectToLogin();
}


/* ==========================================
   REDIRECT
========================================== */

function redirectToLogin() {

    /*
     * Change this if your main
     * LabChat page uses another filename.
     */

    window.location.href =
        "index.html";
}


/* ==========================================
   LOADING
========================================== */

function showLoading() {

    if (!usersTableBody) {
        return;
    }


    usersTableBody.innerHTML = "";


    const row =
        document.createElement(
            "tr"
        );


    const cell =
        document.createElement(
            "td"
        );

    cell.colSpan =
        5;

    cell.className =
        "loading";

    cell.textContent =
        "Loading users...";


    row.appendChild(
        cell
    );

    usersTableBody.appendChild(
        row
    );
}


function showTableMessage(message) {

    if (!usersTableBody) {
        return;
    }


    usersTableBody.innerHTML = "";


    const row =
        document.createElement(
            "tr"
        );


    const cell =
        document.createElement(
            "td"
        );

    cell.colSpan =
        5;

    cell.className =
        "table-empty";

    cell.textContent =
        message;


    row.appendChild(
        cell
    );

    usersTableBody.appendChild(
        row
    );
}


/* ==========================================
   TOAST
========================================== */

function showToast(
    message,
    type = "success"
) {

    if (!toastContainer) {

        alert(message);

        return;
    }


    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;


    toastContainer.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3500
    );
}


/* ==========================================
   HELPERS
========================================== */

function getInitials(value) {

    const text =
        String(value || "U")
            .trim();


    if (!text) {
        return "U";
    }


    const parts =
        text.split(/\s+/);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[1][0]
    ).toUpperCase();
}


function formatDate(timestamp) {

    if (!timestamp) {
        return "—";
    }


    const date =
        new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";
    }


    return date.toLocaleDateString(
        [],
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* ==========================================
   ESC KEY — CLOSE MODAL
========================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }
    }
);


/* ==========================================
   CLICK OUTSIDE MODAL
========================================== */

if (userModal) {

    userModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                userModal
            ) {

                closeModal();
            }
        }
    );
}