const { QueryTypes } = require('sequelize');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const MyError = require('../../helpers/errors');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class ExcelExportController {
  static async exportPPIReport(req, res, next) {
      try {
        const { user_id, bagian_user } = req.user;
        const { productID } = req.query;

        // Check user department access (similar to VB logic)
        if (!bagian_user || (!bagian_user.startsWith('RD') && bagian_user !== 'HD' && bagian_user !== 'PL')) {
          throw new MyError(403, 'Access denied. Only RD, HD, or PL departments can export PPI reports.');
        }

        // SQL query from VB code - productID is now optional
        let strTemp = `
          select c.Product_Name, a.PPI_ProductID, b.PPI_Description, b.PPI_owner, a.PPI_ID, a.PPI_SubID, a.PPI_BatchSize, PPI_BatchSizeUnitID,
          a.PPI_Kemasan,
          case when PPI_Description = 'PROSES PENGOLAHAN' then 1
              else case when PPI_Description = 'PROSES PENGOLAHAN (SALUT)' then 2
                    else case when PPI_Description = 'PROSES PENGEMASAN PRIMER' then 3
                        else 4 end end end as urutan_proses,
          d.PPI_SeqID, d.PPI_ItemID, f.item_name, d.PPI_QTY, d.PPI_UnitID, e.PEMBUAT, e.item_prcid,
          case when g.PPI_ProductID is null then '' else 'LOCK RD' end as Lock_status
          From m_ppi_header a
          left join m_PPI_Type_Owner b on a.PPI_ID = b.PPI_Format
          left join m_product c on a.PPI_ProductID = c.Product_ID
          left join m_ppi_detail d on a.PPI_ProductID = d.PPI_ProductID and a.PPI_ID = d.PPI_ID and a.PPI_SubID = d.PPI_SubID
          left join (select distinct KODE, nama, PEMBUAT, item_prcid from v_DPBA_for_Excel) e on d.PPI_ItemID = e.KODE
          left join m_item_manufacturing f on f.Item_ID = d.PPI_ItemID
          left join (select distinct PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID from m_ppi_header_lock) g on g.PPI_ProductID = a.PPI_ProductID and g.PPI_ID = a.PPI_ID and g.PPI_SubID = a.PPI_SubID
          Where a.IsActive = 1`;

        // Add productID filter only if provided
        if (productID && productID.trim() !== '') {
          strTemp += ` and a.ppi_productid like :productID`;
        }

        strTemp += ` order by c.Product_Name, b.ppi_owner, urutan_proses, a.ppi_subid, d.PPI_SeqID, e.NAMA`;

        // Execute query with conditional replacements
        const replacements = {};
        if (productID && productID.trim() !== '') {
          replacements.productID = `%${productID}%`;
        }

        const data = await sequelizeMSQL.query(strTemp, {
          type: QueryTypes.SELECT,
          replacements
        });

        if (!data || data.length === 0) {
          throw new MyError(404, 'No data found for the specified criteria');
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('PPI Report');

        // Define headers based on the query columns
        const headers = [
          'Product Name',
          'Product ID',
          'PPI Description',
          'PPI Owner',
          'PPI ID',
          'PPI Sub ID',
          'Batch Size',
          'Batch Size Unit ID',
          'Kemasan',
          'Process Order',
          'Sequence ID',
          'Item ID',
          'Item Name',
          'Quantity',
          'Unit ID',
          'Pembuat',
          'Item PRC ID',
          'Lock Status'
        ];

        // Add headers to worksheet
        worksheet.addRow(headers);

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        data.forEach(row => {
          worksheet.addRow([
            row.Product_Name,
            row.PPI_ProductID,
            row.PPI_Description,
            row.PPI_owner,
            row.PPI_ID,
            row.PPI_SubID,
            row.PPI_BatchSize,
            row.PPI_BatchSizeUnitID,
            row.PPI_Kemasan,
            row.urutan_proses,
            row.PPI_SeqID,
            row.PPI_ItemID,
            row.item_name,
            row.PPI_QTY,
            row.PPI_UnitID,
            row.PEMBUAT,
            row.item_prcid,
            row.Lock_status
          ]);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const productIDPart = productID && productID.trim() !== '' ? `_${productID}` : '_All';
        const filename = `PPI_Report${productIDPart}_${timestamp}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Send the Excel file
        await workbook.xlsx.write(res);
        res.end();

      } catch (error) {
        console.error('Excel export error:', error);
        next(error);
      }
    }

  static async exportCustomReport(req, res, next) {
    try {
      const { user_id, bagian_user } = req.user;
      const { query, filename = 'custom_report', headers = [] } = req.body;

      if (!query) {
        throw new MyError(400, 'SQL query is required');
      }

      // Execute custom query
      const data = await sequelizeMSQL.query(query, {
        type: QueryTypes.SELECT
      });

      if (!data || data.length === 0) {
        throw new MyError(404, 'No data found');
      }

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Use provided headers or generate from data keys
      const columnHeaders = headers.length > 0 ? headers : Object.keys(data[0]);

      // Add headers to worksheet
      worksheet.addRow(columnHeaders);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      data.forEach(row => {
        const rowValues = columnHeaders.map(header => {
          const key = headers.length > 0 ? Object.keys(row)[columnHeaders.indexOf(header)] : header;
          return row[key];
        });
        worksheet.addRow(rowValues);
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const finalFilename = `${filename}_${timestamp}.xlsx`;

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);

      // Send the Excel file
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Custom Excel export error:', error);
      next(error);
    }
  }

  static async exportProductData(req, res, next) {
    try {
      const { productCategory, isTemplate = 1 } = req.query;

      if (!productCategory) {
        throw new MyError(400, 'Product category is required');
      }

      let viewName = 'vwProduct_template';
      if (isTemplate == 0) {
        viewName = 'vwProduct';
      }

      const sqlCode = `
        select
          A.Product_ID,
          Product_Name,
          Product_Category,
          Category_Name,
          Product_Currency,
          Currency_Description,
          Product_HPP,
          Product_HNA,
          Product_HTollIN,
          Product_HTollINFee,
          Product_VolumeInBox,
          Product_VolumeInBigBox,
          Product_Unit,
          Unit_Description,
          Product_Type,
          Type_Name,
          Product_IntermediateID,
          Item_Name,
          A.Product_Init,
          Product_ExpTime,
          Product_SalesID,
          Product_BatchSize,
          [Product_Owner],
          Product_bahanAktif,
          Product_BentukSediaan,
          Product_Dosis,
          Product_Kemasan,
          Product_RuangLingkup,
          Product_Status,
          isnull(m_customer_product.cust_id,'')+'-'+isnull(cust_name,'') as customer,
          A.product_notppi,
          A.Sediaan_kode,
          A._kode_Product_RuangLingkup,
          A.Kategori_prod,
          A.jenis_prod
        from ${viewName} as A
        left join m_customer_product on A.product_id = m_customer_product.product_id
        left join m_customer on m_customer.cust_id = m_Customer_Product.cust_id
        where A.isActive = 1 and product_category = :productCategory
        order by A.Product_ID
      `;

      const data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: { productCategory }
      });

      if (!data || data.length === 0) {
        throw new MyError(404, 'No product data found');
      }

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Product Data');

      // Define headers
      const headers = Object.keys(data[0]);

      // Add headers to worksheet
      worksheet.addRow(headers);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Product_Data_${productCategory}_${timestamp}.xlsx`;

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send the Excel file
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Product data Excel export error:', error);
      next(error);
    }
  }
}

module.exports = ExcelExportController;