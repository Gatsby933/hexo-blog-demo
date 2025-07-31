// API配置
window.API_CONFIG = {
    // 根据当前主机名判断环境
    baseUrl: (() => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // 本地开发环境使用本地API
            return '/.netlify/functions';
        } else if (hostname === 'blog.hanverse.pub') {
            // 自定义域名使用相对路径，通过Cloudflare加速
            return '/.netlify/functions';
        } else {
            // 其他环境（如原Netlify域名）使用自定义域名
            return 'https://blog.hanverse.pub/.netlify/functions';
        }
    })(),
    // 主域名
    mainUrl: 'https://blog.hanverse.pub'
};