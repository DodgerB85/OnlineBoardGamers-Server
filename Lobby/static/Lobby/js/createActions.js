(function () {
    "use strict"

    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn)
        } else {
            fn()
        }
    }

    function submitForm(form) {
        if (typeof form.requestSubmit === "function") {
            form.requestSubmit()
        } else {
            form.submit()
        }
    }

    onReady(function () {
        var form = document.querySelector("#gameCreationForm, #TGZnewGameForm")
        if (!form) return
        if (form.action && form.action.toLowerCase().indexOf("minitournament") !== -1) return

        var page = form.closest(".page") || form.parentElement
        if (!page) return

        var labels = document.getElementById("createActionsLabels")
        var createLabel = labels ? labels.dataset.create : "Create game now"
        var practiceLabel = labels ? labels.dataset.practice : "Create practice game now"
        var hintText = labels
            ? labels.dataset.hint
            : "Uses the options below. Defaults are already selected."
        var createConfirm = labels
            ? labels.dataset.createConfirm
            : "Create this game now with the options below? Defaults are already selected. Choose Cancel to change the options first."
        var practiceConfirm = labels
            ? labels.dataset.practiceConfirm
            : "Create this practice game now with the options below? Defaults are already selected. Choose Cancel to change the options first."
        var reviewLabel = labels ? labels.dataset.review : "Review options first"

        var training = form.querySelector("#trainingGame")
        var bar = document.createElement("div")
        bar.className = "create-quick-actions"

        var createButton = document.createElement("button")
        createButton.type = "button"
        createButton.className = "button button-primary"
        createButton.textContent = createLabel
        createButton.addEventListener("click", function () {
            if (!window.confirm(createConfirm)) return
            submitForm(form)
        })
        bar.appendChild(createButton)

        if (training) {
            var practiceButton = document.createElement("button")
            practiceButton.type = "button"
            practiceButton.className = "button"
            practiceButton.textContent = practiceLabel
            practiceButton.addEventListener("click", function () {
                if (!window.confirm(practiceConfirm)) return
                if (!training.checked) {
                    training.checked = true
                    training.dispatchEvent(new Event("change", { bubbles: true }))
                }
                submitForm(form)
            })
            bar.appendChild(practiceButton)
        }

        var reviewButton = document.createElement("button")
        reviewButton.type = "button"
        reviewButton.className = "button button-ghost"
        reviewButton.textContent = reviewLabel
        reviewButton.addEventListener("click", function () {
            form.scrollIntoView({ behavior: "smooth", block: "start" })
        })
        bar.appendChild(reviewButton)

        if (hintText) {
            var hint = document.createElement("span")
            hint.className = "create-quick-hint"
            hint.textContent = hintText
            bar.appendChild(hint)
        }

        var header = page.querySelector(".page-header")
        if (header) {
            header.insertAdjacentElement("afterend", bar)
        } else {
            form.parentElement.insertBefore(bar, form)
        }

        var params = new URLSearchParams(window.location.search)
        if (params.get("practice") === "1" && training && !training.checked) {
            training.checked = true
            training.dispatchEvent(new Event("change", { bubbles: true }))
        }
    })
})()
