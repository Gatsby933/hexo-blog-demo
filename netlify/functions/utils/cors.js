// CORS配置
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
};

// 处理预检请求
const handleOptions = () => {
    return {
        statusCode: 204,
        headers: corsHeaders
    };
};

// 添加CORS头部
const addCorsHeaders = (response) => {
    return {
        ...response,
        headers: {
            ...response.headers,
            ...corsHeaders
        }
    };
};

module.exports = {
    corsHeaders,
    handleOptions,
    addCorsHeaders
};