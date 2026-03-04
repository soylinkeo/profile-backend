// const mongoose = require('mongoose');

// async function connectDb() {
//   const uri = process.env.MONGODB_URI;
//   if (!uri) throw new Error('MONGODB_URI is not set');
//   mongoose.set('strictQuery', true);
//   await mongoose.connect(uri, { autoIndex: true });
//   console.log('[db] connected');
// }

// module.exports = { connectDb };
// utils/db.js
const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in environment variables');

  await mongoose.connect(uri);
  console.log('[db] connected');
}

module.exports = { connectDb };