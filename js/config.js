// API配置
window.API_CONFIG = {
    // 根据当前主机名判断环境
    baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8888/.netlify/functions'
        : 'https://your-netlify-site.netlify.app/.netlify/functions',
    // GitHub Pages域名
    githubPagesUrl: 'https://your-github-username.github.io/hexo-blog-demo'
};