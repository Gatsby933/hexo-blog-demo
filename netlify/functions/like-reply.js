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
  validateHttpMethod(event, 'POST');

  // 解析请求体
  const { parentId, replyIndex, action } = JSON.parse(event.body);

  // 验证必需字段
  validateRequiredFields({ parentId, replyIndex, action }, ['parentId', 'replyIndex', 'action']);

  // 验证并获取用户信息
  const token = getTokenFromHeader(event);
  const currentUser = await verifyToken(token);
  if (!currentUser) {
    return createErrorResponse('用户未登录或token无效', 401, null, event);
  }

  // 验证action参数
  if (!['like', 'unlike'].includes(action)) {
    return createErrorResponse('无效的操作类型', 400, null, event);
  }

  // 验证parentId格式
  if (!ObjectId.isValid(parentId)) {
    return createErrorResponse('无效的父评论ID', 400, null, event);
  }

  // 验证replyIndex
  if (typeof replyIndex !== 'number' || replyIndex < 0) {
    return createErrorResponse('无效的回复索引', 400, null, event);
  }

  // 连接数据库
  const { db } = await connectToDatabase();
  const comments = db.collection('comments');

  // 查找父评论
  const parentComment = await comments.findOne({ _id: new ObjectId(parentId) });
  if (!parentComment) {
    return createErrorResponse('父评论不存在', 404, null, event);
  }

  // 检查回复是否存在
  if (!parentComment.replies || replyIndex >= parentComment.replies.length) {
    return createErrorResponse('回复不存在', 404, null, event);
  }

  const reply = parentComment.replies[replyIndex];
  const userId = currentUser.userId;
  const likedBy = reply.likedBy || [];
  const hasLiked = likedBy.includes(userId);

  let updateOperation;
  let newLikeCount;

  if (action === 'like') {
    if (hasLiked) {
      return createErrorResponse('您已经点赞过这条回复', 400, null, event);
    }
    
    // 添加点赞
    updateOperation = {
      $inc: { [`replies.${replyIndex}.likes`]: 1 },
      $addToSet: { [`replies.${replyIndex}.likedBy`]: userId }
    };
    newLikeCount = (reply.likes || 0) + 1;
  } else {
    if (!hasLiked) {
      return createErrorResponse('您还没有点赞过这条回复', 400, null, event);
    }
    
    // 取消点赞
    updateOperation = {
      $inc: { [`replies.${replyIndex}.likes`]: -1 },
      $pull: { [`replies.${replyIndex}.likedBy`]: userId }
    };
    newLikeCount = Math.max((reply.likes || 0) - 1, 0);
  }

  // 更新数据库
  const updateResult = await comments.updateOne(
    { _id: new ObjectId(parentId) },
    updateOperation
  );

  if (updateResult.matchedCount === 0) {
    return createErrorResponse('更新失败，评论不存在', 404, null, event);
  }

  if (updateResult.modifiedCount === 0) {
    return createErrorResponse('更新失败，请稍后重试', 500, null, event);
  }

  // 返回成功响应
  return createSuccessResponse({
    message: action === 'like' ? '点赞成功' : '取消点赞成功',
    likes: newLikeCount,
    hasLiked: action === 'like'
  }, 200, {}, event);
});