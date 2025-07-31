// API配置
window.API_CONFIG = {
    // 根据当前主机名判断环境
    baseUrl: (() => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // 本地开发环境使用本地API
            return '/.netlify/functions';
        } else if (hostname === 'blog.hanverse.pub') {
            // GitHub Pages上的自定义域名，需要调用Netlify的绝对URL
            return 'https://clever-mermaid-713c96.netlify.app/.netlify/functions';
        } else {
            // 其他环境（如原Netlify域名）使用自定义域名
            return 'https://blog.hanverse.pub/.netlify/functions';
        }
    })(),
    // 主域名
    mainUrl: 'https://blog.hanverse.pub'
};