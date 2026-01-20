const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { uploadFileToFTP, formatFileName, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');


const getPermohonanKalibrasiList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { tahun, bagian } = req.query;
    const userDepartment = req.user?.bagian_user || '';

    // Build the SQL query matching the VBA logic exactly
    let query = `
      SELECT
        A.No_Permohonan,
        pemohon,
        bagian,
        CONVERT(varchar(20), tanggal, 13) as tanggal,
        kategori_permohonan,
        nama_instrumen,
        No_identitas_Istrumen,
        No_identitas_kalibrasi,
        Alat_ukur_kalibrasi,
        Merk,
        Kapasitas,
        Jumlah,
        fungsi,
        Titik_pengukuran,
        Lokasi,
        tgl_butuh,
        no_sertifikat_terakhir,
        dbo.fnGetNamaKaryawan(B.USER_ID) as Approver_Identity,
        CONVERT(varchar(20), B.Process_Date, 13) as Process_Date,
        dbo.fnGetNamaKaryawan(C.USER_ID) as Approver_MgrQA,
        CONVERT(varchar(20), C.Process_Date, 13) as Approver_MgrQADate,
        A.QA_ID,
        A.ID_No_Sertifikat
      FROM T_Kalibrasi_Permohonan as A
      LEFT JOIN (
        SELECT * FROM t_Kalibrasi_Status WHERE Approver_No = 1
      ) as B ON A.No_Permohonan = B.No_Permohonan
      LEFT JOIN (
        SELECT * FROM t_Kalibrasi_Status WHERE Approver_No = 2
      ) as C ON A.No_Permohonan = C.No_Permohonan
      WHERE YEAR(tanggal) LIKE :tahun
        AND 1=1
    `;

    // Apply department filter - same logic as VBA
    // If department is not 'VN', filter by department
    const deptToFilter = bagian || userDepartment;
    if (deptToFilter && deptToFilter !== 'VN' && deptToFilter !== 'QA') {
      query += ` AND bagian = :bagian`;
    }

    query += ` ORDER BY A.tanggal DESC`;

    const replacements = {
      tahun: tahun ? `%${tahun}%` : '%%',
      bagian: deptToFilter
    };

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format the date fields for tgl_butuh to match VBA format (dd-MMM-yyyy)
    const formattedResults = results.map(row => ({
      ...row,
      tgl_butuh: row.tgl_butuh ? moment(row.tgl_butuh).format('DD-MMM-YYYY') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in getPermohonanKalibrasiList:', error);
    next(error);
  }
};

/**
 * Get Permohonan Kalibrasi Detail (grid_Head_DblClick)
 * Retrieves single calibration request detail by No_Permohonan
 * Based on VBA grid_Head_DblClick function
 */
const getPermohonanDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    const query = `
      SELECT
        pemohon,
        bagian,
        tanggal,
        kategori_permohonan,
        QA_ID_rekalibrasi,
        Ket_Rekalibrasi,
        nama_instrumen,
        No_identitas_Istrumen,
        No_identitas_kalibrasi,
        Alat_ukur_kalibrasi,
        Merk,
        Kapasitas,
        Jumlah,
        fungsi,
        Titik_pengukuran,
        Lokasi,
        tgl_butuh,
        no_sertifikat_terakhir
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    const data = results[0];

    // Format dates
    const formattedData = {
      ...data,
      tanggal: data.tanggal ? moment(data.tanggal).format('DD-MMM-YYYY') : '',
      tgl_butuh: data.tgl_butuh ? moment(data.tgl_butuh).format('DD-MMM-YYYY') : ''
    };

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedData
    });

  } catch (error) {
    console.error('Error in getPermohonanDetail:', error);
    next(error);
  }
};

/**
 * Search Instrumen (cmdCari_Nama_Click)
 * Searches instruments across multiple kalibrasi tables
 * Based on VBA cmdCari_Nama_Click function
 */
const searchInstrumen = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'search parameter is required'
      });
    }

    const query = `
      SELECT * FROM (
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi
        FROM T_Kalibrasi_DA_Thermohygro
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi
        FROM T_Kalibrasi_DA_Anak_Timbangan
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi
        FROM T_Kalibrasi_DA_Timbangan
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi
        FROM T_Kalibrasi_DA_Bagian
      ) AS A
      WHERE (
        QA_ID LIKE :search OR
        Assm_nama_instrumen LIKE :search OR
        Assm_No_identitas_Istrumen LIKE :search OR
        Assm_No_identitas_kalibrasi LIKE :search
      )
      ORDER BY 1
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${search}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in searchInstrumen:', error);
    next(error);
  }
};

/**
 * Check Approve Button (sb_approve_button)
 * Checks if user can approve and approval status
 * Based on VBA sb_approve_button function
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan, bagian } = req.query;

    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(200).json({
        success: true,
        data: {
          can_approve: false,
          can_print: false,
          message: 'No permohonan is empty or Auto'
        }
      });
    }

    let canApprove = false;
    let canPrint = false;

    // Check if user is in approver list
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'Kal_permohonan'
        AND Appr_No = 1
        AND Appr_ID = :user_id
        AND Appr_DeptID = :bagian
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id, bagian: bagian || bagian_user },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isAllowed = approverResults.length > 0;

    // Check if already approved
    const statusQuery = `
      SELECT COUNT(*) as JumRow
      FROM t_Kalibrasi_Status
      WHERE no_permohonan = :no_permohonan
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = statusResults[0].JumRow;

    if (jumRow === 0 && isAllowed) {
      canApprove = true;
    }

    // Check if can print (already approved)
    if (jumRow > 0) {
      canPrint = true;
    }

    return res.status(200).json({
      success: true,
      data: {
        can_approve: canApprove,
        can_print: canPrint,
        is_allowed_approver: isAllowed,
        approval_count: jumRow
      }
    });

  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * Check Is Approved (fn_IS_approve)
 * Checks if permohonan is already approved
 * Based on VBA fn_IS_approve function
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(200).json({
        success: true,
        data: {
          is_approved: false
        }
      });
    }

    const query = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 1
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApproved = results.length > 0;

    return res.status(200).json({
      success: true,
      data: {
        is_approved: isApproved,
        approval_data: isApproved ? results[0] : null
      }
    });

  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    next(error);
  }
};

/**
 * Get File Download (sbFill_FileDownload)
 * Gets filename for download
 * Based on VBA sbFill_FileDownload function
 */
const getFileDownload = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    const query = `
      SELECT TOP 1 ISNULL(FILE_NAME, '') as fileNama
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const fileName = results.length > 0 ? results[0].fileNama : '';

    return res.status(200).json({
      success: true,
      data: {
        file_name: fileName,
        has_file: fileName !== ''
      }
    });

  } catch (error) {
    console.error('Error in getFileDownload:', error);
    next(error);
  }
};

/**
 * Save Permohonan Kalibrasi (cmd_Save_Click)
 * Handles both INSERT (new) and UPDATE operations
 * Based on VBA cmd_Save_Click function
 */
const savePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      no_permohonan,
      kategori_permohonan,
      qa_id_rekalibrasi,
      ket_rekalibrasi,
      nama_instrumen,
      no_identitas_istrumen,
      no_identitas_kalibrasi,
      alat_ukur_kalibrasi,
      merk,
      kapasitas,
      jumlah,
      fungsi,
      titik_pengukuran,
      lokasi,
      tgl_butuh,
      no_sertifikat_terakhir,
      file_name
    } = req.body;

    // Validation 1: Kategori Permohonan required
    if (!kategori_permohonan || kategori_permohonan.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Kategori Permohonan harus di isi'
      });
    }

    // Validation 2: Tanggal butuh required
    if (!tgl_butuh || tgl_butuh.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tanggal butuh harus diisi'
      });
    }

    // Validation 3: If Re-Kalibrasi, keterangan required
    if (kategori_permohonan === 'Re-Kalibrasi' && (!ket_rekalibrasi || ket_rekalibrasi.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Keterangan Re-Kalibrasi harus di isi!'
      });
    }

    // Format tgl_butuh to yyyy/MM/dd
    const formattedTglButuh = moment(tgl_butuh).format('YYYY/MM/DD');

    // Check if this is INSERT (new) or UPDATE
    const isNew = !no_permohonan || no_permohonan === 'Auto' || no_permohonan === '';

    if (isNew) {
      // INSERT NEW RECORD
      // Get auto number using fnGet_NO_Kal_mohon function
      const autoNumQuery = `SELECT dbo.fnGet_NO_Kal_mohon(:bagian_user) as autoNum`;
      const autoNumResults = await sequelizeMSQL.query(autoNumQuery, {
        replacements: { bagian_user },
        type: Sequelize.QueryTypes.SELECT,
      });

      const autoNum = autoNumResults[0].autoNum;

      // Prepare file name if file uploaded
      let v_file_name = '';
      if (file_name && file_name.trim() !== '') {
        // Replace / with _ in auto number and append extension
        const fileNameCleaned = autoNum.replace(/\//g, '_');
        v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
      }

      // INSERT query - exact match to VBA
      const insertQuery = `
        INSERT INTO T_Kalibrasi_Permohonan(
          No_Permohonan,
          tanggal,
          kategori_permohonan,
          QA_ID_rekalibrasi,
          Ket_Rekalibrasi,
          pemohon,
          bagian,
          nama_instrumen,
          No_identitas_Istrumen,
          No_identitas_kalibrasi,
          Alat_ukur_kalibrasi,
          Merk,
          Kapasitas,
          Jumlah,
          fungsi,
          Titik_pengukuran,
          Lokasi,
          tgl_butuh,
          no_sertifikat_terakhir,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Assm_Alat_ukur_kalibrasi,
          Assm_Merk,
          Assm_Kapasitas,
          Assm_Lokasi,
          Titik_pengukuran_kalibrasi,
          Group_Da_Dept,
          FILE_NAME,
          UserID,
          Delegated_To,
          Process_date
        )
        VALUES(
          :no_permohonan,
          GETDATE(),
          :kategori_permohonan,
          :qa_id_rekalibrasi,
          :ket_rekalibrasi,
          :user_id,
          :bagian_user,
          :nama_instrumen,
          :no_identitas_istrumen,
          :no_identitas_kalibrasi,
          :alat_ukur_kalibrasi,
          :merk,
          :kapasitas,
          :jumlah,
          :fungsi,
          :titik_pengukuran,
          :lokasi,
          :tgl_butuh,
          :no_sertifikat_terakhir,
          :nama_instrumen,
          :no_identitas_istrumen,
          :no_identitas_kalibrasi,
          :alat_ukur_kalibrasi,
          :merk,
          :kapasitas,
          :lokasi,
          :titik_pengukuran,
          :bagian_user,
          :file_name,
          :user_id,
          :delegated_to,
          GETDATE()
        )
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          no_permohonan: autoNum,
          kategori_permohonan: kategori_permohonan || '',
          qa_id_rekalibrasi: qa_id_rekalibrasi || '',
          ket_rekalibrasi: ket_rekalibrasi || '',
          user_id: user_id,
          bagian_user: bagian_user,
          nama_instrumen: nama_instrumen || '',
          no_identitas_istrumen: no_identitas_istrumen || '',
          no_identitas_kalibrasi: no_identitas_kalibrasi || '',
          alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
          merk: merk || '',
          kapasitas: kapasitas || '',
          jumlah: jumlah || '',
          fungsi: fungsi || '',
          titik_pengukuran: titik_pengukuran || '',
          lokasi: lokasi || '',
          tgl_butuh: formattedTglButuh,
          no_sertifikat_terakhir: no_sertifikat_terakhir || '',
          file_name: v_file_name,
          delegated_to: delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(201).json({
        success: true,
        message: 'Data has been saved',
        data: {
          no_permohonan: autoNum
        }
      });

    } else {
      // UPDATE EXISTING RECORD
      // Check if already approved - cannot update if approved
      const checkApprovedQuery = `
        SELECT *
        FROM t_Kalibrasi_Status
        WHERE No_Permohonan = :no_permohonan
          AND Approver_No = 1
      `;

      const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
        replacements: { no_permohonan },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (approvedResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Data sudah approve, tidak bisa diupdate!'
        });
      }

      // Prepare file name update clause
      let fileNameClause = '';
      let v_file_name = '';
      if (file_name && file_name.trim() !== '') {
        const fileNameCleaned = no_permohonan.replace(/\//g, '_');
        v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
        fileNameClause = `, FILE_NAME = :file_name`;
      }

      // UPDATE query - exact match to VBA
      const updateQuery = `
        UPDATE T_Kalibrasi_Permohonan
        SET
          QA_ID_rekalibrasi = :qa_id_rekalibrasi,
          Ket_Rekalibrasi = :ket_rekalibrasi,
          nama_instrumen = :nama_instrumen,
          No_identitas_Istrumen = :no_identitas_istrumen,
          No_identitas_kalibrasi = :no_identitas_kalibrasi,
          Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
          Merk = :merk,
          Kapasitas = :kapasitas,
          Jumlah = :jumlah,
          fungsi = :fungsi,
          Titik_pengukuran = :titik_pengukuran,
          Lokasi = :lokasi,
          tgl_butuh = :tgl_butuh,
          no_sertifikat_terakhir = :no_sertifikat_terakhir,
          Assm_nama_instrumen = :nama_instrumen,
          Assm_No_identitas_Istrumen = :no_identitas_istrumen,
          Assm_No_identitas_kalibrasi = :no_identitas_kalibrasi,
          Assm_Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
          Assm_Merk = :merk,
          Assm_Kapasitas = :kapasitas,
          Assm_Lokasi = :lokasi,
          Titik_pengukuran_kalibrasi = :titik_pengukuran${fileNameClause},
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        WHERE No_Permohonan = :no_permohonan
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          no_permohonan,
          qa_id_rekalibrasi: qa_id_rekalibrasi || '',
          ket_rekalibrasi: ket_rekalibrasi || '',
          nama_instrumen: nama_instrumen || '',
          no_identitas_istrumen: no_identitas_istrumen || '',
          no_identitas_kalibrasi: no_identitas_kalibrasi || '',
          alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
          merk: merk || '',
          kapasitas: kapasitas || '',
          jumlah: jumlah || '',
          fungsi: fungsi || '',
          titik_pengukuran: titik_pengukuran || '',
          lokasi: lokasi || '',
          tgl_butuh: formattedTglButuh,
          no_sertifikat_terakhir: no_sertifikat_terakhir || '',
          file_name: v_file_name,
          user_id: user_id,
          delegated_to: delegated_to
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated',
        data: {
          no_permohonan
        }
      });
    }

  } catch (error) {
    console.error('Error in savePermohonanKalibrasi:', error);
    next(error);
  }
};

/**
 * Delete Permohonan Kalibrasi (cmd_Del_Click)
 * Deletes calibration request if not approved
 * Based on VBA cmd_Del_Click function
 */
const deletePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    // Validation 1: no_permohonan required
    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih data yang akan dihapus'
      });
    }

    // Validation 2: Check if already approved - cannot delete if approved
    const checkApprovedQuery = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 1
    `;

    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvedResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data sudah approve, tidak bisa dihapus!'
      });
    }

    // Delete query - exact match to VBA
    const deleteQuery = `
      DELETE FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: {
        no_permohonan
      }
    });

  } catch (error) {
    console.error('Error in deletePermohonanKalibrasi:', error);
    next(error);
  }
};

/**
 * Approve Permohonan Kalibrasi (cmd_Approve_Click)
 * Approves calibration request by inserting approval record
 * Based on VBA cmd_Approve_Click function
 */
const approvePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    // Validation: no_permohonan required
    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih data yang akan di Approve!'
      });
    }

    // Get approver identity using fnApprIdentity equivalent
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;

    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const appr_ident = approverResults.length > 0 ? approverResults[0].Appr_Identity : '0';

    // Insert approval record - exact match to VBA
    const insertApprovalQuery = `
      INSERT INTO t_Kalibrasi_Status(
        No_Permohonan,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES(
        :no_permohonan,
        1,
        0,
        :approver_identity,
        GETDATE(),
        :user_id,
        :delegated_to,
        NULL
      )
    `;

    await sequelizeMSQL.query(insertApprovalQuery, {
      replacements: {
        no_permohonan,
        approver_identity: appr_ident,
        user_id: user_id,
        delegated_to: delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved',
      data: {
        no_permohonan,
        approver_identity: appr_ident
      }
    });

  } catch (error) {
    console.error('Error in approvePermohonanKalibrasi:', error);
    next(error);
  }
};

/**
 * Helper function: Get Approver Identity (fnApprIdentity)
 * Gets approver identity from m_approver_lines
 * Based on VBA fnApprIdentity function
 */
const getApproverIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_no } = req.query;

    const appr_no = approver_no || '1';

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :user_id
        AND Appr_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        user_id,
        approver_no: appr_no
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const approverIdentity = results.length > 0 ? results[0].Appr_Identity : '0';

    return res.status(200).json({
      success: true,
      data: {
        approver_identity: approverIdentity,
        has_approval_right: results.length > 0
      }
    });

  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    next(error);
  }
};

/**
 * Upload File for Kalibrasi Permohonan (fnUploadFile)
 * Uploads a file to FTP server with formatted filename
 * Based on VBA fnUploadFile function
 */
const uploadFileKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!no_permohonan) {
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'No_Permohonan is required'
      });
    }

    const localFilePath = path.resolve(req.file.path);
    const originalFileName = req.file.originalname;

    console.log('Upload details:', {
      localFilePath,
      exists: fs.existsSync(localFilePath),
      originalFileName,
      no_permohonan
    });

    if (!fs.existsSync(localFilePath)) {
      return res.status(500).json({
        success: false,
        message: 'Uploaded file not found on server'
      });
    }

    const remoteFileName = formatFileName(no_permohonan, originalFileName);

    const uploadResult = await uploadFileToFTP(localFilePath, remoteFileName);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || 'Error uploading file to FTP'
      });
    }

    const updateQuery = `
      UPDATE T_Kalibrasi_Permohonan
      SET FILE_NAME = :fileName
      WHERE No_Permohonan = :no_permohonan
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        fileName: remoteFileName,
        no_permohonan
      },
      type: Sequelize.QueryTypes.UPDATE
    });

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file_name: remoteFileName,
        no_permohonan
      }
    });

  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error in uploadFileKalibrasi:', error);
    next(error);
  }
};

module.exports = {
  getPermohonanKalibrasiList,
  getPermohonanDetail,
  searchInstrumen,
  checkApproveButton,
  checkIsApproved,
  getFileDownload,
  savePermohonanKalibrasi,
  deletePermohonanKalibrasi,
  approvePermohonanKalibrasi,
  getApproverIdentity,
  uploadFileKalibrasi
};

