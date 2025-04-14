const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require('exceljs');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const MyError = require('../../helpers/errors');


async function getAuditPrograms(req, res) {
  try {
    const { system = 'ePengembangan Formula', program='eRDSystem', type = 'ALL' } = req.query;

    if (!system) {
      return res.status(400).json({ message: 'System parameter is required' });
    }

    if (!program) {
      return res.status(400).json({ message: 'Program parameter is required' });
    }

    // Construct query similar to the VBA code
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

    // Create type filter (empty if "ALL" is selected, otherwise filter by the type)
    const typeFilter = type === 'ALL' ? '%' : `%${type}%`;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      replacements: {
        system: system,
        program: program,
        typeFilter: typeFilter
      },
      type: QueryTypes.SELECT
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No audit programs found' });
    }

    // Format data for response
    const formattedData = records.map(record => ({
      auditSubId: record.Audit_SubID,
      subName: record.Sub_Name,
      subType: record.Sub_Type,
      auditId: record.Audit_ID,
      id: record.ID,
      programName: record.nama_program
    }));

    // Prepare response
    const responseData = {
      metadata: {
        title: 'Audit Program Data',
        system: system,
        program: program,
        type: type,
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
      },
      data: formattedData
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting audit programs:', error);
    return res.status(500).json({
      message: 'Error getting audit programs',
      error: error.message
    });
  }
}

async function getAuditTrailDetails(req, res) {
  try {
    const { progId, submenuId, system = 'ePengembangan Formula' } = req.query;

    if (!progId) {
      return res.status(400).json({ message: 'Program ID is required' });
    }

    if (!submenuId) {
      return res.status(400).json({ message: 'Submenu ID is required' });
    }

    if (!system) {
      return res.status(400).json({ message: 'System parameter is required' });
    }

    // SQL query based on the VBA code
    const sqlQuery = `
      SELECT
        sub_auditPart,
        sub_auditFilterColumns
      FROM
        m_audit_trail_detail a
      JOIN
        m_audit_trail_header b
      ON
        a.audit_id = b.audit_id
      WHERE
        audit_progid = :progId
        AND audit_subid = :submenuId
        AND audit_esystem = :system
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      replacements: {
        progId,
        submenuId,
        system
      },
      type: QueryTypes.SELECT
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No audit trail details found' });
    }

    // Process the result - similar to the VBA code
    const record = records[0];

    // Handle null values for audit parts and filter columns
    const auditParts = record.sub_auditPart ? record.sub_auditPart.split(',').map(part => part.trim()) : [];
    const filterColumns = record.sub_auditFilterColumns ? record.sub_auditFilterColumns.split(',').map(col => col.trim()) : [];

    // If auditParts is empty, add a placeholder (similar to the VBA code)
    if (auditParts.length === 0) {
      auditParts.push('-');
    }

    // Prepare response
    const responseData = {
      metadata: {
        title: 'Audit Trail Details',
        programId: progId,
        submenuId: submenuId,
        system: system,
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
      },
      data: {
        modules: auditParts,
        filterColumns: filterColumns
      }
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting audit trail details:', error);
    return res.status(500).json({
      message: 'Error getting audit trail details',
      error: error.message
    });
  }
}

async function exportAuditTrail(req, res) {
  try {
    const {
      programId,
      submenuId,
      module = '',
      filterColumn = '',
      filterValue = '',
      system = 'ePengembangan Formula'
    } = req.query;

    // Parameter validation
    if (!programId) {
      return res.status(400).json({ message: 'Program ID is required' });
    }

    if (!submenuId) {
      return res.status(400).json({ message: 'Submenu ID is required' });
    }

    // Build filter condition
    let filterCondition = '';
    if (filterColumn && filterValue) {
      filterCondition = `[${filterColumn}] like '%${filterValue}%'`;
    }

    // Execute the stored procedure
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

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eFormulation System';
    workbook.created = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('Audit Trail');

    // Set column widths dynamically
    const columns = Object.keys(records[0]);
    columns.forEach((column, index) => {
      worksheet.getColumn(index + 1).width = Math.min(column.length + 5, 30); // Adjust width
    });

    // Add headers
    const headerRow = worksheet.addRow(columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add borders to headers
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
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

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=AuditTrail_${programId}_${submenuId}_${moment().format('YYYYMMDD')}.xlsx`);

    // Send the Excel buffer
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    return res.status(500).json({
      message: 'Error exporting audit trail',
      error: error.message
    });
  }
}


module.exports = {
  getAuditPrograms,
  getAuditTrailDetails,
  exportAuditTrail
};