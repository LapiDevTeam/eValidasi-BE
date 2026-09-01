'use strict';
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

// Config map: tipe → table names + approver code
const TIPE_CONFIG = {
  bagian: {
    mainTable: 'T_Kalibrasi_Sertifikat_Bagian',
    statusTable: 'T_Kalibrasi_Sertifikat_Bagian_Status',
    applicationCode: 'KAL_Sert_Bagian',
    daTable: 'T_Kalibrasi_DA_Bagian',
    intervalCols: ['Parameter_Interval'],
  },
  thermohygro: {
    mainTable: 'T_Kalibrasi_Sertifikat_Thermohygro',
    statusTable: 'T_Kalibrasi_Sertifikat_Thermohygro_Status',
    applicationCode: 'KAL_Sert_Thermo',
    daTable: 'T_Kalibrasi_DA_Thermohygro',
    intervalCols: ['Parameter_Interval'],
  },
  timbangan: {
    mainTable: 'T_Kalibrasi_Sertifikat_Timbangan',
    statusTable: 'T_Kalibrasi_Sertifikat_Timbangan_Status',
    applicationCode: 'KAL_Sert_Timbangan',
    daTable: 'T_Kalibrasi_DA_Timbangan',
    intervalCols: ['Interval', 'Parameter_Interval'],
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

/**
 * Mirror alasan OOC ke kolom Catatan tabel DA (keyed by QA_ID).
 * Mengikuti pola mirror Catatan sertifikat normal di
 * calibrationManagerFinalization.service (ensureDaThermoGenerated).
 * Jika catatan = null → kembalikan Catatan DA ke Catatan sertifikat
 * (dipakai saat MGR reject / reset flow tidak-dapat).
 * No-op jika row DA belum ada.
 */
const mirrorDaCatatan = async (cfg, qa_id, id_no_sertifikat, catatan) => {
  if (catatan === null || catatan === undefined) {
    await sequelizeMSQL.query(`
      UPDATE DA
      SET Catatan = S.Catatan
      FROM ${cfg.daTable} AS DA
      INNER JOIN ${cfg.mainTable} AS S
        ON S.QA_ID = DA.QA_ID
      WHERE DA.QA_ID = :qa_id
        AND S.ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.UPDATE,
    });
    return;
  }

  await sequelizeMSQL.query(`
    UPDATE ${cfg.daTable}
    SET Catatan = :catatan
    WHERE QA_ID = :qa_id
  `, {
    replacements: { qa_id, catatan },
    type: Sequelize.QueryTypes.UPDATE,
  });
};

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
    if (!cfg) {
      const err = new Error('tipe tidak valid');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id dan id_no_sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const mainResult = await sequelizeMSQL.query(`
      SELECT
        is_tidak_dapat,
        alasan_tidak_dapat,
        kondisi_alat,
        CONVERT(nvarchar, tgl_label_tempel, 120) AS tgl_label_tempel,
        label_tempel_by,
        CONVERT(nvarchar, tanggal_label_OOC, 120) AS tanggal_label_OOC
      FROM ${cfg.mainTable}
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (mainResult.length === 0) {
      const err = new Error('Data sertifikat tidak ditemukan');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
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
    if (!cfg) {
      const err = new Error('tipe tidak valid');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id dan id_no_sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!alasan_tidak_dapat) {
      const err = new Error('Alasan tidak dapat dikalibrasi wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Tidak dapat diubah — sudah direview oleh SPV/OFC');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      UPDATE ${cfg.mainTable}
      SET
        is_tidak_dapat     = 1,
        alasan_tidak_dapat = :alasan_tidak_dapat,
        kondisi_alat       = :kondisi_alat,
        tanggal_label_OOC  = GETDATE()
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat, alasan_tidak_dapat, kondisi_alat: kondisi_alat || null },
      type: Sequelize.QueryTypes.UPDATE,
    });

    // Mirror alasan OOC ke kolom Keterangan (Catatan) di DA master
    await mirrorDaCatatan(cfg, qa_id, id_no_sertifikat, alasan_tidak_dapat);

    // Unit tidak siap → interval DA menjadi 0 (alat tidak dijadwalkan ulang)
    const setIntervalNol = cfg.intervalCols.map((c) => `${c} = 0`).join(', ');
    await sequelizeMSQL.query(`
      UPDATE ${cfg.daTable}
      SET ${setIntervalNol}
      WHERE QA_ID = :qa_id
    `, {
      replacements: { qa_id },
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
    if (!cfg) {
      const err = new Error('tipe tidak valid');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id dan id_no_sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!['approve', 'reject'].includes(action)) {
      const err = new Error('action harus approve atau reject');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Anda tidak memiliki hak untuk mereview tidak dapat ini');
      err.statusCode = 403;
      res.status(403).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Data sertifikat tidak ditemukan');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!mainCheck[0].is_tidak_dapat) {
      const err = new Error('Status tidak dapat dikalibrasi belum diisi oleh FA');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
        const err = new Error('Sudah direview oleh SPV/OFC');
        err.statusCode = 400;
        res.status(400).json({ success: false, message: err.message });
        next(err);
        return;
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
        const err = new Error('Belum ada review SPV yang bisa di-reject');
        err.statusCode = 400;
        res.status(400).json({ success: false, message: err.message });
        next(err);
        return;
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
    if (!cfg) {
      const err = new Error('tipe tidak valid');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id dan id_no_sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!['approve', 'reject'].includes(action)) {
      const err = new Error('action harus approve atau reject');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Anda tidak memiliki hak untuk menyetujui tidak dapat ini');
      err.statusCode = 403;
      res.status(403).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Belum direview oleh SPV/OFC');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
        const err = new Error('Sudah disetujui oleh MGR');
        err.statusCode = 400;
        res.status(400).json({ success: false, message: err.message });
        next(err);
        return;
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
        SET is_tidak_dapat = 0, alasan_tidak_dapat = NULL, kondisi_alat = NULL, tanggal_label_OOC = NULL
        WHERE QA_ID = :qa_id AND ID_No_Sertifikat = :id_no_sertifikat
      `, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.UPDATE,
      });
      // Kembalikan Catatan DA ke Catatan sertifikat (hapus alasan OOC yang di-mirror)
      await mirrorDaCatatan(cfg, qa_id, id_no_sertifikat, null);
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
    if (!cfg) {
      const err = new Error('tipe tidak valid');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }
    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id dan id_no_sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Belum disetujui oleh MGR');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
      const err = new Error('Label sudah pernah dikonfirmasi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
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
