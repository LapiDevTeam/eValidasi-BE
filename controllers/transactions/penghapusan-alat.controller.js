const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { getApproverIdentity, getNoHapus, getSeqIDNoHapus } = require('../../helpers/kalibrasi.helper');

/**
 * GET /list
 * VBA: sb_Show_Grid_head
 * Lists penghapusan alat header records filtered by year and department.
 * Query params: tahun, bagian (optional – defaults to user's department)
 */
const getPenghapusanList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { tahun, bagian } = req.query;

    const deptToFilter = bagian || bagian_user || '';
    const yearFilter = tahun || moment().utcOffset(7).year().toString();

    let query = `
      SELECT
        A.no_penghapusan,
        A.tanggal,
        A.pemohon,
        A.bagian,
        B.appr_Mgr_Dept,
        CONVERT(nvarchar, B.appr_Mgr_Dept_Date, 106) AS appr_Mgr_Dept_Date,
        C.appr_Mgr_QA,
        CONVERT(nvarchar, C.appr_Mgr_QA_Date, 106) AS appr_Mgr_QA_Date
      FROM T_Kalibrasi_Penghapusan AS A
      LEFT JOIN (
        SELECT no_penghapusan, USER_ID AS appr_Mgr_Dept, process_date AS appr_Mgr_Dept_Date
        FROM T_Kalibrasi_Penghapusan_status
        WHERE approver_no = 1
      ) AS B ON A.no_penghapusan = B.no_penghapusan
      LEFT JOIN (
        SELECT no_penghapusan, USER_ID AS appr_Mgr_QA, process_date AS appr_Mgr_QA_Date
        FROM T_Kalibrasi_Penghapusan_status
        WHERE approver_no = 2
      ) AS C ON A.no_penghapusan = C.no_penghapusan
      WHERE year(A.tanggal) = :yearFilter
        AND 1 = 1
    `;

    const replacements = { yearFilter };

    // VBA: if gstrDepartment <> 'VN' then AND A.bagian like '{dept}%'
    if (deptToFilter && deptToFilter !== 'VN') {
      query += ` AND A.bagian LIKE :bagianFilter`;
      replacements.bagianFilter = `${deptToFilter}%`;
    }

    query += ` ORDER BY A.tanggal DESC`;

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in getPenghapusanList:', error);
    next(error);
  }
};

/**
 * GET /detail
 * VBA: grid_Head_DblClick (header fetch portion)
 * Retrieves a single penghapusan header record by no_penghapusan.
 * Query params: no_penghapusan (required)
 */
const getPenghapusanDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan } = req.query;

    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'no_penghapusan is required',
      });
    }

    const query = `
      SELECT
        no_penghapusan,
        tanggal,
        pemohon,
        bagian
      FROM T_Kalibrasi_Penghapusan
      WHERE no_penghapusan = :no_penghapusan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
    }

    const data = results[0];

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: {
        ...data,
        tanggal: data.tanggal
          ? moment(data.tanggal).utcOffset(7).format('DD-MMM-YYYY')
          : '',
      },
    });
  } catch (error) {
    console.error('Error in getPenghapusanDetail:', error);
    next(error);
  }
};

/**
 * GET /detail-items
 * VBA: sb_Show_Grid_Detail
 * Lists detail items (instruments) for a given penghapusan.
 * Query params: no_penghapusan (required)
 */
const getPenghapusanDetailItems = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan } = req.query;

    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'no_penghapusan is required',
      });
    }

    const query = `
      SELECT
        seq_ID,
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Parameter_Kalibrasi,
        Assm_No_identitas_kalibrasi,
        Alasan_Penghapusan
      FROM T_Kalibrasi_Penghapusan_Detail
      WHERE no_penghapusan = :no_penghapusan
      ORDER BY seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in getPenghapusanDetailItems:', error);
    next(error);
  }
};

/**
 * GET /current-approve
 * VBA: fnCurrApprove
 * Returns the current (maximum) approver_no for a given penghapusan.
 * Query params: no_penghapusan (required)
 */
const getCurrentApprove = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan } = req.query;

    if (!no_penghapusan) {
      return res.status(200).json({
        success: true,
        data: { curr_approve: 0 },
      });
    }

    const query = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const currApprove = results[0]?.apprmax ?? 0;

    return res.status(200).json({
      success: true,
      data: { curr_approve: currApprove },
    });
  } catch (error) {
    console.error('Error in getCurrentApprove:', error);
    next(error);
  }
};

/**
 * GET /check-approve-button
 * VBA: sbCheck_Button_Approve
 * Checks whether the current user can approve and whether print is enabled.
 *
 * Logic:
 *  - sCurrAppr = fnCurrApprove + 1
 *  - Level 1: checks m_approver_lines with Appr_DeptID = record's bagian, Appr_ID = user_id, Appr_No = 1
 *  - Level 2: checks m_approver_lines with Appr_DeptID = user's bagian_user, Appr_ID = user_id, Appr_No = 2
 *  - can_approve: rowJum == 1
 *  - can_print: sCurrAppr >= 2 (i.e. at least 1 approval exists)
 *
 * Query params: no_penghapusan (required), bagian (record's bagian – required)
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan, bagian } = req.query;

    if (!no_penghapusan) {
      return res.status(200).json({
        success: true,
        data: {
          can_approve: false,
          can_print: false,
        },
      });
    }

    // Step 1: get current approve level (fnCurrApprove)
    const currApprQuery = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;
    const currApprResult = await sequelizeMSQL.query(currApprQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const currApprove = currApprResult[0]?.apprmax ?? 0;
    const sCurrAppr = currApprove + 1;

    let rowJum = 0;

    if (sCurrAppr === 1) {
      // Level 1: Appr_DeptID = record's bagian (txt_bagian.Text in VBA)
      const sql = `
        SELECT COUNT(*) AS rowJum
        FROM m_approver_lines
        WHERE isactive = 1
          AND Appr_ApplicationCode LIKE 'KAL_Penghapusan'
          AND Appr_DeptID = :bagian
          AND Appr_ID = :user_id
          AND Appr_No = :appr_no
      `;
      const result = await sequelizeMSQL.query(sql, {
        replacements: { bagian: bagian || '', user_id, appr_no: sCurrAppr },
        type: Sequelize.QueryTypes.SELECT,
      });
      rowJum = result[0]?.rowJum ?? 0;
    } else if (sCurrAppr === 2) {
      // Level 2: Appr_DeptID = user's department (gstrDepartment in VBA)
      const sql = `
        SELECT COUNT(*) AS rowJum
        FROM m_approver_lines
        WHERE isactive = 1
          AND Appr_ApplicationCode LIKE 'KAL_Penghapusan'
          AND Appr_DeptID = :bagian_user
          AND Appr_ID = :user_id
          AND Appr_No = :appr_no
      `;
      const result = await sequelizeMSQL.query(sql, {
        replacements: { bagian_user: bagian_user || '', user_id, appr_no: sCurrAppr },
        type: Sequelize.QueryTypes.SELECT,
      });
      rowJum = result[0]?.rowJum ?? 0;
    } else {
      rowJum = 0;
    }

    // VBA: can approve when rowJum == 1
    const canApprove = rowJum === 1;
    // VBA: can print when sCurrAppr >= 2 (i.e. at least level 1 approval exists)
    const canPrint = sCurrAppr >= 2;

    return res.status(200).json({
      success: true,
      data: {
        can_approve: canApprove,
        can_print: canPrint,
        curr_approve: currApprove,
        next_approve_level: sCurrAppr,
      },
    });
  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * GET /browse-da
 * VBA: cmd_browse_DA_Click
 * Searches available DA instruments (across all DA tables) that are NOT already
 * in a pending (unapproved level-1) penghapusan request.
 *
 * Query params:
 *   search  – keyword to filter by QA_ID, Assm_No_identitas_Istrumen, or Assm_No_identitas_kalibrasi
 *   bagian  – department filter (uses LIKE :bagian%, defaults to user's bagian_user)
 */
const browseDaInstruments = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search, bagian } = req.query;

    const deptFilter = bagian || bagian_user || '';
    const searchFilter = search ? `%${search}%` : '%%';

    const query = `
      SELECT A.*
      FROM (
        SELECT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Parameter_Kalibrasi, Assm_No_identitas_kalibrasi, Group_Da_Dept
        FROM T_Kalibrasi_DA_Thermohygro
        UNION ALL
        SELECT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Parameter_Kalibrasi, Assm_No_identitas_kalibrasi, Group_Da_Dept
        FROM T_Kalibrasi_DA_Anak_Timbangan
        UNION ALL
        SELECT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Parameter_Kalibrasi, Assm_No_identitas_kalibrasi, Group_Da_Dept
        FROM T_Kalibrasi_DA_Timbangan
        UNION ALL
        SELECT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Parameter_Kalibrasi, Assm_No_identitas_kalibrasi, Group_Da_Dept
        FROM T_Kalibrasi_DA_Bagian
      ) AS A
      LEFT JOIN (
        SELECT A.QA_ID
        FROM T_Kalibrasi_Penghapusan_Detail AS A
        LEFT JOIN (
          SELECT DISTINCT no_penghapusan
          FROM T_Kalibrasi_Penghapusan_status
          WHERE Approver_No = 1
        ) AS B ON A.no_penghapusan = B.no_penghapusan
        WHERE B.no_penghapusan IS NULL
      ) AS X ON X.QA_ID = A.QA_ID
      WHERE A.Group_Da_Dept LIKE :deptFilter
        AND X.QA_ID IS NULL
        AND (
          A.QA_ID LIKE :searchFilter
          OR A.Assm_No_identitas_Istrumen LIKE :searchFilter
          OR A.Assm_No_identitas_kalibrasi LIKE :searchFilter
        )
      ORDER BY A.QA_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        deptFilter: `${deptFilter}%`,
        searchFilter,
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in browseDaInstruments:', error);
    next(error);
  }
};

/**
 * GET /approver-identity
 * VBA: fnApprIdentity (with applicationCode = 'KAL_Penghapusan')
 * Returns the Appr_Identity for the given user and approver level.
 * Query params: appr_id (required), appr_no (required)
 */
const getApproverIdentityPenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { appr_id, appr_no } = req.query;

    if (!appr_id || !appr_no) {
      return res.status(400).json({
        success: false,
        message: 'appr_id and appr_no are required',
      });
    }

    const identity = await getApproverIdentity(appr_id, appr_no, 'KAL_Penghapusan');

    return res.status(200).json({
      success: true,
      data: { appr_identity: identity },
    });
  } catch (error) {
    console.error('Error in getApproverIdentityPenghapusan:', error);
    next(error);
  }
};

/**
 * POST /save
 * VBA: cmd_Save_Click (INSERT only – VBA exits on update, no UPDATE logic)
 * Creates a new penghapusan alat header record.
 * Auto-number is generated via dbo.fnGetKal_No_hapus(bagian_user).
 * Body: (no body params required; all values taken from req.user)
 */
const savePenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    // VBA: sAutoNum = fnGetNo_Penghapusan → dbo.fnGetKal_No_hapus(gstrDepartment)
    const sAutoNum = await getNoHapus(bagian_user);

    if (!sAutoNum) {
      return res.status(500).json({
        success: false,
        message: 'Gagal generate nomor penghapusan otomatis',
      });
    }

    // VBA: Insert into T_Kalibrasi_Penghapusan (no_penghapusan, tanggal, pemohon, bagian,
    //       UserID, Delegated_to, Process_Date)
    //       values(autoNum, getdate(), gstrUserName, gstrDepartment, gstrUserName, gstrDelegatedTo, getdate())
    const insertQuery = `
      INSERT INTO T_Kalibrasi_Penghapusan
        (no_penghapusan, tanggal, pemohon, bagian, UserID, Delegated_to, Process_Date)
      VALUES
        (:no_penghapusan, GETDATE(), :pemohon, :bagian, :user_id, :delegated_to, GETDATE())
    `;

    await sequelizeMSQL.query(insertQuery, {
      replacements: {
        no_penghapusan: sAutoNum,
        pemohon: user_id,
        bagian: bagian_user,
        user_id,
        delegated_to,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({
      success: true,
      message: 'Data has been saved',
      data: { no_penghapusan: sAutoNum },
    });
  } catch (error) {
    console.error('Error in savePenghapusan:', error);
    next(error);
  }
};

/**
 * POST /save-detail
 * VBA: cmd_SaveDetail_Click
 * INSERT new detail item when seq_id is empty; UPDATE existing when seq_id is provided.
 * Guard: rejects if fnCurrApprove >= 1.
 *
 * Body:
 *   no_penghapusan  (required)
 *   seq_id          (empty → INSERT, non-empty → UPDATE)
 *   qa_id           (required)
 *   assm_nama_instrumen
 *   assm_no_identitas_istrumen
 *   parameter_kalibrasi
 *   assm_no_identitas_kalibrasi
 *   alasan_penghapusan (required)
 */
const saveDetailPenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      no_penghapusan,
      seq_id,
      qa_id,
      assm_nama_instrumen,
      assm_no_identitas_istrumen,
      parameter_kalibrasi,
      assm_no_identitas_kalibrasi,
      alasan_penghapusan,
    } = req.body;

    // VBA validations
    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'Belum pilih nomor penghapusan!',
      });
    }
    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'Nama Instrumen Mesin Belum di pilih!',
      });
    }
    if (!alasan_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'Alasan Penghapusan Belum diisi!',
      });
    }

    // VBA: If fnCurrApprove >= 1 Then "Sudah approve, tidak bisa simpan data!"
    const currApprQuery = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;
    const currApprResult = await sequelizeMSQL.query(currApprQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const currApprove = currApprResult[0]?.apprmax ?? 0;

    if (currApprove >= 1) {
      return res.status(400).json({
        success: false,
        message: 'Sudah approve, tidak bisa simpan data!',
      });
    }

    const isNew = !seq_id || seq_id === '';

    if (isNew) {
      // VBA: cmd_add_Click guard -> If grid_detail.ListItems.Count >= 7 Then MsgBox "Maximum 7 row"
      const maxRowQuery = `
        SELECT COUNT(*) AS jumlah
        FROM T_Kalibrasi_Penghapusan_Detail
        WHERE no_penghapusan = :no_penghapusan
      `;
      const maxRowResult = await sequelizeMSQL.query(maxRowQuery, {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.SELECT,
      });
      const currentRowCount = maxRowResult[0]?.jumlah ?? 0;

      if (currentRowCount >= 7) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 7 row',
        });
      }

      // VBA: Set rs = GetRecordset("select dbo.fnGet_SeqID_No_hapus(no_penghapusan) as no_SeqID")
      const seqID = await getSeqIDNoHapus(no_penghapusan);

      // VBA INSERT: exact column list from cmd_SaveDetail_Click INSERT branch
      const insertQuery = `
        INSERT INTO T_Kalibrasi_Penghapusan_Detail
          (no_penghapusan, seq_ID, QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
           Parameter_Kalibrasi, Assm_No_identitas_kalibrasi, Alasan_Penghapusan,
           UserID, Delegated_to, Process_Date)
        SELECT
          :no_penghapusan AS no_penghapusan,
          :seq_id         AS seq_ID,
          :qa_id          AS QA_ID,
          :assm_nama_instrumen           AS Assm_nama_instrumen,
          :assm_no_identitas_istrumen    AS Assm_No_identitas_Istrumen,
          :parameter_kalibrasi           AS Parameter_Kalibrasi,
          :assm_no_identitas_kalibrasi   AS Assm_No_identitas_kalibrasi,
          :alasan_penghapusan            AS Alasan_Penghapusan,
          :user_id        AS UserID,
          :delegated_to   AS Delegated_to,
          GETDATE()       AS Process_Date
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          no_penghapusan,
          seq_id: seqID,
          qa_id,
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          alasan_penghapusan,
          user_id,
          delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(201).json({
        success: true,
        message: 'Data has been saved',
        data: { no_penghapusan, seq_id: seqID },
      });
    } else {
      // VBA UPDATE: UserID='' , Delegated_to='' exactly as VBA
      const updateQuery = `
        UPDATE T_Kalibrasi_Penghapusan_Detail
        SET
          QA_ID                       = :qa_id,
          Assm_nama_instrumen         = :assm_nama_instrumen,
          Assm_No_identitas_Istrumen  = :assm_no_identitas_istrumen,
          Parameter_Kalibrasi         = :parameter_kalibrasi,
          Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
          Alasan_Penghapusan          = :alasan_penghapusan,
          UserID                      = '',
          Delegated_to                = '',
          Process_Date                = GETDATE()
        WHERE no_penghapusan = :no_penghapusan
          AND seq_ID = :seq_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          qa_id,
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          alasan_penghapusan,
          no_penghapusan,
          seq_id,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated',
        data: { no_penghapusan, seq_id },
      });
    }
  } catch (error) {
    console.error('Error in saveDetailPenghapusan:', error);
    next(error);
  }
};

/**
 * DELETE /delete
 * VBA: cmd_Del_Click
 * Deletes the entire penghapusan header + all its detail items.
 * Guard: rejects if fnCurrApprove >= 1.
 * Body: no_penghapusan (required)
 */
const deletePenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan } = req.body;

    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'Belum pilih Nomor Permohonan penghapusan',
      });
    }

    // VBA: If fnCurrApprove >= 1 Then "Sudah approve, tidak bisa hapus data!"
    const currApprQuery = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;
    const currApprResult = await sequelizeMSQL.query(currApprQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const currApprove = currApprResult[0]?.apprmax ?? 0;

    if (currApprove >= 1) {
      return res.status(400).json({
        success: false,
        message: 'Sudah approve, tidak bisa hapus data!',
      });
    }

    // VBA: delete T_Kalibrasi_Penghapusan where no_penghapusan = ?
    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Penghapusan WHERE no_penghapusan = :no_penghapusan`,
      {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    // VBA: delete T_Kalibrasi_Penghapusan_Detail where no_penghapusan = ?
    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Penghapusan_Detail WHERE no_penghapusan = :no_penghapusan`,
      {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: { no_penghapusan },
    });
  } catch (error) {
    console.error('Error in deletePenghapusan:', error);
    next(error);
  }
};

/**
 * DELETE /delete-detail
 * VBA: cmd_del_detail_Click
 * Deletes a single detail item from a penghapusan.
 * Guard: rejects if fnCurrApprove >= 1.
 * Body: no_penghapusan (required), seq_id (required)
 */
const deleteDetailPenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan, seq_id } = req.body;

    if (!no_penghapusan || !seq_id) {
      return res.status(400).json({
        success: false,
        message: 'no_penghapusan dan seq_id wajib diisi',
      });
    }

    // VBA: If fnCurrApprove >= 1 Then "Sudah approve, tidak bisa delete data!"
    const currApprQuery = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;
    const currApprResult = await sequelizeMSQL.query(currApprQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const currApprove = currApprResult[0]?.apprmax ?? 0;

    if (currApprove >= 1) {
      return res.status(400).json({
        success: false,
        message: 'Sudah approve, tidak bisa delete data!',
      });
    }

    // VBA: delete T_Kalibrasi_Penghapusan_Detail where no_penghapusan = ? and seq_ID = ?
    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Penghapusan_Detail WHERE no_penghapusan = :no_penghapusan AND seq_ID = :seq_id`,
      {
        replacements: { no_penghapusan, seq_id },
        type: Sequelize.QueryTypes.DELETE,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: { no_penghapusan, seq_id },
    });
  } catch (error) {
    console.error('Error in deleteDetailPenghapusan:', error);
    next(error);
  }
};

/**
 * POST /approve
 * VBA: cmd_Approve_Click
 * Approves a penghapusan at the next level.
 * At level 2 (final approval) also physically deletes all DA records for each QA_ID
 * listed in the detail.
 *
 * Logic:
 *  1. sCurrAppr = fnCurrApprove + 1
 *  2. vAppr_Indent = fnApprIdentity(user_id, sCurrAppr) with code 'KAL_Penghapusan'
 *  3. INSERT into T_Kalibrasi_Penghapusan_status
 *  4. If sCurrAppr == 2: for each QA_ID in detail,
 *       DELETE from T_Kalibrasi_DA_Thermohygro, T_Kalibrasi_DA_Anak_Timbangan,
 *                   T_Kalibrasi_DA_Timbangan, T_Kalibrasi_DA_Bagian
 *       and their _status counterparts
 *
 * Body: no_penghapusan (required)
 */
const approvePenghapusan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_penghapusan } = req.body;

    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'Belum pilih Nomor Permohonan penghapusan',
      });
    }

    // VBA: If grid_detail.ListItems.Count = 0 → cannot approve
    const detailCountQuery = `
      SELECT COUNT(*) AS jumlah
      FROM T_Kalibrasi_Penghapusan_Detail
      WHERE no_penghapusan = :no_penghapusan
    `;
    const detailCountResult = await sequelizeMSQL.query(detailCountQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const detailCount = detailCountResult[0]?.jumlah ?? 0;

    if (detailCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa approve, karena tidak ada list penghapusan alat!',
      });
    }

    const headerQuery = `
      SELECT no_penghapusan, bagian
      FROM T_Kalibrasi_Penghapusan
      WHERE no_penghapusan = :no_penghapusan
    `;
    const headerResult = await sequelizeMSQL.query(headerQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (headerResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data penghapusan tidak ditemukan',
      });
    }

    // VBA: sCurrAppr = fnCurrApprove + 1
    const currApprQuery = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Penghapusan_status
      WHERE no_penghapusan = :no_penghapusan
    `;
    const currApprResult = await sequelizeMSQL.query(currApprQuery, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    const currApprove = currApprResult[0]?.apprmax ?? 0;
    const sCurrAppr = currApprove + 1;

    // UI in VBA blocks further approval when level > 2; enforce same on API.
    if (sCurrAppr > 2) {
      return res.status(400).json({
        success: false,
        message: 'Data sudah final approve',
      });
    }

    // VBA parity from sbCheck_Button_Approve:
    // level 1 checks header bagian, level 2 checks current user department.
    let rowJum = 0;
    if (sCurrAppr === 1) {
      const canApproveQuery = `
        SELECT COUNT(*) AS rowJum
        FROM m_approver_lines
        WHERE isactive = 1
          AND Appr_ApplicationCode LIKE 'KAL_Penghapusan'
          AND Appr_DeptID = :bagian
          AND Appr_ID = :user_id
          AND Appr_No = :appr_no
      `;
      const canApproveResult = await sequelizeMSQL.query(canApproveQuery, {
        replacements: {
          bagian: headerResult[0].bagian || '',
          user_id,
          appr_no: sCurrAppr,
        },
        type: Sequelize.QueryTypes.SELECT,
      });
      rowJum = canApproveResult[0]?.rowJum ?? 0;
    } else if (sCurrAppr === 2) {
      const canApproveQuery = `
        SELECT COUNT(*) AS rowJum
        FROM m_approver_lines
        WHERE isactive = 1
          AND Appr_ApplicationCode LIKE 'KAL_Penghapusan'
          AND Appr_DeptID = :bagian_user
          AND Appr_ID = :user_id
          AND Appr_No = :appr_no
      `;
      const canApproveResult = await sequelizeMSQL.query(canApproveQuery, {
        replacements: {
          bagian_user: bagian_user || '',
          user_id,
          appr_no: sCurrAppr,
        },
        type: Sequelize.QueryTypes.SELECT,
      });
      rowJum = canApproveResult[0]?.rowJum ?? 0;
    }

    if (rowJum !== 1) {
      return res.status(403).json({
        success: false,
        message: 'User tidak memiliki hak approve untuk level ini',
      });
    }

    // VBA: vAppr_Indent = fnApprIdentity(gstrUserName, sCurrAppr)
    //      select Appr_Identity from m_approver_lines
    //      where isactive=1 and Appr_ApplicationCode LIKE 'KAL_Penghapusan'
    //      and Appr_ID = user_id and Appr_No = sCurrAppr
    const apprIdentQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Penghapusan'
        AND Appr_ID = :user_id
        AND Appr_No = :appr_no
    `;
    const apprIdentResult = await sequelizeMSQL.query(apprIdentQuery, {
      replacements: { user_id, appr_no: sCurrAppr },
      type: Sequelize.QueryTypes.SELECT,
    });
    const vApprIdent = apprIdentResult.length > 0 ? apprIdentResult[0].Appr_Identity : '0';

    // VBA INSERT into T_Kalibrasi_Penghapusan_status
    const insertApprovalQuery = `
      INSERT INTO T_Kalibrasi_Penghapusan_status
        (no_penghapusan, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:no_penghapusan, :appr_no, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `;
    await sequelizeMSQL.query(insertApprovalQuery, {
      replacements: {
        no_penghapusan,
        appr_no: sCurrAppr,
        appr_identity: vApprIdent,
        user_id,
        delegated_to,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    // VBA: If sCurrAppr = 2 → physically delete all DA records for each QA_ID in detail
    if (sCurrAppr === 2) {
      const detailQAQuery = `
        SELECT QA_ID
        FROM T_Kalibrasi_Penghapusan_Detail
        WHERE no_penghapusan = :no_penghapusan
      `;
      const detailRows = await sequelizeMSQL.query(detailQAQuery, {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.SELECT,
      });

      for (const row of detailRows) {
        const qaId = row.QA_ID;

        // VBA: Delete From T_Kalibrasi_DA_Thermohygro where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Thermohygro WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Anak_Timbangan where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Anak_Timbangan WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Timbangan where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Timbangan WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Bagian where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Bagian WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Thermohygro_status where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Thermohygro_status WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Anak_Timbangan_status where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Anak_Timbangan_status WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Timbangan_status where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Timbangan_status WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
        // VBA: Delete From T_Kalibrasi_DA_Bagian_status where QA_ID = ?
        await sequelizeMSQL.query(
          `DELETE FROM T_Kalibrasi_DA_Bagian_status WHERE QA_ID = :qa_id`,
          { replacements: { qa_id: qaId }, type: Sequelize.QueryTypes.DELETE }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Data has been approved',
      data: {
        no_penghapusan,
        approver_no: sCurrAppr,
        approver_identity: vApprIdent,
      },
    });
  } catch (error) {
    console.error('Error in approvePenghapusan:', error);
    next(error);
  }
};

/**
 * GET /print-data
 * VBA: generate_Print
 * Returns the same header/signature + detail datasets used by VBA print logic.
 * Query params: no_penghapusan (required)
 */
const getPenghapusanPrintData = async (req, res, next) => {
  try {
    const { no_penghapusan } = req.query;

    if (!no_penghapusan) {
      return res.status(400).json({
        success: false,
        message: 'no_penghapusan is required',
      });
    }

    // VBA: select * from vw_Kal_ListAppr_Hapus where no_penghapusan = '...'
    const headerQuery = `
      SELECT *
      FROM vw_Kal_ListAppr_Hapus
      WHERE no_penghapusan = :no_penghapusan
    `;

    // VBA: SELECT Assm_nama_instrumen, Assm_No_identitas_Istrumen, Parameter_Kalibrasi,
    //      Assm_No_identitas_kalibrasi, Alasan_Penghapusan
    //      FROM T_Kalibrasi_Penghapusan_Detail where no_penghapusan = '...' order by seq_ID
    const detailQuery = `
      SELECT
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Parameter_Kalibrasi,
        Assm_No_identitas_kalibrasi,
        Alasan_Penghapusan
      FROM T_Kalibrasi_Penghapusan_Detail
      WHERE no_penghapusan = :no_penghapusan
      ORDER BY seq_ID
    `;

    const [headerRows, detailRows] = await Promise.all([
      sequelizeMSQL.query(headerQuery, {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.SELECT,
      }),
      sequelizeMSQL.query(detailQuery, {
        replacements: { no_penghapusan },
        type: Sequelize.QueryTypes.SELECT,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        header: headerRows[0] || null,
        details: detailRows,
      },
    });
  } catch (error) {
    console.error('Error in getPenghapusanPrintData:', error);
    next(error);
  }
};

module.exports = {
  getPenghapusanList,
  getPenghapusanDetail,
  getPenghapusanDetailItems,
  getCurrentApprove,
  checkApproveButton,
  browseDaInstruments,
  getApproverIdentityPenghapusan,
  savePenghapusan,
  saveDetailPenghapusan,
  deletePenghapusan,
  deleteDetailPenghapusan,
  approvePenghapusan,
  getPenghapusanPrintData,
};
