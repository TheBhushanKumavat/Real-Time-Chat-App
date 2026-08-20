const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname, '../../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const usersDbPath = path.join(dbDir, 'users.db');
const messagesDbPath = path.join(dbDir, 'messages.db');

const usersDb = new sqlite3.Database(usersDbPath, (err) => {
  if (err) {
    console.error('Error opening users database', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite users database.');
  
  usersDb.serialize(() => {
    usersDb.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      bio TEXT,
      dob TEXT,
      email TEXT,
      mobile TEXT,
      country_code TEXT DEFAULT '+1',
      profile_pic TEXT,
      theme TEXT DEFAULT 'light',
      bio_public INTEGER DEFAULT 0,
      dob_public INTEGER DEFAULT 0,
      email_public INTEGER DEFAULT 0,
      mobile_public INTEGER DEFAULT 0,
      profile_pic_public INTEGER DEFAULT 0,
      first_name_public INTEGER DEFAULT 0,
      last_name_public INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_expires INTEGER,
      status TEXT DEFAULT 'offline',
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
});

const messagesDb = new sqlite3.Database(messagesDbPath, (err) => {
  if (err) {
    console.error('Error opening messages database', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite messages database.');
  
  messagesDb.run('PRAGMA foreign_keys = ON;');
  
  messagesDb.serialize(() => {
    messagesDb.run(`CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Removed foreign key to users(id) to allow split DBs
    messagesDb.run(`CREATE TABLE IF NOT EXISTS memberships (
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      last_read_seq INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    )`);

    // Removed foreign key to users(id)
    messagesDb.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      payload TEXT NOT NULL,
      reply_to_id INTEGER,
      is_edited BOOLEAN DEFAULT 0,
      sequence_num INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    )`);
  });
});

const runUsersAsync = (sql, params = []) => new Promise((resolve, reject) => {
  usersDb.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const getUsersAsync = (sql, params = []) => new Promise((resolve, reject) => {
  usersDb.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const allUsersAsync = (sql, params = []) => new Promise((resolve, reject) => {
  usersDb.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const runMessagesAsync = (sql, params = []) => new Promise((resolve, reject) => {
  messagesDb.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const getMessagesAsync = (sql, params = []) => new Promise((resolve, reject) => {
  messagesDb.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const allMessagesAsync = (sql, params = []) => new Promise((resolve, reject) => {
  messagesDb.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

module.exports = { 
  usersDb, 
  messagesDb, 
  runUsersAsync, 
  getUsersAsync, 
  allUsersAsync,
  runMessagesAsync,
  getMessagesAsync,
  allMessagesAsync
};
