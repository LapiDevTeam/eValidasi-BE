'use strict';
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

// Config map: tipe → table names + approver code
const TIPE_CONFIG = {
  bagian: {
    mainTable: 'T_Kalibrasi_Sertifikat_Bagian',
    statusTable: 'T_Kalibrasi_Sertifikat_Bagian_Status',
    applicationCode: 'KAL_Sert_Bagian',
  },
  thermohygro: {
    mainTable: 'T_Kalibrasi_Sertifikat_Thermohygro',
    statusTable: 'T_Kalibrasi_Sertifikat_Thermohygro_Status',
    applicationCode: 'KAL_Sert_Thermo',
  },
  timbangan: {
    mainTable: 'T_Kalibrasi_Sertifikat_Timbangan',
    statusTable: 'T_Kalibrasi_Sertifikat_Timbangan_Status',
    applicationCode: 'KAL_Sert_Timbangan',
  },
};

// Approver_No constants untuk tidak-dapat flow di _Status table
const APPR_NO_SPV = 10;
const APPR_NO_MGR = 11;

function getConfig(tipe) {
  const cfg = TIPE_CONFIG[tipe];
  if (!cfg) return null;
  return cfg;
}

// ============================================================
// GET STATUS
// ============================================================

/**
 * GET /tidak-dapat/status?tipe=bagian&qa_id=X&id_no_sertifikat=Y
 * Returns current tidak-dapat status + approval state
 */
const getTidakDapatStatus = async (req, res, next) => {
  try {
    const { tipe, qa_id, id_no_sertifikat } = req.query;

    const cfg = getConfig(tipe);
    if (!cfg) return res.status(400).json({ success: false, message: 'tipe tidak valid' });
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({ success: false, message: 'qa_id dan id_no_sertifikat wajib diisi' });
    }

    const mainResult = await sequelizeMSQL.query(`
      SELECT
        is_tidak_dapat,
        alasan_tidak_dapat,
        kondisi_alat,
        CONVERT(nvarchar, tgl_label_tempel, 120) AS tgl_label_tempel,
        label_tempel_by
      FROM ${cfg.mainTable}
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (mainResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sertifikat tidak ditemukan' });
    }

    // Cek approval SPV (Approver_No = 10) dan MGR (Approver_No = 11)
    const statusResult = await sequelizeMSQL.query(`
      SELECT
        Approver_No,
        isReject,
        User_ID,
        CONVERT(nvarchar, Process_Date, 120) AS Process_Date
      FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No IN (${APPR_NO_SPV}, ${APPR_NO_MGR})
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const spvRecord = statusResult.find(r => r.Approver_No === APPR_NO_SPV);
    const mgrRecord = statusResult.find(r => r.Approver_No === APPR_NO_MGR);

    return res.status(200).json({
      success: true,
      data: {
        ...mainResult[0],
        spv_approved: !!spvRecord && !spvRecord.isReject,
        spv_user_id: spvRecord?.User_ID || null,
        spv_date: spvRecord?.Process_Date || null,
        mgr_approved: !!mgrRecord && !mgrRecord.isReject,
        mgr_user_id: mgrRecord?.User_ID || null,
        mgr_date: mgrRecord?.Process_Date || null,
      },
    });
  } catch (error) {
    console.error('Error in getTidakDapatStatus:', error);
    next(error);
  }
};

// ============================================================
// SAVE TIDAK DAPAT (FA input)
// ============================================================

/**
 * POST /tidak-dapat/save
 * Body: { tipe, qa_id, id_no_sertifikat, alasan_tidak_dapat, kondisi_alat }
 * Guard: SPV belum approve (Approver_No=10 belum ada)
 */
const saveTidakDapat = async (req, res, next) => {
  try {
    const { tipe, qa_id, id_no_sertifikat, alasan_tidak_dapat, kondisi_alat } = req.body;

    const cfg = getConfig(tipe);
    if (!cfg) return res.status(400).json({ success: false, message: 'tipe tidak valid' });
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({ success: false, message: 'qa_id dan id_no_sertifikat wajib diisi' });
    }
    if (!alasan_tidak_dapat) {
      return res.status(400).json({ success: false, message: 'Alasan tidak dapat dikalibrasi wajib diisi' });
    }

    // Guard: SPV belum approve — tidak boleh revisi jika sudah lewat step SPV
    const spvCheck = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS cnt
      FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = ${APPR_NO_SPV}
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((spvCheck[0]?.cnt || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat diubah — sudah direview oleh SPV/OFC',
      });
    }

    await sequelizeMSQL.query(`
      UPDATE ${cfg.mainTable}
      SET
        is_tidak_dapat     = 1,
        alasan_tidak_dapat = :alasan_tidak_dapat,
        kondisi_alat       = :kondisi_alat
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat, alasan_tidak_dapat, kondisi_alat: kondisi_alat || null },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Data tidak dapat dikalibrasi berhasil disimpan' });
  } catch (error) {
    console.error('Error in saveTidakDapat:', error);
    next(error);
  }
};

// ============================================================
// APPROVE SPV (step 1)
// ============================================================

/**
 * POST /tidak-dapat/approve-spv
 * Body: { tipe, qa_id, id_no_sertifikat, action: 'approve'|'reject' }
 * - approve: INSERT Approver_No=10, isReject=0
 * - reject:  DELETE Approver_No=10 → FA bisa revisi ulang is_tidak_dapat=0
 */
const approveTidakDapatSPV = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { tipe, qa_id, id_no_sertifikat, action } = req.body;

    const cfg = getConfig(tipe);
    if (!cfg) return res.status(400).json({ success: false, message: 'tipe tidak valid' });
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({ success: false, message: 'qa_id dan id_no_sertifikat wajib diisi' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action harus approve atau reject' });
    }

    // Guard: user harus ada di m_approver_lines untuk tipe ini
    const approverCheck = await sequelizeMSQL.query(`
      SELECT Appr_Identity FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = :appCode
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `, {
      replacements: { appCode: cfg.applicationCode, user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approverCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk mereview tidak dapat ini' });
    }

    // Guard: is_tidak_dapat harus = 1
    const mainCheck = await sequelizeMSQL.query(`
      SELECT is_tidak_dapat FROM ${cfg.mainTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (mainCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Data sertifikat tidak ditemukan' });
    }
    if (!mainCheck[0].is_tidak_dapat) {
      return res.status(400).json({ success: false, message: 'Status tidak dapat dikalibrasi belum diisi oleh FA' });
    }

    // Cek apakah SPV sudah approve
    const spvCheck = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS cnt FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = ${APPR_NO_SPV}
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const alreadyApproved = (spvCheck[0]?.cnt || 0) > 0;

    if (action === 'approve') {
      if (alreadyApproved) {
        return res.status(400).json({ success: false, message: 'Sudah direview oleh SPV/OFC' });
      }
      const apprIdentity = approverCheck[0].Appr_Identity || 0;
      await sequelizeMSQL.query(`
        INSERT INTO ${cfg.statusTable}
          (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
        VALUES
          (:qa_id, :id_no_sertifikat, ${APPR_NO_SPV}, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
      `, {
        replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
        type: Sequelize.QueryTypes.INSERT,
      });
      return res.status(200).json({ success: true, message: 'Review SPV/OFC berhasil' });
    } else {
      // reject: hapus SPV approval record → FA bisa revisi & set is_tidak_dapat=0 lagi atau ubah alasan
      if (!alreadyApproved) {
        return res.status(400).json({ success: false, message: 'Belum ada review SPV yang bisa di-reject' });
      }
      await sequelizeMSQL.query(`
        DELETE FROM ${cfg.statusTable}
        WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
          AND Approver_No = ${APPR_NO_SPV}
      `, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.DELETE,
      });
      return res.status(200).json({ success: true, message: 'Review SPV/OFC dibatalkan — FA dapat merevisi data' });
    }
  } catch (error) {
    console.error('Error in approveTidakDapatSPV:', error);
    next(error);
  }
};

// ============================================================
// APPROVE MGR (step 2 — final)
// ============================================================

/**
 * POST /tidak-dapat/approve-mgr
 * Body: { tipe, qa_id, id_no_sertifikat, action: 'approve'|'reject' }
 * - approve: INSERT Approver_No=11, isReject=0
 * - reject:  DELETE Approver_No=10 + Approver_No=11 → alur kembali ke FA
 */
const approveTidakDapatMGR = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { tipe, qa_id, id_no_sertifikat, action } = req.body;

    const cfg = getConfig(tipe);
    if (!cfg) return res.status(400).json({ success: false, message: 'tipe tidak valid' });
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({ success: false, message: 'qa_id dan id_no_sertifikat wajib diisi' });
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action harus approve atau reject' });
    }

    // Guard: user harus ada di m_approver_lines untuk tipe ini
    const approverCheck = await sequelizeMSQL.query(`
      SELECT Appr_Identity FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = :appCode
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `, {
      replacements: { appCode: cfg.applicationCode, user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approverCheck.length === 0) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menyetujui tidak dapat ini' });
    }

    // Guard: SPV harus sudah approve (Approver_No=10 harus ada)
    const spvCheck = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS cnt FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = ${APPR_NO_SPV}
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((spvCheck[0]?.cnt || 0) === 0) {
      return res.status(400).json({ success: false, message: 'Belum direview oleh SPV/OFC' });
    }

    // Cek apakah MGR sudah approve
    const mgrCheck = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS cnt FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = ${APPR_NO_MGR}
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const alreadyApproved = (mgrCheck[0]?.cnt || 0) > 0;

    if (action === 'approve') {
      if (alreadyApproved) {
        return res.status(400).json({ success: false, message: 'Sudah disetujui oleh MGR' });
      }
      const apprIdentity = approverCheck[0].Appr_Identity || 0;
      await sequelizeMSQL.query(`
        INSERT INTO ${cfg.statusTable}
          (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
        VALUES
          (:qa_id, :id_no_sertifikat, ${APPR_NO_MGR}, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
      `, {
        replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
        type: Sequelize.QueryTypes.INSERT,
      });
      return res.status(200).json({ success: true, message: 'Approval MGR berhasil — siap konfirmasi label' });
    } else {
      // reject: hapus SPV + MGR → alur kembali ke FA
      await sequelizeMSQL.query(`
        DELETE FROM ${cfg.statusTable}
        WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
          AND Approver_No IN (${APPR_NO_SPV}, ${APPR_NO_MGR})
      `, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.DELETE,
      });
      // Reset is_tidak_dapat agar FA bisa revisi dari awal
      await sequelizeMSQL.query(`
        UPDATE ${cfg.mainTable}
        SET is_tidak_dapat = 0, alasan_tidak_dapat = NULL, kondisi_alat = NULL
        WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
      `, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.UPDATE,
      });
      return res.status(200).json({ success: true, message: 'Ditolak oleh MGR — FA dapat merevisi data dari awal' });
    }
  } catch (error) {
    console.error('Error in approveTidakDapatMGR:', error);
    next(error);
  }
};

// ============================================================
// KONFIRMASI LABEL TEMPEL
// ============================================================

/**
 * POST /tidak-dapat/konfirmasi-label
 * Body: { tipe, qa_id, id_no_sertifikat }
 * Guard: MGR harus sudah approve (Approver_No=11)
 * Action: UPDATE tgl_label_tempel + label_tempel_by
 */
const konfirmasiLabelTidakDapat = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { tipe, qa_id, id_no_sertifikat } = req.body;

    const cfg = getConfig(tipe);
    if (!cfg) return res.status(400).json({ success: false, message: 'tipe tidak valid' });
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({ success: false, message: 'qa_id dan id_no_sertifikat wajib diisi' });
    }

    // Guard: MGR harus sudah approve
    const mgrCheck = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS cnt FROM ${cfg.statusTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = ${APPR_NO_MGR}
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((mgrCheck[0]?.cnt || 0) === 0) {
      return res.status(400).json({ success: false, message: 'Belum disetujui oleh MGR' });
    }

    // Guard: jangan overwrite jika sudah ada tgl_label_tempel
    const labelCheck = await sequelizeMSQL.query(`
      SELECT tgl_label_tempel FROM ${cfg.mainTable}
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (labelCheck[0]?.tgl_label_tempel) {
      return res.status(400).json({ success: false, message: 'Label sudah pernah dikonfirmasi' });
    }

    await sequelizeMSQL.query(`
      UPDATE ${cfg.mainTable}
      SET
        tgl_label_tempel = SYSDATETIME(),
        label_tempel_by  = :user_id
      WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat, user_id },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Konfirmasi label tidak dapat digunakan berhasil' });
  } catch (error) {
    console.error('Error in konfirmasiLabelTidakDapat:', error);
    next(error);
  }
};

module.exports = {
  getTidakDapatStatus,
  saveTidakDapat,
  approveTidakDapatSPV,
  approveTidakDapatMGR,
  konfirmasiLabelTidakDapat,
};
