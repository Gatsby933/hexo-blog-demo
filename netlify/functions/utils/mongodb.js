const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!dbName) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable');
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 30000,  // 连接超时设置为30秒
    socketTimeoutMS: 60000,  // 套接字超时设置为60秒
    serverSelectionTimeoutMS: 30000,  // 服务器选择超时设置为30秒
    maxPoolSize: 10,  // 连接池最大连接数
    minPoolSize: 5,   // 连接池最小连接数
    maxIdleTimeMS: 45000  // 连接最大空闲时间
  });

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

module.exports = { connectToDatabase, ObjectId };