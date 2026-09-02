// ==========================================
// LOGIN PROTECTION + USER AVATAR
// ==========================================

const loggedUser = localStorage.getItem("airiq_user");


if (!loggedUser) {

    window.location.href = "/login";

} else {

    try {

        const user = JSON.parse(loggedUser);

        const displayName = user?.name
            ? user.name.trim().split(/\s+/)[0]
            : "User";


        const avatar =
            document.getElementById("user-avatar");


        if (avatar) {

            avatar.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();

        }

    }

    catch (error) {

        console.error(
            "Invalid user data:",
            error
        );


        localStorage.removeItem(
            "airiq_user"
        );


        window.location.href = "/login";

    }

}