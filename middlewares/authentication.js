const decrypt = require("../helpers/crypto");
const MyError = require("../helpers/errors");

const authentication = async (req, res, next) => {
  try {
    const { authentication } = req.headers;
    if (!authentication) throw new MyError(401, "Not Authentication");
    if (authentication) {
      const data = decrypt(authentication);
      // console.log(data, "<< DATA");
      if (!data) throw new MyError(401, "Not Authentication");
      const dataParse = JSON.parse(data.result);
      req.user = {
        user_id: dataParse.user_id,
        nama_user: dataParse.nama_user,
        bagian_user: dataParse.bagian_user,
        delegated_to: dataParse.delegated_to,
      };
    }
    next();
  } catch (error) {
    next(error);
  }
};
// const isAuthenticated = async (req,res,next) => {
//     try {
//         if(!req.user) throw new MyError(401, 'Invalid access Token')

//         next()
//     } catch (error) {
//         next(error)
//     }
// }

module.exports = { authentication };
