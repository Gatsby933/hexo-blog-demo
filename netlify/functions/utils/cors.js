// CORS配置
const corsHeaders = (origin) => {
    // 允许的域名列表
    const allowedOrigins = [
        'http://localhost:51537',
        'http://localhost:9999',
        'https://clever-mermaid-713c96.netlify.app',
        'https://blog.hanverse.pub'
    ];
    
    // 检查origin是否在允许列表中
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    
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
    return {
        ...response,
        headers: {
            ...response.headers,
            ...corsHeaders(origin)
        }
    };
};

module.exports = {
    corsHeaders,
    handleOptions,
    addCorsHeaders
};