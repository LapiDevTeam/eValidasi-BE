
const axios = require("axios");
const MyError = require("../helpers/errors");

const authentication = async (req, res, next) => {
  try {
    // Handle both 'authentication' and 'authorization' headers
    let token = req.headers.authentication || req.headers.authorization;

    // If authorization header has 'Bearer ' prefix, remove it
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    if (!token) throw new MyError(401, "Not Authentication");
    if (token) {
      const response = await fetch("http://192.168.1.38/api/lms-dev/v1/decode", {
        method: "GET",
        headers: {
          access_token: token,
        },
      });

      const result = await response.json();

      // Debug: log raw decode result when Job_LevelID is missing/malformed.
      const rawJobLevel = result?.user?.Job_LevelID ?? result?.user?.joblevel_id_user ?? result?.user?.emp_JobLevelID;
      if (!rawJobLevel || Number.isNaN(Number(rawJobLevel))) {
        console.warn('[authentication] Job_LevelID missing or invalid. Raw result.user:', JSON.stringify(result?.user || {}));
      }

      const resolvedJobLevel = Number(
        result?.user?.Job_LevelID ??
        result?.user?.joblevel_id_user ??
        result?.user?.emp_JobLevelID ??
        0
      );

      let auth;
      if (result?.delegatedTo) {
        auth = {
          user_id: result?.user?.log_NIK || "",
          nama_user: result?.user?.Nama || "",
          inisial_user: result?.user?.Inisial_Name || "",
          jabatan_user: result?.user?.emp_JobLevelID || "",
          joblevel_id_user: Number.isNaN(resolvedJobLevel) ? 0 : resolvedJobLevel,
          bagian_user: result?.user?.emp_DeptID || "",
          delegated_to: result?.delegatedTo?.log_NIK || "",
        };
        if (result?.user?.log_NIK == '') throw new MyError(401, "Not Authentication, Silahkan Login Ulang");


      } else {
        auth = {
          user_id: result?.user?.log_NIK || "",
          nama_user: result?.user?.Nama || "",
          inisial_user: result?.user?.Inisial_Name || "",
          jabatan_user: result?.user?.emp_JobLevelID || "",
          joblevel_id_user: Number.isNaN(resolvedJobLevel) ? 0 : resolvedJobLevel,
          bagian_user: result?.user?.emp_DeptID || "",
          delegated_to: result?.user?.log_NIK || this.user_id,
        };
        if (result?.user?.log_NIK == '') throw new MyError(401, "Not Authentication, Silahkan Login Ulang");
      }

      req.user = auth;
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authentication };
