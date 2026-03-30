const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const ExcelJS = require('exceljs');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const MyError = require('../../helpers/errors');

class AuditTrailController {
  /**
   * Get audit programs based on system, program, and type filters
   * GET /audit-trail/programs
   */
  async getAuditPrograms(req, res, next) {
    try {
      const { system = 'eValidasi', program = 'eValidasi', type = 'ALL' } = req.query;

      if (!system) {
        return res.status(400).json({ message: 'System parameter is required' });
      }

      if (!program) {
        return res.status(400).json({ message: 'Program parameter is required' });
      }

      // Construct query — matches Store_All in frmAuditTrailNT.vba
      const sqlQuery = `
        SELECT
          Audit_ID,
          ID,
          nama_program,
          Audit_SubID,
          Sub_Name,
          Sub_Type
        FROM
          vw_AuditProgram
        WHERE
          audit_esystem = :system
          AND nama_program = :program
          AND sub_type LIKE :typeFilter
        ORDER BY
          audit_subid
      `;

      const typeFilter = type === 'ALL' ? '%' : `%${type}%`;

      const records = await sequelizeMSQL.query(sqlQuery, {
        replacements: { system, program, typeFilter },
        type: QueryTypes.SELECT
      });

      if (records.length === 0) {
        return res.status(404).json({ message: 'No audit programs found' });
      }

      const formattedData = records.map(record => ({
        auditSubId: record.Audit_SubID,
        subName: record.Sub_Name,
        subType: record.Sub_Type,
        auditId: record.Audit_ID,
        id: record.ID,
        programName: record.nama_program
      }));

      return res.status(200).json({
        metadata: {
          title: 'Audit Program Data',
          system,
          program,
          type,
          generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
        },
        data: formattedData
      });

    } catch (error) {
      console.error('Error getting audit programs:', error);
      next(new MyError(500, 'Error getting audit programs', error));
    }
  }

  /**
   * Get audit trail modules and filter columns for a specific submenu
   * GET /audit-trail/details
   *
   * Mirrors set_ListView in frmAuditTrailNT.vba
   */
  async getAuditTrailDetails(req, res, next) {
    try {
      const { progId, submenuId, system = 'eValidasi' } = req.query;

      if (!progId) {
        return res.status(400).json({ message: 'Program ID is required' });
      }

      if (!submenuId) {
        return res.status(400).json({ message: 'Submenu ID is required' });
      }

      const sqlQuery = `
        SELECT
          sub_auditPart,
          sub_auditFilterColumns
        FROM
          m_audit_trail_detail a
        JOIN
          m_audit_trail_header b ON a.audit_id = b.audit_id
        WHERE
          audit_progid = :progId
          AND audit_subid = :submenuId
          AND audit_esystem = :system
      `;

      const records = await sequelizeMSQL.query(sqlQuery, {
        replacements: { progId, submenuId, system },
        type: QueryTypes.SELECT
      });

      if (records.length === 0) {
        return res.status(404).json({ message: 'No audit trail details found' });
      }

      const record = records[0];

      const auditParts = record.sub_auditPart
        ? record.sub_auditPart.split(',').map(part => part.trim())
        : [];

      const filterColumns = record.sub_auditFilterColumns
        ? record.sub_auditFilterColumns.split(',').map(col => col.trim())
        : [];

      if (auditParts.length === 0) {
        auditParts.push('-');
      }

      return res.status(200).json({
        metadata: {
          title: 'Audit Trail Details',
          programId: progId,
          submenuId,
          system,
          generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
        },
        data: {
          modules: auditParts,
          filterColumns
        }
      });

    } catch (error) {
      console.error('Error getting audit trail details:', error);
      next(new MyError(500, 'Error getting audit trail details', error));
    }
  }

  /**
   * Check whether a submenu uses direct-download mode
   * GET /audit-trail/check-type
   *
   * Mirrors fnCekType in frmAuditTrailNT.vba
   */
  async checkAuditType(req, res, next) {
    try {
      const { submenuId, system = 'eValidasi' } = req.query;

      if (!submenuId) {
        return res.status(400).json({ message: 'Submenu ID is required' });
      }

      const sqlQuery = `
        SELECT
          ISNULL(type_direct, 0) AS type_direct
        FROM
          m_audit_trail_header AS A
          LEFT OUTER JOIN m_audit_trail_detail AS B ON A.Audit_ID = B.Audit_ID
        WHERE
          A.Audit_eSystem = :system
          AND B.Audit_SubID = :submenuId
      `;

      const records = await sequelizeMSQL.query(sqlQuery, {
        replacements: { system, submenuId },
        type: QueryTypes.SELECT
      });

      const isDirect = records.length > 0 && records[0].type_direct === 1;

      let downloadLink = null;
      if (isDirect) {
        const linkQuery = `
          SELECT
            b.Sub_SourceDataName
          FROM
            m_audit_trail_header AS A
            LEFT OUTER JOIN m_audit_trail_detail AS B ON A.Audit_ID = B.Audit_ID
          WHERE
            A.Audit_eSystem = :system
            AND B.Audit_SubID = :submenuId
        `;

        const linkRecords = await sequelizeMSQL.query(linkQuery, {
          replacements: { system, submenuId },
          type: QueryTypes.SELECT
        });

        downloadLink = linkRecords.length > 0 ? linkRecords[0].Sub_SourceDataName : null;
      }

      return res.status(200).json({
        isDirect,
        downloadLink
      });

    } catch (error) {
      console.error('Error checking audit type:', error);
      next(new MyError(500, 'Error checking audit type', error));
    }
  }

  /**
   * Export audit trail data to Excel
   * GET /audit-trail/export
   *
   * Mirrors Set_Grid in frmAuditTrailNT.vba — calls sp_showAuditTrail
   */
  async exportAuditTrail(req, res, next) {
    try {
      const {
        programId,
        submenuId,
        module = '',
        filterColumn = '',
        filterValue = '',
        system = 'eValidasi'
      } = req.query;

      if (!programId) {
        return res.status(400).json({ message: 'Program ID is required' });
      }

      if (!submenuId) {
        return res.status(400).json({ message: 'Submenu ID is required' });
      }

      // Build filter condition — mirrors: [column] like ''%value%''
      let filterCondition = '';
      if (filterColumn && filterValue) {
        filterCondition = `[${filterColumn}] like '%${filterValue}%'`;
      }

      // Execute stored procedure — mirrors sp_showAuditTrail call in Set_Grid
      const sqlQuery = `
        exec sp_showAuditTrail
          :programId,
          :submenuId,
          :module,
          :filterCondition,
          :system
      `;

      const records = await sequelizeMSQL.query(sqlQuery, {
        replacements: {
          programId,
          submenuId,
          module: module === '-' ? '' : module,
          filterCondition,
          system
        },
        type: QueryTypes.SELECT
      });

      if (records.length === 0) {
        return res.status(404).json({ message: 'No audit trail data found' });
      }

      // Build Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'eValidasi System';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Audit Trail');

      const columns = Object.keys(records[0]);

      columns.forEach((col, idx) => {
        worksheet.getColumn(idx + 1).width = Math.min(col.length + 5, 30);
      });

      const headerRow = worksheet.addRow(columns);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
      });

      records.forEach((record) => {
        const row = worksheet.addRow(Object.values(record));
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
      };

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=AuditTrail_${programId}_${submenuId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`
      );

      res.send(buffer);

    } catch (error) {
      console.error('Error exporting audit trail:', error);
      next(new MyError(500, 'Error exporting audit trail', error));
    }
  }
}

module.exports = new AuditTrailController();
