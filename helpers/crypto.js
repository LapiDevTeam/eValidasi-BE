const CryptoJS = require("crypto-js")
const keyCrypto = process.env.CRYPTO_KEY
function decrypt(token){
    const bytes  = CryptoJS.AES.decrypt(token, keyCrypto);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return {result: originalText}
  }

  module.exports = decrypt