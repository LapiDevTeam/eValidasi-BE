const decrypt = require("../helpers/crypto");
const MyError = require("../helpers/errors");
const axios = require("axios");

const authentication = async (req, res, next) => {
  try {
    const { authentication } = req.headers;

    if (!authentication) throw new MyError(401, "Not Authentication");
    if (authentication) {
      const response = await fetch(
        "http://192.168.1.38/api/lms/v1/decode",
        {
          method: "GET",
          headers: {
            access_token: authentication,
          },
        }
      );

      const result = await response.json();

      let auth;
      if (result?.delegatedTo) {
        auth = {
          user_id: result?.user?.log_NIK || "",
          nama_user: result?.user?.Nama || "",
          inisial_user: result?.user?.Inisial_Name || "",
          jabatan_user: result?.user?.emp_JobLevelID || "",
          joblevel_id_user: +result?.user?.Job_LevelID,
          bagian_user: result?.user?.emp_DeptID || "",
          delegated_to: result?.delegatedTo?.log_NIK || "",
        };
      } else {
        auth = {
          user_id: result?.user?.log_NIK || "",
          nama_user: result?.user?.Nama || "",
          inisial_user: result?.user?.Inisial_Name || "",
          jabatan_user: result?.user?.emp_JobLevelID || "",
          joblevel_id_user: +result?.user?.Job_LevelID,
          bagian_user: result?.user?.emp_DeptID || "",
          delegated_to: result?.user?.log_NIK || "",
        };
      }

      req.user = auth;
    }
    next();
  } catch (error) {
    console.log(error, "<<");
    next(error);
  }
};

module.exports = { authentication };
