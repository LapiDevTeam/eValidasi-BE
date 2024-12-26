const sql = require("mssql");
const { configMssql } = require("../config/configMssql");
const MyError = require("../helpers/errors");
const { sequelizeMSQL } = require("../config/config.sequelize.dbmssql");
const { QueryTypes } = require("sequelize");

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

  static async fetchBpomItem(req, res, next) {
    try {
      const { item_name } = req.query;
      const sqlCode = `
      SELECT item_name as NAMA_GENERIK , item_id as KODE FROM m_BPOM_item where isActive = 1 and item_name like '%${
        item_name || ""
      }%' ORDER BY item_name ASC`;

      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchItemUnit(req, res, next) {
    try {
      const { withDescripton } = req.query;
      const pool = await sql.connect(configMssql);
      const queryCode = withDescripton ? `Select Unit_ID, Unit_Description from m_unit where isActive = 1`:`SELECT unit_id FROM m_unit WHERE unit_ID <> '(none)'`;
      const request = pool.request();
      const result1 = await request.query(queryCode);

      const _data = result1.recordset;
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchDPBADetail(req, res, next) {
    try {
      const { Item_ID } = req.query;
      const pool = await sql.connect(configMssql);
      const queryCode = `
        SELECT A.Item_ID, B.Item_Name, B.item_bpomgenerik, F.Item_Name as Item_generikname, A.Item_PrcID,C.PRc_Name, A.Item_BPOMNegara, E.Country_Name, D.Supp_ID, D.Supp_Name, A.IsActive,A.IsDefault,A.Item_Revision, convert(varchar(10),A.input_date ,111) as input_date, case when isnull(A.item_ishalal,0) = 0 then 'Non Halal' else 'Halal' end as  isHalal,A.Lembaga, A.Nomor_sertifikat, A.Masa_berlaku_date, A.Dok_Pendukung   from m_Item_Manufacturing_Supplier as A left join m_Item_Manufacturing as B on B.Item_ID = A.Item_ID left join m_Principle as C on C.Prc_ID = A.ITem_PrcID left join m_Supplier D on D.Supp_ID = A.Item_SuppID left join (select * From m_BPOM_Region where isActive = 1) E on E.Country_ID = A.Item_BPOMNegara left join (select * from m_BPOM_item where isActive = 1) F on F.Item_ID = B.Item_BPOMGenerik 
      where A.Item_ID = '${Item_ID}' and A.isactive = 1 and B.isActive = 1`;
      const request = pool.request();
      const result1 = await request.query(queryCode);

      const _data = result1.recordset;
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
  static async fetchPrinciple(req, res, next) {
    try {
      const { prcName } = req.query;
      const sqlCode = `
        Select Prc_Name,Prc_ID from m_Principle where isActive=1 and Prc_name like :prcName order by prc_name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          prcName: `%${prcName || ""}%`,
        },
      });
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchNegaraAsal(req, res, next) {
    try {
      const { namaNegara } = req.query;
      const sqlCode = ` 
      select COUNTRY_NAME, COUNTRY_ID From m_BPOM_REGION WHERE ISACTIVE = 1 and country_name like :namaNegara order by country_name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          namaNegara: `%${namaNegara || ""}%`,
        },
      });
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchSupplier(req, res, next) {
    try {
      const { suppName } = req.query;
      const sqlCode = `
      select supp_name, Supp_ID from m_Supplier WHERE isActive = 1 and supp_name like :suppName order by supp_name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          suppName: `%${suppName || ""}%`,
        },
      });
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GlobalController;
