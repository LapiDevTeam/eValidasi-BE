const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { QueryTypes } = require("sequelize");

class MasterFormulaItemGroupTemplateController {
  static async getQueryItem(req, res, next) {
    try {
      const { itemType, quickSearch } = req.query;

      // Build SQL query matching the VB6 QueryItem logic
      let strSQL = `
        select * from (
          select
            Item_ID,
            Group_name,
            Item_Name,
            Item_Size,
            Item_Description,
            item_unit,
            item_group,
            item_type,
            item_Currency,
            Item_Price,
            Item_MinOrder,
            Item_LeadTime,
            item_PackingSize,
            Item_Localindent,
            Item_LastPriceCurrency,
            item_LastPrice,
            item_lastPriceDate,
            item_status,
            IsActive,
            Owner,
            ishalal,
            item_bpomgenerik,
            namagenerik,
            item_row
          from vwM_ItemWithGroup
          where item_type like :itemType
            and isActive = 1

          union all

          select
            Product_ID as Item_ID,
            'OBAT JADI' as Group_Name,
            Product_Name as Item_Name,
            '' as Item_Size,
            '' as Item_Description,
            Product_Unit as item_unit,
            '' as item_group,
            '' as item_type,
            '' as item_Currency,
            0 as Item_Price,
            0 as Item_MinOrder,
            0 as Item_LeadTime,
            '' as item_PackingSize,
            '' as Item_Localindent,
            'IDR' as Item_LastPriceCurrency,
            0 as item_LastPrice,
            null as item_lastPriceDate,
            1 as item_status,
            1 as IsActive,
            'RD1' as Owner,
            0 as ishalal,
            null as item_bpomgenerik,
            null as namagenerik,
            null as item_row
          from m_product
          where (Product_Name like 'pelarut%'
            or Product_Name like '%water%'
            or Product_Name like '%infer%')
            and Product_ID <> 'CT'
        ) as X
      `;

      // Add quick search filter if provided
      if (quickSearch && quickSearch.trim() !== '') {
        strSQL += ` where (Item_ID like :quickSearchStart or Item_Name like :quickSearchAny)`;
      }

      const _data = await sequelizeMSQL.query(strSQL, {
        type: QueryTypes.SELECT,
        replacements: {
          itemType: itemType || '%',
          quickSearchStart: quickSearch ? `${quickSearch}%` : '',
          quickSearchAny: quickSearch ? `%${quickSearch}%` : ''
        },
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MasterFormulaItemGroupTemplateController;
