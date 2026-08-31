/* =========================================
   IMAGE CONFIGURATION
========================================= */

/*
 * Put your image in the same GitHub repository
 * as index.html, then change this filename.
 *
 * Example:
 *
 * my-image.jpg
 * poster.png
 * announcement.webp
 */

const IMAGE_FILE = "your-image.jpg";


/* =========================================
   ELEMENTS
========================================= */

const loginScreen = document.getElementById("loginScreen");
const imageScreen = document.getElementById("imageScreen");

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");

const displayImage = document.getElementById("displayImage");


/* =========================================
   LOAD IMAGE
========================================= */

displayImage.src = IMAGE_FILE;


/* =========================================
   LOGIN
========================================= */

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const username = usernameInput.value.trim();

    if (!username) {
        return;
    }

    /*
     * Username is entered successfully.
     *
     * Now hide the login screen
     * and show the image.
     */

    loginScreen.classList.add("hidden");

    imageScreen.classList.remove("hidden");

});
