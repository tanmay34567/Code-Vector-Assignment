const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codevector';
let client;
let db;

async function connectDB() {
  if (db) return db;
  try {
    client = new MongoClient(uri, {
      maxPoolSize: 20, // Configure size of the connection pool
    });
    await client.connect();
    db = client.db();
    console.log('MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

module.exports = { connectDB, getDB, client };
