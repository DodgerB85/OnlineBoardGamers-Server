function init() {
    const emailInput = document.getElementById('some_id');
    if (emailInput) {
        emailInput.addEventListener('input', inputHandler);
    }

    const usernameInput = document.getElementById('id_username');
    const emailWarning = document.getElementById('usernameEmailWarning');
    if (usernameInput && emailWarning) {
        usernameInput.closest('p').insertAdjacentElement('afterend', emailWarning);

        const checkUsername = function () {
            const value = usernameInput.value.trim();
            const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
            emailWarning.style.display = looksLikeEmail ? 'block' : 'none';
        };

        usernameInput.addEventListener('input', checkUsername);
        checkUsername();
    }
}

const inputHandler = function(e) {
    if (e.target.value.toUpperCase().includes("BTINTERNET")) {
        document.getElementById('btWarning').style.display = 'block'
    }
  }

window.addEventListener("load", init);
