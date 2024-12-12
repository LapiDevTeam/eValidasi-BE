const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { QueryTypes } = require("sequelize");

class MasterItemBahanKemasTemplateController {
  static async fetchItemWithGroupTemplate(req, res, next) {
    try {
      const { kodeOrNamaBahan = "", isActive, groupType } = req.query;
      const sqlCode = `
            select Item_ID, Group_name, Item_Name, Item_Size, Item_Description, item_unit,
        item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime, 
        item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate,
        item_status, IsActive,Owner, ishalal, item_bpomgenerik, namagenerik, item_row from vwM_ItemWithGroup_template where item_type = '${groupType}'
         ${
           isActive ? "and IsActive = 1" : ""
         } and item_id + ' ' + item_name like '%${kodeOrNamaBahan}%'`;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchBpomItem(req, res, next) {
    try {
      const { item_name } = req.query;
      const sqlCode = `
      SELECT item_name as NAMA_GENERIK , item_id as KODE FROM mBPOM_item where isActive = 1 and item_name like '%${item_name}%' ORDER BY item_name ASC`;

      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MasterItemBahanKemasTemplateController;
