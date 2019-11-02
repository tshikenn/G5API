/** Express API router for users in get5.
 * @module routes/users
 * @requires express
 * @requires db
 */
const express = require("express");

/** Express module
 * @const
 */

const router = express.Router();
/** Database module.
 * @const
 */

const db = require("../db");

/** AES Module for Encryption/Decryption
 * @const
 */
const aes = require('aes-js');

/** Crypto for assigning random  */
const crypto = require('crypto');

/** Config to get database key.
 * @const
 */
const config = require('config');

/** GET - Route serving to get all game servers.
 * @name router.get('/')
 * @function
 * @memberof module:routes/users
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware.
 * @param {int} user_id - The user ID that is querying the data.
 */
// TODO: Once users are taken care of, and we track which user is logged in whe need to give a different SQL string, one for public servers, one for all servers.
router.get("/", async (req, res, next) => {
  try {
    // Check if admin, if they are use this query.
    let sql = "SELECT * FROM game_server";
    const allServers = await db.query(sql);
    for(let serverRow of allServers) {
      console.log("Decrypting...");
      serverRow.rcon_password = await decrypt(serverRow.rcon_password);
    }
    res.json(allServers);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

/** GET - Route serving to get one game server by database id.
 * @name router.get('/:serverid')
 * @memberof module:routes/servers
 * @function
 * @param {string} path - Express path
 * @param {number} request.param.serverid - The ID of the game server.
 * @param {callback} middleware - Express middleware.
 * @param {int} user_id - The user ID that is querying the data. Check if they own it or are an admin.
 */
router.get("/:serverid", async (req, res, next) => {
  try {
    // 
    serverID = req.params.serverid;
    let sql = "SELECT * FROM game_server where id = ?";
    const server = await db.query(sql, serverID);
    server[0].rcon_password = await decrypt(server[0].rcon_password);
    res.json(server);
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

/** POST - Create a game server in the database, and encrypt the password. 
 * @name router.post('/create')
 * @memberof module:routes/servers
 * @function
 * @param {int} req.body[0].user_id - The ID of the user creating the server to claim ownership.
 * @param {string} req.body[0].ip_string - The host of the server. Can be a URL or IP Address.
 * @param {int} req.body[0].port - The port that the server is used to connect with.
 * @param {string} req.body[0].display_name - The name that people will see on the game panel.
 * @param {string} req.body[0].rcon_password - The RCON password of the server. This will be encrypted on the server side.
 * @param {int} req.body[0].public_server - Integer value evaluating if the server is public.
 *
*/
router.post("/create", async (req, res, next) => {
  res.status(500).json({message: "NOT IMPLEMENTED."});
});

/** Inner function - boilerplate transaction call.
 * @name withTransaction
 * @function
 * @inner
 * @memberof module:routes/servers
 * @param {*} db - The database object.
 * @param {*} callback - The callback function that is operated on, usually a db.query()
 */
async function withTransaction(db, callback) {
  try {
    await db.beginTransaction();
    await callback();
    await db.commit();
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    await db.close();
  }
}

/** Inner function - Supports encryption and decryption for the database keys to get server RCON passwords.
 * @name decrypt
 * @function
 * @inner
 * @memberof module:routes/servers
 * @param {string} source - The source to be decrypted.
 */
async function decrypt(source) {
  try{
    if(source === null)
      return;
    let byteSource = aes.utils.hex.toBytes(source.substring(32));
    let IV = aes.utils.hex.toBytes(source.substring(0,32));
    let key = aes.utils.utf8.toBytes(config.get("Keys.dbKey"));
    let aesCbc = new aes.ModeOfOperation.ofb(key, IV);
    let decryptedBytes = aesCbc.decrypt(byteSource);
    let decryptedText = aes.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
  } catch ( err ){
    console.log(err);
    // fail silently.
    return null;
  }
}

/** Inner function - Supports encryption and decryption for the database keys to get server RCON passwords.
 * @name encrypt
 * @function
 * @inner
 * @memberof module:routes/servers
 * @param {string} source - The source to be decrypted.
 */
async function encrypt(source) {
  try{
    if(source === null)
      return;
    
    let byteSource = aes.utils.utf8.toBytes(source);
    let IV = crypto.randomBytes(16);
    let key = aes.utils.utf8.toBytes(config.get("Keys.dbKey"));
    let aesCbc = new aes.ModeOfOperation.ofb(key, IV);
    let encryptedBytes = aesCbc.encrypt(byteSource);
    let encryptedHex = aes.utils.hex.fromBytes(encryptedBytes);
    let hexIV = aes.utils.hex.fromBytes(IV);
    console.log(encryptedHex);
    encryptedHex = hexIV + encryptedHex;
    console.log(encryptedHex);
    return encryptedHex;
  } catch ( err ){
    console.log(err);
    throw err
  }
}

module.exports = router;