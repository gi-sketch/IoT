// ==========================================
// AIRIQ AUTHENTICATION JAVASCRIPT
// ==========================================


// ==========================================
// API BASE
// ==========================================

// Works whether you use localhost or 127.0.0.1
const API_BASE = window.location.origin;


// ==========================================
// PASSWORD SHOW / HIDE
// ==========================================

document.querySelectorAll(".password-toggle").forEach(button => {

    button.addEventListener("click", () => {

        const targetId = button.dataset.target;

        const input = document.getElementById(targetId);

        if (!input) {
            return;
        }


        if (input.type === "password") {

            input.type = "text";

            button.textContent = "◉";

        } else {

            input.type = "password";

            button.textContent = "◌";

        }

    });

});


// ==========================================
// PASSWORD STRENGTH
// ==========================================

const signupPassword =
    document.getElementById("signup-password");

const strengthText =
    document.getElementById("strength-text");

const strengthBars =
    document.querySelectorAll(".strength-bar span");


if (
    signupPassword &&
    strengthText &&
    strengthBars.length > 0
) {

    signupPassword.addEventListener(
        "input",
        () => {

            const password =
                signupPassword.value;


            let strength = 0;


            // ----------------------------------
            // Check password strength
            // ----------------------------------


            // 8 or more characters
            if (password.length >= 8) {
                strength++;
            }


            // Uppercase and lowercase
            if (
                /[a-z]/.test(password) &&
                /[A-Z]/.test(password)
            ) {
                strength++;
            }


            // Number
            if (/[0-9]/.test(password)) {
                strength++;
            }


            // Special character
            if (/[^A-Za-z0-9]/.test(password)) {
                strength++;
            }


            // ----------------------------------
            // Reset all bars
            // ----------------------------------

            strengthBars.forEach(bar => {

                bar.classList.remove(
                    "strength-1",
                    "strength-2",
                    "strength-3",
                    "strength-4"
                );

            });


            // ----------------------------------
            // Fill bars
            // ----------------------------------

            for (
                let i = 0;
                i < strength && i < strengthBars.length;
                i++
            ) {

                strengthBars[i].classList.add(
                    `strength-${strength}`
                );

            }


            // ----------------------------------
            // Strength message
            // ----------------------------------

            if (password.length === 0) {

                strengthText.textContent =
                    "Use 8+ characters for a stronger password";

            }

            else if (strength === 1) {

                strengthText.textContent =
                    "Weak password";

            }

            else if (strength === 2) {

                strengthText.textContent =
                    "Fair password";

            }

            else if (strength === 3) {

                strengthText.textContent =
                    "Strong password";

            }

            else if (strength === 4) {

                strengthText.textContent =
                    "Very strong password";

            }

        }
    );

}


// ==========================================
// SIGNUP
// ==========================================

const signupForm =
    document.getElementById("signup-form");


if (signupForm) {

    signupForm.addEventListener(
        "submit",

        async (event) => {


            // Prevent normal form submission
            // This stops data from appearing in URL

            event.preventDefault();


            const message =
                document.getElementById(
                    "auth-message"
                );


            // ----------------------------------
            // Get form values
            // ----------------------------------

            const fullName =
                document
                    .getElementById("fullname")
                    .value
                    .trim();


            const role =
                document
                    .getElementById("role")
                    .value;


            const email =
                document
                    .getElementById("signup-email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("signup-password")
                    .value;


            const confirmPassword =
                document
                    .getElementById("confirm-password")
                    .value;


            // ----------------------------------
            // Validation
            // ----------------------------------

            if (
                !fullName ||
                !role ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                if (message) {

                    message.textContent =
                        "Please fill in all fields";

                }

                return;

            }


            if (password !== confirmPassword) {

                if (message) {

                    message.textContent =
                        "Passwords do not match";

                }

                return;

            }


            if (password.length < 8) {

                if (message) {

                    message.textContent =
                        "Password must contain at least 8 characters";

                }

                return;

            }


            // ----------------------------------
            // Loading message
            // ----------------------------------

            if (message) {

                message.textContent =
                    "Creating your account...";

            }


            // ----------------------------------
            // Send signup request
            // ----------------------------------

            try {

                const response =
                    await fetch(
                        `${API_BASE}/api/signup`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                full_name: fullName,

                                email: email,

                                password: password,

                                role: role

                            })

                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "Signup response:",
                    result
                );


                // ----------------------------------
                // Signup successful
                // ----------------------------------

                if (result.success === true) {

                    if (message) {

                        message.textContent =
                            "Account created successfully! Redirecting to login...";

                    }


                    setTimeout(
                        () => {

                            window.location.href =
                                "/login";

                        },

                        800
                    );

                }


                // ----------------------------------
                // Signup failed
                // ----------------------------------

                else {

                    if (message) {

                        message.textContent =
                            result.message ||
                            "Could not create account";

                    }

                }

            }


            // ----------------------------------
            // Connection error
            // ----------------------------------

            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Could not connect to the server";

                }

            }


        }
    );

}


// ==========================================
// LOGIN
// ==========================================

const loginForm =
    document.getElementById("login-form");


if (loginForm) {

    loginForm.addEventListener(
        "submit",

        async (event) => {


            // IMPORTANT:
            // Stop normal browser form submission

            event.preventDefault();


            console.log(
                "Login form submitted"
            );


            const message =
                document.getElementById(
                    "auth-message"
                );


            // ----------------------------------
            // Get login values
            // ----------------------------------

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value;


            // ----------------------------------
            // Validation
            // ----------------------------------

            if (!email || !password) {

                if (message) {

                    message.textContent =
                        "Please enter your email and password";

                }

                return;

            }


            // ----------------------------------
            // Loading message
            // ----------------------------------

            if (message) {

                message.textContent =
                    "Signing in...";

            }


            // ----------------------------------
            // Send login request
            // ----------------------------------

            try {

                const response =
                    await fetch(
                        `${API_BASE}/api/login`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body: JSON.stringify({

                                email: email,

                                password: password

                            })

                        }
                    );


                // Check if response is valid JSON

                const result =
                    await response.json();


                console.log(
                    "Login response:",
                    result
                );


                // ----------------------------------
                // Login successful
                // ----------------------------------

                if (result.success === true) {


                    // Save user in browser

                    localStorage.setItem(
                        "airiq_user",

                        JSON.stringify(
                            result.user
                        )
                    );


                    console.log(
                        "Logged in user saved:",
                        result.user
                    );


                    if (message) {

                        message.textContent =
                            "Login successful! Opening dashboard...";

                    }


                    // ----------------------------------
                    // Redirect to dashboard
                    // ----------------------------------

                    setTimeout(
                        () => {

                            window.location.replace(
                                "/dashboard"
                            );

                        },

                        500
                    );

                }


                // ----------------------------------
                // Login failed
                // ----------------------------------

                else {

                    if (message) {

                        message.textContent =
                            result.message ||
                            "Invalid email or password";

                    }

                }

            }


            // ----------------------------------
            // Connection error
            // ----------------------------------

            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Could not connect to the server";

                }

            }


        }
    );

}


// ==========================================
// AUTO REDIRECT IF ALREADY LOGGED IN
// ==========================================

// Only redirect from login page if user already exists

const currentUser =
    localStorage.getItem("airiq_user");


const isLoginPage =
    document.getElementById("login-form");


if (
    currentUser &&
    isLoginPage
) {

    console.log(
        "User already logged in"
    );

}