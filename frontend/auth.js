// ==========================================
// AIRIQ AUTHENTICATION
// ==========================================

// ==========================================
// API BASE URL
// ==========================================

const API_BASE = window.location.origin;


// ==========================================
// PASSWORD SHOW / HIDE
// ==========================================

document.querySelectorAll(".password-toggle").forEach((toggle) => {

    toggle.addEventListener("click", () => {

        const input =
            toggle.parentElement.querySelector("input");

        if (!input) {
            return;
        }

        if (input.type === "password") {

            input.type = "text";

            toggle.textContent = "🙈";

        } else {

            input.type = "password";

            toggle.textContent = "👁";

        }

    });

});


// ==========================================
// LOGIN
// ==========================================

const loginForm =
    document.getElementById("login-form");


if (loginForm) {

    loginForm.addEventListener(
        "submit",

        async (event) => {

            event.preventDefault();


            console.log("Login form submitted");


            // ==================================
            // MESSAGE ELEMENT
            // ==================================

            const message =
                document.getElementById(
                    "auth-message"
                );


            // ==================================
            // GET LOGIN VALUES
            // ==================================

            const emailInput =
                document.getElementById("email");


            const passwordInput =
                document.getElementById("password");


            if (!emailInput || !passwordInput) {

                console.error(
                    "Email or password input not found."
                );

                return;

            }


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            // ==================================
            // VALIDATION
            // ==================================

            if (!email || !password) {

                if (message) {

                    message.textContent =
                        "Please enter your email and password";

                }

                return;

            }


            // ==================================
            // LOADING MESSAGE
            // ==================================

            if (message) {

                message.textContent =
                    "Signing in...";

            }


            // ==================================
            // DISABLE LOGIN BUTTON
            // ==================================

            const loginButton =
                loginForm.querySelector(
                    'button[type="submit"]'
                );


            if (loginButton) {

                loginButton.disabled = true;

            }


            // ==================================
            // SEND LOGIN REQUEST
            // ==================================

            try {

                console.log(
                    "Sending login request to:",
                    `${API_BASE}/api/login`
                );


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


                // ==================================
                // READ SERVER RESPONSE
                // ==================================

                let result;

                try {

                    result =
                        await response.json();

                } catch (jsonError) {

                    console.error(
                        "Invalid JSON response:",
                        jsonError
                    );

                    throw new Error(
                        `Server returned an invalid response. Status: ${response.status}`
                    );

                }


                console.log(
                    "Login response:",
                    result
                );


                // ==================================
                // LOGIN SUCCESSFUL
                // ==================================

                if (
                    response.ok &&
                    result.success === true
                ) {

                    // ==================================
                    // CHECK USER DATA
                    // ==================================

                    if (!result.user) {

                        console.error(
                            "Login succeeded but no user data was returned."
                        );

                        if (message) {

                            message.textContent =
                                "Login succeeded, but user information was not returned.";

                        }

                        return;

                    }


                    // ==================================
                    // SAVE USER
                    // ==================================

                    localStorage.setItem(
                        "airiq_user",

                        JSON.stringify(
                            result.user
                        )
                    );


                    console.log(
                        "Logged-in user saved:",
                        result.user
                    );


                    // ==================================
                    // ADMIN LOGIN
                    // ==================================

                    if (
                        result.user.is_admin === true ||
                        result.user.role === "admin"
                    ) {

                        console.log(
                            "Administrator login detected."
                        );


                        // ----------------------------------
                        // SAVE ADMIN INFORMATION
                        // ----------------------------------

                        localStorage.setItem(
                            "airiq_admin",

                            JSON.stringify({

                                id:
                                    result.user.id,

                                name:
                                    result.user.name,

                                email:
                                    result.user.email

                            })
                        );


                        // ----------------------------------
                        // ADMIN SUCCESS MESSAGE
                        // ----------------------------------

                        if (message) {

                            message.textContent =
                                "Administrator login successful! Opening Admin Panel...";

                        }


                        // ----------------------------------
                        // REDIRECT TO ADMIN PANEL
                        // ----------------------------------

                        setTimeout(
                            () => {

                                window.location.replace(
                                    "/admin"
                                );

                            },

                            500
                        );


                        return;

                    }


                    // ==================================
                    // NORMAL USER LOGIN
                    // ==================================

                    console.log(
                        "Normal user login detected."
                    );


                    // Remove any previous admin session

                    localStorage.removeItem(
                        "airiq_admin"
                    );


                    // ----------------------------------
                    // SUCCESS MESSAGE
                    // ----------------------------------

                    if (message) {

                        message.textContent =
                            "Login successful! Opening dashboard...";

                    }


                    // ----------------------------------
                    // REDIRECT TO DASHBOARD
                    // ----------------------------------

                    setTimeout(
                        () => {

                            window.location.replace(
                                "/dashboard"
                            );

                        },

                        500
                    );


                    return;

                }


                // ==================================
                // LOGIN FAILED
                // ==================================

                console.warn(
                    "Login failed:",
                    result
                );


                if (message) {

                    message.textContent =
                        result.message ||
                        "Invalid email or password";

                }

            }


            // ==================================
            // CONNECTION / SERVER ERROR
            // ==================================

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


            // ==================================
            // ENABLE LOGIN BUTTON AGAIN
            // ==================================

            finally {

                if (loginButton) {

                    loginButton.disabled = false;

                }

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

            event.preventDefault();


            console.log(
                "Signup form submitted"
            );


            // ==================================
            // MESSAGE
            // ==================================

            const message =
                document.getElementById(
                    "auth-message"
                );


            // ==================================
            // GET INPUTS
            // ==================================

            const fullNameInput =
                document.getElementById(
                    "full-name"
                );


            const emailInput =
                document.getElementById(
                    "email"
                );


            const passwordInput =
                document.getElementById(
                    "password"
                );


            const roleInput =
                document.getElementById(
                    "role"
                );


            if (
                !fullNameInput ||
                !emailInput ||
                !passwordInput ||
                !roleInput
            ) {

                console.error(
                    "Signup form fields are missing."
                );

                return;

            }


            const fullName =
                fullNameInput.value.trim();


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            const password =
                passwordInput.value;


            const role =
                roleInput.value;


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !fullName ||
                !email ||
                !password ||
                !role
            ) {

                if (message) {

                    message.textContent =
                        "Please fill in all required fields.";

                }

                return;

            }


            // ==================================
            // LOADING MESSAGE
            // ==================================

            if (message) {

                message.textContent =
                    "Creating your account...";

            }


            // ==================================
            // DISABLE BUTTON
            // ==================================

            const signupButton =
                signupForm.querySelector(
                    'button[type="submit"]'
                );


            if (signupButton) {

                signupButton.disabled = true;

            }


            // ==================================
            // SEND SIGNUP REQUEST
            // ==================================

            try {

                console.log(
                    "Sending signup request to:",
                    `${API_BASE}/api/signup`
                );


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

                                full_name:
                                    fullName,

                                email:
                                    email,

                                password:
                                    password,

                                role:
                                    role

                            })

                        }
                    );


                // ==================================
                // READ RESPONSE
                // ==================================

                let result;

                try {

                    result =
                        await response.json();

                } catch (jsonError) {

                    console.error(
                        "Invalid signup response:",
                        jsonError
                    );

                    throw new Error(
                        `Server returned an invalid response. Status: ${response.status}`
                    );

                }


                console.log(
                    "Signup response:",
                    result
                );


                // ==================================
                // SIGNUP SUCCESS
                // ==================================

                if (
                    response.ok &&
                    result.success === true
                ) {

                    if (message) {

                        message.textContent =
                            result.message ||
                            "Account created successfully!";

                    }


                    // ----------------------------------
                    // REDIRECT TO LOGIN
                    // ----------------------------------

                    setTimeout(
                        () => {

                            window.location.replace(
                                "/login"
                            );

                        },

                        1000
                    );


                    return;

                }


                // ==================================
                // SIGNUP FAILED
                // ==================================

                if (message) {

                    message.textContent =
                        result.message ||
                        "Could not create account.";

                }

            }


            // ==================================
            // CONNECTION ERROR
            // ==================================

            catch (error) {

                console.error(
                    "Signup error:",
                    error
                );


                if (message) {

                    message.textContent =
                        "Could not connect to the server.";

                }

            }


            // ==================================
            // ENABLE BUTTON AGAIN
            // ==================================

            finally {

                if (signupButton) {

                    signupButton.disabled = false;

                }

            }

        }
    );

}


// ==========================================
// PASSWORD STRENGTH
// ==========================================

const passwordField =
    document.getElementById("password");


const passwordStrength =
    document.getElementById(
        "password-strength"
    );


if (
    passwordField &&
    passwordStrength
) {

    passwordField.addEventListener(
        "input",

        () => {

            const password =
                passwordField.value;


            let score = 0;


            // Minimum length

            if (password.length >= 8) {

                score++;

            }


            // Lowercase

            if (/[a-z]/.test(password)) {

                score++;

            }


            // Uppercase

            if (/[A-Z]/.test(password)) {

                score++;

            }


            // Number

            if (/[0-9]/.test(password)) {

                score++;

            }


            // Special character

            if (
                /[^A-Za-z0-9]/.test(password)
            ) {

                score++;

            }


            // ==================================
            // STRENGTH TEXT
            // ==================================

            if (!password) {

                passwordStrength.textContent =
                    "";

            }

            else if (score <= 2) {

                passwordStrength.textContent =
                    "Weak password";

            }

            else if (score === 3) {

                passwordStrength.textContent =
                    "Medium password";

            }

            else {

                passwordStrength.textContent =
                    "Strong password";

            }

        }
    );

}


// ==========================================
// CHECK EXISTING LOGIN
// ==========================================

document.addEventListener(
    "DOMContentLoaded",

    () => {

        const storedUser =
            localStorage.getItem(
                "airiq_user"
            );


        if (storedUser) {

            try {

                const user =
                    JSON.parse(
                        storedUser
                    );


                console.log(
                    "Existing AirIQ session:",
                    user
                );

            }

            catch (error) {

                console.error(
                    "Invalid stored user data:",
                    error
                );


                localStorage.removeItem(
                    "airiq_user"
                );

            }

        }

    }
);