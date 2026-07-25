(function () {
    function wrapOne(img) {
        if (!img.title) return;
        if (img.classList.contains('startingMap')) return;
        var parent = img.parentNode;
        if (!parent || (parent.classList && parent.classList.contains('nd-mod-wrap'))) return;
        var wrap = document.createElement('span');
        wrap.className = 'nd-mod-wrap';
        wrap.setAttribute('data-label', img.title);
        parent.insertBefore(wrap, img);
        wrap.appendChild(img);
    }
    window.ndWrapTooltips = function (root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('.startingOption').forEach(wrapOne);
    };
    function start() {
        window.ndWrapTooltips(document.getElementById('lobbyPage') || document.body);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
