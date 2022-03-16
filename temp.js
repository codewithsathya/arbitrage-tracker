// (async () => {
//   try {
//     console.time("set request");
//     await redisClient.json.set("main", ".", {
//       count: 1,
//       rollNo: "19ec01023",
//       name: "Sathiya Seelan"
//     })
//     console.timeEnd("set request");
//     console.time("get request");
//     let name = await redisClient.json.get("main", {
//       path: "name"
//     });
//     console.timeEnd("get request");
//     console.log(name);
//   } catch (e) {
//     console.error(e);
//   }
// })();

let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// create a set with the values from the array
let set = new Set(arr);
console.log(set);

const crypto = require('crypto');
const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

//Encrypting text
function encrypt(text) {
   let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
   let encrypted = cipher.update(text);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypting text
function decrypt(text) {
   let iv = Buffer.from(text.iv, 'hex');
   let encryptedText = Buffer.from(text.encryptedData, 'hex');
   let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);
   return decrypted.toString();
}

// Text send to encrypt function
var hw = encrypt("Welcome to Tutorials Point...")
console.log(hw)
console.log(decrypt(hw))
