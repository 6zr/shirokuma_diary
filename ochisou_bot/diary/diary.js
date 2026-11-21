// レンダリング前の即時実行（FOUC / 白いチラつきを完全防止）
(function() {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
    }
})();

// DOM構築後にボタンのアイコン（🌙/☀️）を同期
window.addEventListener('DOMContentLoaded', function() {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        if (document.body) document.body.classList.add('dark');
        var btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = '☀️';
    }
});

// テーマ切り替え関数（アーカイブ一覧等で使用）
function toggleTheme() {
    var isDark = document.documentElement.classList.toggle('dark');
    if (document.body) document.body.classList.toggle('dark', isDark);
    var btn = document.getElementById('theme-toggle');
    if (isDark) {
        if (btn) btn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        if (btn) btn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}
