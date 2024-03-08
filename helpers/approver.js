const { t_productBrief_status } = require("../models/index");
const sql = require("mssql");
const configMssql = {
  user: process.env.MS_SQL_DB_USER,
  password: process.env.MS_SQL_DB_PWD,
  server: process.env.MS_SQL_DB_SERVER,
  database: process.env.MS_SQL_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
const isApproveValidation = async (
  //   nama_pekerja,
  apprApplicationCode,
  apprDeptId,
  apprNo,
  user_id,
  nama_user
) => {
  try {
    let isApprove = false;
    console.log(
      //   nama_pekerja,
      apprApplicationCode,
      apprDeptId,
      apprNo,
      user_id,
      //   nama_user,
      "<<< DATAAAA"
    );
    const pool = await sql.connect(configMssql);

    const request = pool.request();
    const result1 = await request
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprApplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), apprDeptId)
      .input("Appr_No", sql.Int, apprNo)
      .input("Appr_ID", sql.NVarChar(50), user_id)
      .query(
        `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No AND mal.Appr_ID = @Appr_ID`
      );

    // if (apprNo === 1 && nama_pekerja === nama_user) isApprove = true;
    console.log(result1, "<< result 1");
    if (result1.recordset.length > 0) isApprove = true;
    return isApprove;
  } catch (error) {
    return { message: "Gagal memuat" };
  }
};
const approverRecordset = async (
  //   nama_pekerja,
  apprAplicationCode,
  bagian,
  apprNo,
  user_id,
  nama_user
) => {
  try {
    console.log(
      //   nama_pekerja,
      apprAplicationCode,
      bagian,
      apprNo,
      user_id,
      nama_user,
      29
    );
    let queryApprover = `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No AND mal.Appr_ID = @Appr_ID `;
    // if (apprNo === 1) {
    //   if (nama_pekerja !== nama_user)
    //     throw new MyError(402, "Not Authentication");
    //   queryApprover = `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No`;
    // }

    const pool = await sql.connect(configMssql);
    const request = pool.request();
    const result = await request
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprAplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), bagian)
      .input("Appr_ID", sql.NVarChar(50), user_id)
      .input("Appr_No", sql.Int, apprNo)
      .query(queryApprover);

    const request1 = pool.request();
    const result1 = await request1
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprAplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), bagian)
      .input("Appr_No", sql.Int, apprNo + 1)
      .query(
        `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No `
      );
    const recordset = result.recordset;
    const recordset1 = result1.recordset;
    return { recordset, recordset1 };
  } catch (error) {
    return { message: "gagal approved" };
  }
};
// const approverCuti = async (
//   EKepegawaianCutiId,
//   approver_no,
//   is_approve,
//   approver_name,
//   approver_joblevel_id,
//   keterangan_reject,
//   status_cuti,
//   user_id,
//   delegated_to,
//   statusCuti
// ) => {
//   try {
//     let status = statusCuti;
//     if (!is_approve) status = "Reject";
//     await t_eKepegawaian_cuti_status.create({
//       EKepegawaianCutiId,
//       approver_no,
//       is_approve,
//       approver_name,
//       approver_joblevel_id,
//       keterangan_reject,
//       status_cuti,
//       user_id,
//       delegated_to,
//     });
//     await t_eKepegawaian_cuti.update(
//       {
//         statusCuti: status,
//         alasan_reject: keterangan_reject,
//         user_id,
//         delegated_to,
//       },
//       {
//         where: {
//           id: EKepegawaianCutiId,
//         },
//       }
//     );
//     return { message: "berhasil approve" };
//   } catch (error) {
//     console.log(error);
//     return { message: "gagal approved" };
//   }
// };
// const approverHrCuti = async (detailSisaCuti, findCuti, id) => {
//   try {
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     let total_sisa_cuti_tahun_sebelumnya =
//       detailSisaCuti.sisa_cuti_tahun_sebelumnya - +detailSisaCuti.jumlah_cuti;
//     let total_sisa_cuti_tahun_ini =
//       detailSisaCuti.total_sisa_cuti - detailSisaCuti.sisa_cuti_tahun_ini;
//     await t_eKepegawaian_cuti.update(
//       {
//         total_sisa_cuti: detailSisaCuti.total_sisa_cuti,
//         sisa_cuti_tahun_ini: detailSisaCuti.sisa_cuti_tahun_ini,
//         sisa_cuti_tahun_sebelumnya: detailSisaCuti.sisa_cuti_tahun_sebelumnya,
//       },
//       {
//         where: {
//           id,
//         },
//       }
//     );
//     if (total_sisa_cuti_tahun_sebelumnya <= 0) {
//       await t_eKepegawaian_cuti_karyawan.update(
//         {
//           sisa_cuti: 0,
//         },
//         {
//           where: {
//             pk_id: findCuti.pk_id_pegawai,
//             nama_pekerja: findCuti.nama_pegawai,
//             periode: currentYear - 1,
//           },
//         }
//       );
//     } else {
//       await t_eKepegawaian_cuti_karyawan.update(
//         {
//           sisa_cuti: total_sisa_cuti_tahun_sebelumnya,
//         },
//         {
//           where: {
//             pk_id: findCuti.pk_id_pegawai,
//             nama_pekerja: findCuti.nama_pegawai,
//             periode: currentYear - 1,
//           },
//         }
//       );
//     }
//     if (total_sisa_cuti_tahun_ini < 0) {
//       let sisa_cuti_tahun_ini = detailSisaCuti.sisa_cuti_tahun_ini;
//       await t_eKepegawaian_cuti_karyawan.update(
//         {
//           sisa_cuti: sisa_cuti_tahun_ini + total_sisa_cuti_tahun_ini,
//         },
//         {
//           where: {
//             pk_id: findCuti.pk_id_pegawai,
//             nama_pekerja: findCuti.nama_pegawai,
//             periode: currentYear,
//           },
//         }
//       );
//     }
//     return { message: "berhasil approve" };
//   } catch (error) {
//     console.log(error);
//     return { message: "gagal approved" };
//   }
// };

module.exports = {
  isApproveValidation,
  approverRecordset,
  //   approverCuti,
  //   approverHrCuti,
};
