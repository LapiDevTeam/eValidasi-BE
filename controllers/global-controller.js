const sql = require("mssql");
const { configMssql } = require("../config/configMssql");
const MyError = require("../helpers/errors");

class GlobalController {
  static async fetchGroupCode(req, res, next) {
    try {
      const { groupType } = req.query;

      if (!groupType) throw new MyError(400, "groupType is required");
      const pool = await sql.connect(configMssql);
      const queryCode = `SELECT group_id, group_name FROM m_item_group WHERE group_type = @group_type`;
      const request = pool.request();
      const result1 = await request
        .input("group_type", sql.NVarChar(5), groupType)
        .query(queryCode);

      const _data = result1.recordset;
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchItemUnit(req, res, next) {
    try {
      const pool = await sql.connect(configMssql);
      const queryCode = `SELECT unit_id FROM m_unit WHERE unit_ID NOT LIKE '(none)'`;
      const request = pool.request();
      const result1 = await request.query(queryCode);

      const _data = result1.recordset;
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GlobalController;
