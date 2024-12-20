const { QueryTypes } = require("sequelize");
const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const MyError = require("../../helpers/errors");

class MasterProductController {
  static async fetchProduct(req, res, next) {
    try {
      const { productCategory } = req.query;
      if(!productCategory) throw new MyError(400, "productCategory is required");

      const sqlCode = `
        select A.Product_ID, Product_Name, Product_Category, Category_Name, Product_Currency, Currency_Description, Product_HPP, Product_HNA, Product_HTollIN, Product_HTollINFee, Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Unit_Description, Product_Type, Type_Name, Product_IntermediateID, Item_Name,A.Product_Init, Product_ExpTime, Product_SalesID, Product_BatchSize, [Product_Owner], Product_bahanAktif, Product_BentukSediaan, Product_Dosis, Product_Kemasan, Product_RuangLingkup,Product_Status,isnull(m_customer_product.cust_id,'')+'-'+isnull(cust_name,'') as customer, A.product_notppi, A.Sediaan_kode, A._kode_Product_RuangLingkup   , A.Kategori_prod, A.jenis_prod  
      from vwProduct_template as A  
      left join m_customer_product on A.product_id = m_customer_product.product_id 
      left join m_customer on m_customer.cust_id = m_Customer_Product.cust_id 
      where A.isActive = 1 and product_category = :productCategory order by A.Product_ID
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory: productCategory || "" ,
        },
      });

      console.log(sqlCode,8);
      
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
  static async fetchBentukSediaan(req, res, next) {
    try {
      const sqlCode = `
      select Sediaan_Nama, Sediaan_kode from m_product_sediaan where isActive = 1 order by Sediaan_Nama
      `
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      })

      res.status(200).json({ data: _data })
    } catch (error) {
      next(error)
    }
  }

  static async fetchRuangLingkup(req, res, next) {
    try {
      const {productCategory} = req.query
      if(!productCategory) throw new MyError(400, "productCategory is required");
      const sqlCode =`
      select Name, ID from m_product_ruanglingkup where isactive = 1 and category_id = :productCategory order by Name
      `
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory
        }
      })
      
      res.status(200).json({ data: _data })
    } catch (error) {
      next(error)
    }
  }

  static async fetchCustomer(req, res, next) {
    try {
      const {productCategory} = req.query
      if(!productCategory) throw new MyError(400, "productCategory is required");
      const sqlCode =`
      select Cust_Name, Cust_ID from m_Customer where isActive = 1 and Cust_Type like :productCategory order by cust_id
      `
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory
        }
      })
      
      res.status(200).json({ data: _data })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = MasterProductController;
