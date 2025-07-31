const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const path = require('path');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const { type } = require('os');
const puppeteer = require('puppeteer'); // Untuk generate PDF dari halaman web
const { PDFDocument, rgb } = require('pdf-lib'); // Untuk menggabungkan dan memodifikasi PDF
const fs = require('fs'); // Untuk membaca file logo
// Pastikan logoPath didefinisikan, misal:
// const logoPath = path.join(__dirname, '../../assets/logo.png'); // Ganti dengan path yang sesuai ke logo Anda
const logoPath = path.join(__dirname, '../../assets/LapiLogo.jpg');
// Fungsi untuk mengubah gambar ke base64
function getBase64Image(filePath) {
  const bitmap = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${Buffer.from(bitmap).toString('base64')}`;
}

const getModuleRevisionsDA = async (req, res) => {
  try {
    const { modulename, isApprove } = req.query;
    if (!modulename) {
      return res.status(400).json({ message: 'Module name is required.' });
    }

    let query = `
      SELECT
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        refrensi,
        dokumen_terkait,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData,
        mgr_userid
      FROM m_module_revisions
      WHERE modulename = :modulename
    `;

    if (isApprove === 'true' || isApprove === '1') {
      query += `
        AND appr_date IS NOT NULL
        AND appr_userid IS NOT NULL
        AND appr_userid <> ''
      `;
    }

    query += `
      ORDER BY no_revisi DESC
    `;

    const revisions = await sequelizeMSQL.query(query, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (revisions.length === 0) {
      return res.status(404).json({ message: 'No revisions found for the given module name.' });
    }

    // Parse JSON columns
    const parsedRevisions = revisions.map(rev => ({
      ...rev,
      daftar_distribusi: (() => {
        try { return rev.daftar_distribusi ? JSON.parse(rev.daftar_distribusi) : null; } catch { return rev.daftar_distribusi; }
      })(),
      refrensi: (() => {
        try { return rev.refrensi ? JSON.parse(rev.refrensi) : rev.refrensi; } catch { return rev.refrensi; }
      })(),
      dokumen_terkait: (() => {
        try { return rev.dokumen_terkait ? JSON.parse(rev.dokumen_terkait) : rev.dokumen_terkait; } catch { return rev.dokumen_terkait; }
      })(),
    }));

    return res.status(200).json({ message: 'Module revisions fetched successfully.', data: parsedRevisions });
  } catch (error) {
    console.error('Error fetching module revisions:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const createModuleRevision = async (req, res) => {
  try {
    const { modulename, tgl_revisi, alasan_desc, daftar_distribusi = null, refrensi = null, dokumen_terkait = null, appr_userid, appr_delegated, appr_date, extraData, mgr_userid } = req.body;

    if (!modulename || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'modulename, tgl_revisi, and alasan_desc are required.' });
    }

    // Get latest no_revisi for this modulename
    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_module_revisions
      WHERE modulename = :modulename
      ORDER BY no_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    const new_no_revisi = latestRevision ? parseInt(latestRevision.no_revisi, 10) + 1 : 1;

    // Get next PK_ID
    const [pkidResult] = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_module_revisions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const PK_ID = pkidResult.PK_ID;

    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;

    const query = `
      INSERT INTO m_module_revisions (
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        refrensi,
        dokumen_terkait,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData,
        mgr_userid
      )
      VALUES (
        :PK_ID,
        :modulename,
        :new_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        :daftar_distribusi,
        :refrensi,
        :dokumen_terkait,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :extraData,
        :mgr_userid
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        PK_ID,
        modulename,
        new_no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        refrensi: stringRefrensi,
        dokumen_terkait: stringDokumenTerkait,
        appr_userid: appr_userid || '',
        appr_delegated: appr_delegated || '',
        appr_date: appr_date || null,
        extraData: extraData || null,
        mgr_userid: mgr_userid || null,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Module revision created successfully.' });
  } catch (error) {
    console.error('Error creating module revision:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const createModuleRevisionWithSameNumber = async (req, res) => {
  try {
    const { modulename, tgl_revisi, alasan_desc, daftar_distribusi = null, refrensi = null, dokumen_terkait = null, appr_userid, appr_delegated, appr_date, extraData, mgr_userid } = req.body;

    if (!modulename || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'modulename, tgl_revisi, and alasan_desc are required.' });
    }

    // Fetch the latest revision for the given modulename
    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_module_revisions
      WHERE modulename = :modulename
      ORDER BY tgl_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!latestRevision) {
      return res.status(404).json({ message: 'No revisions found for the given modulename.' });
    }

    const same_no_revisi = parseInt(latestRevision.no_revisi, 10);

    // Get next PK_ID
    const [pkidResult] = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_module_revisions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const PK_ID = pkidResult.PK_ID;

    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;

    const query = `
      INSERT INTO m_module_revisions (
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        refrensi,
        dokumen_terkait,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData,
        mgr_userid
      )
      VALUES (
        :PK_ID,
        :modulename,
        :same_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        :daftar_distribusi,
        :refrensi,
        :dokumen_terkait,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :extraData,
        :mgr_userid
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        PK_ID,
        modulename,
        same_no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        refrensi: stringRefrensi,
        dokumen_terkait: stringDokumenTerkait,
        appr_userid: appr_userid || '',
        appr_delegated: appr_delegated || '',
        appr_date: appr_date || null,
        extraData: extraData || null,
        mgr_userid: mgr_userid || null,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Module revision created successfully with the same revision number.' });
  } catch (error) {
    console.error('Error creating module revision with the same number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getLatestModuleRevisionNumber = async (req, res) => {
  try {
    const { modulename } = req.query;

    if (!modulename) {
      return res.status(400).json({ message: 'Module name is required.' });
    }

    // Query to fetch the latest revision number where `appr_date` is null
    const query = `
      SELECT TOP 1 *
      FROM m_module_revisions
      WHERE modulename = :modulename AND appr_date IS NULL AND appr_userid IS NULL
      ORDER BY no_revisi DESC
    `;

    const [result] = await sequelizeMSQL.query(query, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });
    console.log({result});
    // If no result is found, fallback to fetch the latest revision number
    if (!result) {
      const fallbackQuery = `
        SELECT TOP 1 *
        FROM m_module_revisions
        WHERE modulename = :modulename
        ORDER BY no_revisi DESC
      `;

      const [fallbackResult] = await sequelizeMSQL.query(fallbackQuery, {
        replacements: { modulename },
        type: Sequelize.QueryTypes.SELECT,
      });

      // If no fallback result is found, return 1 as the first revision number
      if (!fallbackResult) {
        return res.status(200).json({ no_revisi: 1 });
      }

      // Increment the fallback result by 1
      console.log({result: result, status: ""});
      const newRevision = parseInt(fallbackResult.no_revisi, 10) + 1;
      return res.status(200).json({ no_revisi: newRevision });
    }

    // Parse daftar_distribusi, refrensi, dokumen_terkait if they are JSON strings
    const parsedResult = {
      ...result,
      daftar_distribusi: (() => {
        try { return result.daftar_distribusi ? JSON.parse(result.daftar_distribusi) : null; } catch { return result.daftar_distribusi; }
      })(),
      refrensi: (() => {
        try { return result.refrensi ? JSON.parse(result.refrensi) : result.refrensi; } catch { return result.refrensi; }
      })(),
      dokumen_terkait: (() => {
        try { return result.dokumen_terkait ? JSON.parse(result.dokumen_terkait) : result.dokumen_terkait; } catch { return result.dokumen_terkait; }
      })(),
    };

    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error('Error fetching latest module revision number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const approveModuleRevisionByModuleName = async (modulename, user_id, delegated_to) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    if (!modulename || !user_id || !delegated_to) {
      throw new Error('modulename, user_id, and delegated_to are required.');
    }

    // Check if there are any revisions that can be approved (appr_date is null)
    const checkRevisionQuery = `
      SELECT TOP 1 PK_ID, no_revisi
      FROM m_module_revisions
      WHERE modulename = :modulename
        AND (appr_date IS NULL OR appr_date = '')
        AND (appr_userid IS NULL OR appr_userid = '')
      ORDER BY no_revisi DESC
    `;

    const [revisionToApprove] = await sequelizeMSQL.query(checkRevisionQuery, {
      replacements: { modulename },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!revisionToApprove) {
      throw new Error('No pending revisions found to approve or all revisions are already approved.');
    }

    const sqlDtTime = moment().format('YYYY-MM-DD HH:mm:ss');

    // Check if the user is an approver (change 'MODULE' if your application code is different)
    const approver = await sequelizeMSQL.query(
      `SELECT TOP 1 Appr_Identity FROM m_Approver_Lines WHERE isactive = 1 AND Appr_ApplicationCode LIKE 'MODULE' AND Appr_ID LIKE :user_id`,
      { replacements: { user_id }, type: QueryTypes.SELECT, transaction }
    );

    if (!approver || approver.length === 0) {
      throw new Error('User is not authorized to approve.');
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || '0000';

    if (!sqlAppr_Identity || sqlAppr_Identity === '0000') {
      throw new Error('Invalid approver identity.');
    }

    console.log({ Approval: sqlAppr_Identity, status: "approving", revision: revisionToApprove.no_revisi });

    const updateQuery = `
      UPDATE m_module_revisions
      SET appr_userid = :user_id,
          appr_delegated = :delegated_to,
          appr_date = :sqlDtTime,
          mgr_userid = :user_id
      WHERE modulename = :modulename
        AND (appr_date IS NULL OR appr_date = '')
        AND (appr_userid IS NULL OR appr_userid = '')
    `;

    const [updateResult] = await sequelizeMSQL.query(updateQuery, {
      replacements: { user_id, delegated_to, sqlDtTime, modulename },
      type: QueryTypes.UPDATE,
      transaction,
    });

    // Commit the transaction if the update was successful
    if (updateResult && updateResult.length > 0) {
      await transaction.commit();
      return 1; // Approval successful
    } else {
      throw new Error('Failed to update revision approval status.');
    }
  } catch (error) {
    console.error('Error approving module revision:', error);
    await transaction.rollback();
    return 0; // Approval failed
  }
};

const updateOrCreateModuleRevision = async (req, res) => {
  const { modulename, no_revisi, tgl_revisi, alasan_desc, daftar_distribusi = null, refrensi = null, dokumen_terkait = null, appr_userid, appr_delegated, appr_date, extraData, mgr_userid } = req.body;

  if (!modulename || !no_revisi || !tgl_revisi || !alasan_desc) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate tgl_revisi
  const cutoffDate = new Date('2025-02-25');
  const inputDate = new Date(tgl_revisi);

  if (inputDate < cutoffDate) {
    return res.status(400).json({ message: "tgl_revisi cannot be earlier than 25th February 2025." });
  }
  const transaction = await sequelizeMSQL.transaction();
  try {
    // Check if a record with the given no_revisi exists for this modulename
    const queryCheck = `
      SELECT TOP 1 PK_ID
      FROM m_module_revisions
      WHERE modulename = :modulename AND no_revisi = :no_revisi
    `;

    const [existingRecord] = await sequelizeMSQL.query(queryCheck, {
      replacements: { modulename, no_revisi },
      type: QueryTypes.SELECT,
    });

    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;

    if (existingRecord) {
      // Update the existing record
      const queryUpdate = `
        UPDATE m_module_revisions
        SET alasan_desc = :alasan_desc,
            tgl_revisi = :tgl_revisi,
            daftar_distribusi = :daftar_distribusi,
            refrensi = :refrensi,
            dokumen_terkait = :dokumen_terkait,
            extraData = :extraData,
            mgr_userid = :mgr_userid
        WHERE no_revisi = :no_revisi AND modulename = :modulename
      `;

      await sequelizeMSQL.query(queryUpdate, {
        replacements: {
          no_revisi,
          tgl_revisi,
          alasan_desc,
          modulename,
          daftar_distribusi: stringDaftarDistribusi,
          refrensi: stringRefrensi,
          dokumen_terkait: stringDokumenTerkait,
          extraData: extraData || null,
          mgr_userid: mgr_userid || null,
        },
        transaction,
      });

      await transaction.commit();
      return res.status(200).json({ message: "Module revision updated successfully." });
    } else {
      // Get next PK_ID
      const [pkidResult] = await sequelizeMSQL.query(
        `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_module_revisions`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      const PK_ID = pkidResult.PK_ID;

      // Create a new record
      const queryInsert = `
        INSERT INTO m_module_revisions (
          PK_ID,
          modulename,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          daftar_distribusi,
          refrensi,
          dokumen_terkait,
          Process_Date,
          extraData,
          mgr_userid
        )
        VALUES (
          :PK_ID,
          :modulename,
          :no_revisi,
          :tgl_revisi,
          :alasan_desc,
          :daftar_distribusi,
          :refrensi,
          :dokumen_terkait,
          GETDATE(),
          :extraData,
          :mgr_userid
        )
      `;

      await sequelizeMSQL.query(queryInsert, {
        replacements: {
          PK_ID,
          modulename,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          daftar_distribusi: stringDaftarDistribusi,
          refrensi: stringRefrensi,
          dokumen_terkait: stringDokumenTerkait,
          extraData: extraData || null,
          mgr_userid: mgr_userid || null,
        },
        transaction,
      });

      await transaction.commit();
      return res.status(201).json({ message: "Module revision created successfully." });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateOrCreateModuleRevision:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const getAspLink = async (req, res) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { pageName, menuName  } = req.query;

    if (!user_id || user_id === '') {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!pageName || !menuName) {
      return res.status(400).json({ message: 'pageName and menuName are required.' });
    }

    if (!delegated_to || delegated_to === '') {
      delegated_to = user_id; // Use user_id if delegated_to is not provided
    }

    const queryToken = `select dbo.fngettoken(:user_id) as Token`;
    const [result] = await sequelizeMSQL.query(queryToken, {
      replacements: { user_id },
      type: QueryTypes.SELECT,
    });

    const token = result ? result.Token : null;
    if (!token) {
      return res.status(400).json({ message: 'Failed to generate token.' });
    }

    // Construct the ASP link
    const aspLink = `http://192.168.1.39:8080/${menuName}/AutoLogin.aspx?UID=${user_id}&DID=${user_id}&Token=${token}&page=${pageName}`;

    return res.status(200).json({ message: 'Success.', data: aspLink });
  } catch (error) {
    console.error('Error fetching ASP link:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

async function printHeaderDa(req, res) {
  let {
    link1,
    link2,
    type,
    kode = "",
    token,
    judul = "Vendor",
    tanggal = "",
    revisi = "",
    rencana_berlaku = "",
    landscape = "",
  } = req.query;

  let browser;
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let parts = tanggal.split("/");
    parts[2] = (parseInt(parts[2]) + 5).toString();
    let newTanggal = parts.join("/");
    const logoBase64 = getBase64Image(logoPath);

    // await page.setExtraHTTPHeaders({
    //   authentication: token,
    // });
    await page.goto(
      link1 + `?revisi=${revisi}&rencana_berlaku=${rencana_berlaku}`,
      { waitUntil: "networkidle0" }
    );
    //     await page.setContent(`
    //   <html>
    //     <body>
    //       <h1>Ini adalah halaman 2</h1>
    //     </body>
    //   </html>
    // `);
    await page.addStyleTag({
      content: `
        * {
          font-size: 12px !important;
          font-family: Arial, sans-serif;
        }
      `,
    });
    const pdfBuffer1 = await page.pdf({
      landscape: landscape ? true : false,
      format: "A4",
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: ` `,
      headerTemplate: `<table style="width: 92%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
            <tr>
              <td style="border: 1px solid gray; width: 140px; height: 100px; text-align: center;" rowspan="2">
                <img src="${logoBase64}" alt="lapilogo" width="100">
              </td>

              <td style="border: 1px solid black;  text-align: start; font-weight: bold;  height:22px; padding-left: 10px">
                DAFTAR
              </td>

              <td style="width: 220px; height: 120px; border: 1px solid black; vertical-align: top;" rowspan="2">
                <div style="width: 100%; height: 100%; font-size: 11px; display: flex; flex-direction: column;">
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 28px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Nomor</div>
                    <div style="width: 60%; padding: 5px 4px;">${kode}</div>
                  </div>
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 48px;">
                    <div style="width: 40%; padding: 8px 4px; border-right: 1px solid black;">Tanggal Berlaku</div>
                    <div style="width: 60%; padding: 8px 4px;"></div>
                  </div>
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 48px;">
                    <div style="width: 40%; padding: 8px 4px; border-right: 1px solid black;">Tanggal Review</div>
                    <div style="width: 60%; padding: 8px 4px;"></div>
                  </div>
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 20px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Revisi</div>
                    <div style="width: 60%; padding: 5px 4px;">${revisi}</div>
                  </div>
                  <div style="display: flex; min-height: 20px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Halaman</div>
                    <div style="width: 60%; padding: 5px 4px;">
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="border: 1px solid gray; height: 120px; text-align: center; font-weight: bold;">
                ${judul}
              </td>
            </tr>
          </table>`,
      margin: { bottom: "60px", top: "210px", left: "40px", right: "40px" },
    });

    await page.goto(
      link2 + `&revisi=${revisi}&rencana_berlaku=${rencana_berlaku}`,
      { waitUntil: "networkidle0" }
    );
    //     await page.setContent(`
    //   <html>
    //     <body>
    //       <h1>Ini adalah halaman 2</h1>
    //     </body>
    //   </html>
    // `);
    await page.addStyleTag({
      content: `
        * {
          font-size: 12px !important;
          font-family: Arial, sans-serif;
        }
      `,
    });

    // Membuat PDF dalam bentuk buffer
    const pdfBuffer2 = await page.pdf({
      landscape: landscape ? true : false,
      format: "A4",
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: ` `,
      headerTemplate: `
        <table style="width: 92%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
            <tr>
              <td style="border: 1px solid gray; width: 140px; height: 50px; text-align: center;" rowspan="2">
                <img src="${logoBase64}" alt="lapilogo" width="100">
              </td>

              <td style="border: 1px solid black;  text-align: start; font-weight: bold;  height:17px; padding-left: 10px">
                DAFTAR
              </td>

              <td style="width: 220px; height: 30px; border: 1px solid black; vertical-align: top;" rowspan="2">
                <div style="width: 100%; height: 100%; font-size: 11px; display: flex; flex-direction: column;">
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 28px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Nomor</div>
                    <div style="width: 60%; padding: 5px 4px;">${kode}</div>
                  </div>
                  <div style="display: flex; border-bottom: 1px solid black; min-height: 20px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Revisi</div>
                    <div style="width: 60%; padding: 5px 4px;">${revisi}</div>
                  </div>
                  <div style="display: flex; min-height: 20px;">
                    <div style="width: 40%; padding: 5px 4px; border-right: 1px solid black;">Halaman</div>
                    <div style="width: 60%; padding: 5px 4px;">
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="border: 1px solid gray; height: 30px; text-align: center; font-weight: bold;">
                ${judul}
              </td>
            </tr>
          </table>
        `,
      margin: { bottom: "60px", top: "120px", left: "40px", right: "40px" },
    });
    await browser.close();

    const mergedPdf = await PDFDocument.create();

    const doc1 = await PDFDocument.load(pdfBuffer1);
    const doc2 = await PDFDocument.load(pdfBuffer2);

    const pages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
    const pages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());

    pages1.forEach((page) => mergedPdf.addPage(page));
    pages2.forEach((page) => mergedPdf.addPage(page));

    const finalPdf = await mergedPdf.save();
    const pdfDoc = await PDFDocument.load(finalPdf);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      let pages1Setting = landscape
        ? {
            x: 712,
            y: 454, // sesuaikan posisi di halaman
            size: 9,
            color: rgb(0, 0, 0),
          }
        : {
            x: 476,
            y: 700, // sesuaikan posisi di halaman
            size: 9,
            color: rgb(0, 0, 0),
          };

      // Tambahkan teks "Halaman X dari Y"
      page.drawText(
        `${i + 1} dari ${totalPages}`,
        i + 1 === 1
          ? pages1Setting
          : landscape
          ? {
              x: 712,
              y: 528, // sesuaikan posisi di halaman
              size: 9,
              color: rgb(0, 0, 0),
            }
          : {
              x: 476,
              y: 774, // sesuaikan posisi di halaman
              size: 9,
              color: rgb(0, 0, 0),
            }
      );

      // (Opsional) Tambahkan rectangle putih menutupi watermark lama
      // page.drawRectangle({
      //   x: 200,
      //   y: 400,
      //   width: 200,
      //   height: 50,
      //   color: rgb(1, 1, 1),
      // });
    }

    const pdfBytes = await pdfDoc.save();
    res.end(pdfBytes);
  } catch (error) {
    console.error("Error during printCatatanTrial:", error);
    if (browser) await browser.close();
    res.status(500).send({ error: "An error occurred during PDF generation." });
  }
}

module.exports = {
  getModuleRevisionsDA,
  createModuleRevision,
  createModuleRevisionWithSameNumber,
  getLatestModuleRevisionNumber,
  approveModuleRevisionByModuleName,
  updateOrCreateModuleRevision,
  getAspLink,
  printHeaderDa
};