
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
      let response;
      try {
        response = await fetch("http://192.168.1.69/api/lms/v1/decode", {
          method: "GET",
          headers: {
            access_token: token,
          },
        });
      } catch (fetchError) {
        // fetchError.cause holds the real network reason (ECONNRESET/ETIMEDOUT/etc)
        console.error('[authentication] LMS decode fetch failed:', fetchError.cause || fetchError);
        throw new MyError(503, "Auth service tidak dapat dihubungi, silakan coba lagi", fetchError);
      }

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

      // LMS bisa balikin HTTP 200 dengan result.user kosong (token kadaluarsa /
      // NIK tidak ketemu di master). Cek falsy sungguhan — pakai == '' tidak
      // menangkap undefined, dan request lolos dengan identitas kosong.
      const nik = result?.user?.log_NIK || "";
      if (!nik) throw new MyError(401, "Not Authentication, Silahkan Login Ulang");

      // delegated_to = siapa yang benar-benar mengerjakan. Tanpa delegasi,
      // orangnya adalah user itu sendiri. Nilainya wajib string — undefined
      // bikin Sequelize menolak replacement map di seluruh controller.
      const auth = {
        user_id: nik,
        nama_user: result?.user?.Nama || "",
        inisial_user: result?.user?.Inisial_Name || "",
        jabatan_user: result?.user?.emp_JobLevelID || "",
        joblevel_id_user: Number.isNaN(resolvedJobLevel) ? 0 : resolvedJobLevel,
        bagian_user: result?.user?.emp_DeptID || "",
        delegated_to: result?.delegatedTo?.log_NIK || nik,
      };

      req.user = auth;
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authentication };
