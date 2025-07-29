// API配置
window.API_CONFIG = {
    // 根据当前主机名判断环境
    baseUrl: (() => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:9999/.netlify/functions';
        } else if (hostname === 'blog.hanverse.pub') {
            // GitHub Pages使用Netlify的API
            return 'https://clever-mermaid-713c96.netlify.app/.netlify/functions';
        } else {
            // Netlify部署
            return 'https://clever-mermaid-713c96.netlify.app/.netlify/functions';
        }
    })(),
    // GitHub Pages域名
    githubPagesUrl: 'https://blog.hanverse.pub'
};