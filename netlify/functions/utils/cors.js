// CORS配置
const corsHeaders = (origin) => {
    // 允许的域名列表
    const allowedOrigins = [
        'http://localhost:51537',
        'http://localhost:9999',
        'http://localhost:8888',
        'http://127.0.0.1:51537',
        'http://127.0.0.1:9999',
        'http://127.0.0.1:8888',
        'https://clever-mermaid-713c96.netlify.app',
        'https://blog.hanverse.pub'
    ];
    
    // 检查origin是否在允许列表中，或者是否为netlify.app域名
    const isAllowedOrigin = allowedOrigins.includes(origin) || 
                           (origin && origin.includes('.netlify.app'));
    
    const allowedOrigin = isAllowedOrigin ? origin : allowedOrigins[0];
    
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
    };
};

// 处理预检请求
const handleOptions = (event) => {
    const origin = event.headers.origin || event.headers.Origin;
    return {
        statusCode: 204,
        headers: corsHeaders(origin)
    };
};

// 添加CORS头部
const addCorsHeaders = (response, event) => {
    const origin = event && (event.headers.origin || event.headers.Origin);
    
    // 开发环境下更宽松的CORS处理
    let headers = {};
    
    // 检查是否为本地开发环境
    const isLocalDevelopment = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    
    if (isLocalDevelopment) {
        // 本地开发环境下允许请求源
        headers = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        };
    } else {
        // 生产环境使用预定义的CORS头部
        headers = corsHeaders(origin);
    }
    
    return {
        ...response,
        headers: {
            ...response.headers,
            ...headers
        }
    };
};

module.exports = {
    corsHeaders,
    handleOptions,
    addCorsHeaders
};