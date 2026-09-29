// =====================================================
// BOMBAY BITES
// PASSWORD SHOW / HIDE
// =====================================================

console.log("login-ui.js loaded");

document.addEventListener("DOMContentLoaded", function () {

  console.log("login-ui DOM ready");

  const passwordInput = document.getElementById("password");
  const toggleButton = document.getElementById("pwToggle");

  console.log("Password input:", passwordInput);
  console.log("Password button:", toggleButton);


  if (!passwordInput || !toggleButton) {
    console.error("Password elements not found.");
    return;
  }


  // Prevent the button from affecting the form
  toggleButton.addEventListener("mousedown", function (event) {
    event.preventDefault();
  });


  // Show / hide password
  toggleButton.addEventListener("click", function (event) {

    event.preventDefault();
    event.stopPropagation();

    console.log("PASSWORD BUTTON CLICKED");


    if (passwordInput.type === "password") {

      // SHOW
      passwordInput.type = "text";

      toggleButton.textContent = "🙈";

      toggleButton.setAttribute(
        "aria-label",
        "Hide password"
      );

      toggleButton.setAttribute(
        "title",
        "Hide password"
      );

      console.log("Password type:", passwordInput.type);

    } else {

      // HIDE
      passwordInput.type = "password";

      toggleButton.textContent = "👁";

      toggleButton.setAttribute(
        "aria-label",
        "Show password"
      );

      toggleButton.setAttribute(
        "title",
        "Show password"
      );

      console.log("Password type:", passwordInput.type);
    }


    // Keep cursor in password field
    passwordInput.focus();

  });

});