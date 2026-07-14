'use strict';

const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { Sequelize } = require('../models');

const CERTIFICATE_CONFIG = {
  bagian: {
    certificateTable: 'T_Kalibrasi_Sertifikat_Bagian',
    certificateStatusTable: 'T_Kalibrasi_Sertifikat_Bagian_Status',
    certificateApproverCode: 'KAL_Sert_Bagian',
    daTable: 'T_Kalibrasi_DA_Bagian',
    daStatusTable: 'T_Kalibrasi_DA_Bagian_status',
    daApproverCode: 'KAL_DA_Bagian',
  },
  thermo: {
    certificateTable: 'T_Kalibrasi_Sertifikat_Thermohygro',
    certificateStatusTable: 'T_Kalibrasi_Sertifikat_Thermohygro_Status',
    certificateApproverCode: 'KAL_Sert_Thermo',
    daTable: 'T_Kalibrasi_DA_Thermohygro',
    daStatusTable: 'T_Kalibrasi_DA_Thermohygro_status',
    daApproverCode: 'KAL_DA_Thermo',
  },
};

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getCount(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined) return Number(row[key]) || 0;
  }
  return 0;
}

async function getApproverIdentity({
  applicationCode,
  apprNo,
  userId,
  transaction,
}) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :applicationCode
        AND Appr_ID = :userId
        AND Appr_No = :apprNo
    `,
    {
      replacements: { applicationCode, apprNo, userId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows.length > 0 ? rows[0].Appr_Identity : 0;
}

async function countRows(sql, replacements, transaction) {
  const rows = await sequelizeMSQL.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  return getCount(rows[0], 'jumRow', 'JumRow', 'count', 'COUNT');
}

async function ensureCertificateApproved({
  config,
  qaId,
  idNoSertifikat,
  userId,
  delegatedTo,
  transaction,
}) {
  const headerRows = await sequelizeMSQL.query(
    `
      SELECT Tgl_kalibrasi, Interval
      FROM ${config.certificateTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  if (headerRows.length === 0 || !headerRows[0].Tgl_kalibrasi) {
    throw createError('Belum simpan tanggal kalibrasi, save tanggal');
  }

  if (!headerRows[0].Interval) {
    throw createError('Harap isi interval');
  }

  const approvedCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.certificateStatusTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `,
    { qaId, idNoSertifikat },
    transaction
  );

  if (approvedCount > 0) return;

  const approverIdentity = await getApproverIdentity({
    applicationCode: config.certificateApproverCode,
    apprNo: 1,
    userId,
    transaction,
  });

  await sequelizeMSQL.query(
    `
      INSERT INTO ${config.certificateStatusTable}
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity,
         Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, :idNoSertifikat, 1, 0, :approverIdentity,
         GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        approverIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );
}

async function ensureDaBagianGenerated({
  config,
  qaId,
  idNoSertifikat,
  userId,
  delegatedTo,
  transaction,
}) {
  const daGeneratedCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.certificateStatusTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 2
    `,
    { qaId, idNoSertifikat },
    transaction
  );

  if (daGeneratedCount > 0) return;

  const intervalRows = await sequelizeMSQL.query(
    `
      SELECT Interval
      FROM ${config.certificateTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  if (!intervalRows[0]?.Interval || intervalRows[0].Interval == 0) {
    throw createError('Interval tidak boleh nol');
  }

  const daCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.daTable}
      WHERE QA_ID LIKE :qaId
    `,
    { qaId },
    transaction
  );

  const approverIdentity = await getApproverIdentity({
    applicationCode: config.certificateApproverCode,
    apprNo: 2,
    userId,
    transaction,
  });

  if (daCount === 0) {
    await sequelizeMSQL.query(
      `
        INSERT INTO ${config.daTable}
          (QA_ID, Jenis_kalibrasi, Parameter_Sertifikasi, Assm_nama_instrumen,
           Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
           Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
           Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan,
           UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, Jenis_kalibrasi, Parameter_Sertifikasi, Assm_nama_instrumen,
          Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
          Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
          Tgl_kalibrasi, Interval,
          DATEADD(MONTH, Interval, Tgl_kalibrasi) AS Kalibrasi_selanjutnya,
          Catatan, :userId AS UserID, :delegatedTo AS Delegated_To,
          GETDATE() AS Process_date
        FROM ${config.certificateTable}
        WHERE QA_ID = :qaId
          AND ID_No_Sertifikat = :idNoSertifikat
      `,
      {
        replacements: { qaId, idNoSertifikat, userId, delegatedTo },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
  } else {
    await sequelizeMSQL.query(
      `
        UPDATE ${config.daTable}
        SET
          Assm_nama_instrumen          = A.Assm_nama_instrumen,
          Jenis_kalibrasi              = A.Jenis_kalibrasi,
          Parameter_Sertifikasi        = A.Parameter_Sertifikasi,
          Assm_No_identitas_Istrumen   = A.Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi  = A.Assm_No_identitas_kalibrasi,
          Group_Da_Dept                = A.Group_Da_Dept,
          Assm_Kapasitas               = A.Assm_Kapasitas,
          Parameter_Kalibrasi          = A.Parameter_Kalibrasi,
          Assm_Lokasi                  = A.Assm_Lokasi,
          Tgl_kalibrasi                = A.Tgl_kalibrasi,
          Parameter_Interval           = A.Interval,
          Kalibrasi_selanjutnya        = DATEADD(MONTH, A.Interval, A.Tgl_kalibrasi),
          Catatan                      = A.Catatan,
          UserID                       = 'ASN',
          Delegated_To                 = 'ASN',
          Process_date                 = GETDATE()
        FROM ${config.certificateTable} AS A
        LEFT JOIN ${config.daTable} AS B ON A.QA_ID = B.QA_ID
        WHERE A.QA_ID = :qaId
          AND A.ID_No_Sertifikat = :idNoSertifikat
      `,
      {
        replacements: { qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    await sequelizeMSQL.query(
      `
        DELETE FROM ${config.daStatusTable}
        WHERE QA_ID = :qaId
      `,
      {
        replacements: { qaId },
        type: Sequelize.QueryTypes.DELETE,
        transaction,
      }
    );
  }

  await sequelizeMSQL.query(
    `
      INSERT INTO ${config.certificateStatusTable}
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity,
         Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, :idNoSertifikat, 2, 0, :approverIdentity,
         GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        approverIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );
}

async function ensureDaThermoGenerated({
  config,
  qaId,
  idNoSertifikat,
  userId,
  delegatedTo,
  transaction,
}) {
  const daGeneratedCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.certificateStatusTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 2
    `,
    { qaId, idNoSertifikat },
    transaction
  );

  if (daGeneratedCount > 0) return;

  const intervalRows = await sequelizeMSQL.query(
    `
      SELECT Interval
      FROM ${config.certificateTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  if (!intervalRows[0]?.Interval || intervalRows[0].Interval === 0) {
    throw createError('Interval tidak boleh nol');
  }

  const daCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.daTable}
      WHERE QA_ID = :qaId
    `,
    { qaId },
    transaction
  );

  const approverIdentity = await getApproverIdentity({
    applicationCode: config.certificateApproverCode,
    apprNo: 2,
    userId,
    transaction,
  });

  if (daCount === 0) {
    await sequelizeMSQL.query(
      `
        INSERT INTO ${config.daTable}
          (QA_ID, Jenis_kalibrasi, Assm_nama_instrumen,
           Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
           Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
           Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan,
           UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, Jenis_kalibrasi, Assm_nama_instrumen,
          Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
          Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
          Tgl_kalibrasi, Interval,
          DATEADD(MONTH, Interval, Tgl_kalibrasi) AS Kalibrasi_selanjutnya,
          Catatan, :userId AS UserID, :delegatedTo AS Delegated_To,
          GETDATE() AS Process_date
        FROM ${config.certificateTable}
        WHERE QA_ID = :qaId
          AND ID_No_Sertifikat = :idNoSertifikat
      `,
      {
        replacements: { qaId, idNoSertifikat, userId, delegatedTo },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
  } else {
    await sequelizeMSQL.query(
      `
        UPDATE ${config.daTable}
        SET
          Assm_nama_instrumen = A.Assm_nama_instrumen,
          Jenis_kalibrasi = A.Jenis_kalibrasi,
          Assm_No_identitas_Istrumen = A.Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi = A.Assm_No_identitas_kalibrasi,
          Group_Da_Dept = A.Group_Da_Dept,
          Assm_Kapasitas = A.Assm_Kapasitas,
          Parameter_Kalibrasi = A.Parameter_Kalibrasi,
          Assm_Lokasi = A.Assm_Lokasi,
          Tgl_kalibrasi = A.Tgl_kalibrasi,
          Parameter_Interval = A.Interval,
          Kalibrasi_selanjutnya = DATEADD(MONTH, A.Interval, A.Tgl_kalibrasi),
          Catatan = A.Catatan,
          UserID = :userId,
          Delegated_To = :delegatedTo,
          Process_date = GETDATE()
        FROM ${config.certificateTable} AS A
        LEFT JOIN ${config.daTable} AS B ON A.QA_ID = B.QA_ID
        WHERE A.QA_ID = :qaId
          AND A.ID_No_Sertifikat = :idNoSertifikat
      `,
      {
        replacements: { qaId, idNoSertifikat, userId, delegatedTo },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    await sequelizeMSQL.query(
      `
        DELETE FROM ${config.daStatusTable}
        WHERE QA_ID = :qaId
      `,
      {
        replacements: { qaId },
        type: Sequelize.QueryTypes.DELETE,
        transaction,
      }
    );
  }

  await sequelizeMSQL.query(
    `
      INSERT INTO ${config.certificateStatusTable}
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity,
         Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, :idNoSertifikat, 2, 0, :approverIdentity,
         GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        approverIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );
}

async function assertDaBagianApprovePermission({ userId, transaction }) {
  const allowInputCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :userId
    `,
    { userId },
    transaction
  );

  const approverCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_DA_Bagian'
        AND Appr_No = 1
        AND Appr_ID = :userId
    `,
    { userId },
    transaction
  );

  if (allowInputCount <= 0) {
    throw createError('User tidak memiliki akses input data', 403);
  }

  if (approverCount <= 0) {
    throw createError('User bukan approver KAL_DA_Bagian level 1', 403);
  }
}

async function ensureDaApproved({
  config,
  type,
  qaId,
  userId,
  delegatedTo,
  transaction,
}) {
  const approvedCount = await countRows(
    `
      SELECT COUNT(*) AS jumRow
      FROM ${config.daStatusTable}
      WHERE QA_ID = :qaId
        AND Approver_No = 1
    `,
    { qaId },
    transaction
  );

  if (approvedCount > 0) return;

  if (type === 'bagian') {
    await assertDaBagianApprovePermission({ userId, transaction });
  }

  const approverIdentity = await getApproverIdentity({
    applicationCode: config.daApproverCode,
    apprNo: 1,
    userId,
    transaction,
  });

  await sequelizeMSQL.query(
    `
      INSERT INTO ${config.daStatusTable}
        (QA_ID, Approver_No, isReject, Approver_Identity,
         Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, 1, 0, :approverIdentity,
         GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        approverIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );
}

async function finalizeManagerCalibrationApproval({
  certificateType = 'bagian',
  session,
  user,
  transaction,
}) {
  const config = CERTIFICATE_CONFIG[certificateType];
  if (!config) throw createError('Tipe sertifikat tidak valid');

  const qaId = String(session?.QA_ID || '').trim();
  const idNoSertifikat = String(session?.ID_No_Sertifikat || '').trim();
  const userId = user?.user_id;
  const delegatedTo = user?.delegated_to || userId;

  if (!qaId || !idNoSertifikat) {
    throw createError('Generate sertifikat terlebih dahulu.');
  }

  await ensureCertificateApproved({
    config,
    qaId,
    idNoSertifikat,
    userId,
    delegatedTo,
    transaction,
  });

  if (certificateType === 'thermo') {
    await ensureDaThermoGenerated({
      config,
      qaId,
      idNoSertifikat,
      userId,
      delegatedTo,
      transaction,
    });
  } else {
    await ensureDaBagianGenerated({
      config,
      qaId,
      idNoSertifikat,
      userId,
      delegatedTo,
      transaction,
    });
  }

  await ensureDaApproved({
    config,
    type: certificateType,
    qaId,
    userId,
    delegatedTo,
    transaction,
  });
}

module.exports = {
  finalizeManagerCalibrationApproval,
};
