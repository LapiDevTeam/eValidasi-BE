const { sequelize } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusCatatanTrial } = require("../helpers/checkStatus");
const { getStatusCatatanTrial } = require("../helpers/statusCatatanTrial");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");
const { fetchApproverInisial } = require("../services/mssqlService");

class ControllerGlobalApi {
  static async getDpba(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `
            select a.item_id as kodebahan, b.item_name as namabahan, a.item_prcid as kode_produsen, c.prc_name as produsen, a.item_suppid as kode_pemasok, d.supp_name as pemasok From m_item_manufacturing_supplier a
                left join m_item_manufacturing b on a.item_id = b.item_id
                left join m_principle c on a.item_prcid = c.prc_id
                left join m_supplier d on a.item_suppid = d.supp_id
                    where a.isactive = 1
                    and b.isactive = 1 and c.isactive = 1 and d.isactive = 1 and b.item_type = 'BB' order by a.item_id, a.item_prcid;
            `,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async getProdukTerdampak(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `SELECT Product_ID, Product_Name, Product_Category 
                FROM m_product 
                WHERE Product_Category IN ('01', '02') 
                     AND isActive = '1';
          `,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerGlobalApi;
