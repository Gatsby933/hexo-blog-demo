// CORS配置
const corsHeaders = (origin) => ({
    'Access-Control-Allow-Origin': origin || 'http://localhost:51537',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
});

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