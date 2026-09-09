/* Splotter Con site JS: mobile nav, hero slider, countdown, lightbox, library search */
(function () {
    "use strict";

    var navToggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".primary-nav");
    if (navToggle && nav) {
        navToggle.addEventListener("click", function () {
            var open = nav.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    var hero = document.querySelector(".hero");
    if (hero) {
        var slides = hero.querySelectorAll(".slide");
        var dotsWrap = document.createElement("div");
        dotsWrap.className = "hero-dots";
        var idx = 0;
        var timer = null;
        for (var i = 0; i < slides.length; i++) {
            (function (n) {
                var b = document.createElement("button");
                b.setAttribute("aria-label", "Slide " + (n + 1));
                if (n === 0) b.className = "active";
                b.addEventListener("click", function () {
                    show(n);
                    restart();
                });
                dotsWrap.appendChild(b);
            })(i);
        }
        hero.appendChild(dotsWrap);
        var dots = dotsWrap.querySelectorAll("button");
        function show(n) {
            slides[idx].classList.remove("active");
            dots[idx].classList.remove("active");
            idx = n;
            slides[idx].classList.add("active");
            dots[idx].classList.add("active");
        }
        function restart() {
            clearInterval(timer);
            timer = setInterval(function () {
                show((idx + 1) % slides.length);
            }, 5000);
        }
        restart();
    }

    var countdown = document.querySelector(".countdown");
    if (countdown) {
        var target = new Date(parseInt(countdown.getAttribute("data-date"), 10) * 1000);
        var digits = countdown.querySelectorAll(".cd-digits");
        function tick() {
            var diff = target.getTime() - Date.now();
            if (diff <= 0) {
                countdown.classList.add("expired");
                return;
            }
            var days = Math.floor(diff / 86400000);
            var hours = Math.floor((diff % 86400000) / 3600000);
            var mins = Math.floor((diff % 3600000) / 60000);
            if (digits[0]) digits[0].textContent = days;
            if (digits[1]) digits[1].textContent = hours;
            if (digits[2]) digits[2].textContent = mins;
        }
        tick();
        setInterval(tick, 60000);
    }

    var lightbox = document.querySelector(".lightbox");
    if (lightbox) {
        var lightboxImg = lightbox.querySelector("img");
        document.querySelectorAll("[data-lightbox]").forEach(function (a) {
            a.addEventListener("click", function (e) {
                e.preventDefault();
                lightboxImg.src = a.getAttribute("href");
                lightbox.classList.add("open");
            });
        });
        lightbox.addEventListener("click", function () {
            lightbox.classList.remove("open");
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") lightbox.classList.remove("open");
        });
    }

    var searchInput = document.querySelector(".library-search");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            var q = searchInput.value.toLowerCase();
            document.querySelectorAll(".library-table tbody tr").forEach(function (tr) {
                tr.style.display = tr.textContent.toLowerCase().indexOf(q) === -1 ? "none" : "";
            });
        });
    }

    var thumbs = document.querySelectorAll(".gallery-thumbs img");
    var mainImg = document.querySelector(".gallery-main img");
    if (thumbs.length && mainImg) {
        thumbs.forEach(function (t) {
            t.addEventListener("click", function () {
                mainImg.src = t.getAttribute("data-full");
            });
        });
    }
})();