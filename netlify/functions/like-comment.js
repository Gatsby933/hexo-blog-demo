const { connectToDatabase } = require('./utils/mongodb');
const { handleOptions } = require('./utils/cors');
const { getTokenFromHeader, verifyToken } = require('./utils/auth');
const { createSuccessResponse, createErrorResponse, validateHttpMethod, validateRequiredFields, asyncHandler } = require('./utils/response');
const { ObjectId } = require('mongodb');

exports.handler = asyncHandler(async (event, context) => {
  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 验证HTTP方法
  const methodError = validateHttpMethod(event.httpMethod, 'POST', event);
  if (methodError) return methodError;

  // 验证用户身份
  const token = getTokenFromHeader(event.headers);
  if (!token) {
    return createErrorResponse('需要登录才能点赞', 401, null, event);
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return createErrorResponse('登录已过期，请重新登录', 401, null, event);
  }

  const currentUser = tokenResult.decoded;

  // 解析请求体
  const { commentId, action } = JSON.parse(event.body);

  // 验证必需字段
  const validationError = validateRequiredFields(
    { commentId, action },
    ['commentId', 'action'],
    event
  );
  if (validationError) return validationError;

  // 验证action参数
  if (!['like', 'unlike'].includes(action)) {
    return createErrorResponse('无效的操作类型', 400, null, event);
  }

  // 验证commentId格式
  if (!ObjectId.isValid(commentId)) {
    return createErrorResponse('无效的评论ID', 400, null, event);
  }

  // 连接数据库
  const { db } = await connectToDatabase();
  const comments = db.collection('comments');

  // 查找评论
  const comment = await comments.findOne({ _id: new ObjectId(commentId) });
  if (!comment) {
    return createErrorResponse('评论不存在', 404, null, event);
  }

  const userId = currentUser.userId;
  const likedBy = comment.likedBy || [];
  const hasLiked = likedBy.includes(userId);

  let updateResult;
  let newLikeCount;

  if (action === 'like') {
    if (hasLiked) {
      return createErrorResponse('您已经点赞过这条评论', 400, null, event);
    }
    
    // 添加点赞
    updateResult = await comments.updateOne(
      { _id: new ObjectId(commentId) },
      {
        $inc: { likes: 1 },
        $addToSet: { likedBy: userId }
      }
    );
    newLikeCount = (comment.likes || 0) + 1;
  } else {
    if (!hasLiked) {
      return createErrorResponse('您还没有点赞过这条评论', 400, null, event);
    }
    
    // 取消点赞
    updateResult = await comments.updateOne(
      { _id: new ObjectId(commentId) },
      {
        $inc: { likes: -1 },
        $pull: { likedBy: userId }
      }
    );
    newLikeCount = Math.max(0, (comment.likes || 0) - 1);
  }

  if (updateResult.modifiedCount === 0) {
    return createErrorResponse('操作失败，请重试', 500, null, event);
  }

  return createSuccessResponse({
    message: action === 'like' ? '点赞成功' : '取消点赞成功',
    likes: newLikeCount,
    hasLiked: action === 'like'
  }, 200, {}, event);
});