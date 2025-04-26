const { QueryTypes } = require('sequelize');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const MyError = require('../../helpers/errors');
const GlobalController = require('../global-controller');
const { getPagination, getPagingData } = require('../../helpers/pagination');
class MasterProductController {
  static async fetchProduct(req, res, next) {
    try {
      const { productCategory, isTemplate = 1 } = req.query;
      let viewName = 'vwProduct_template';

      if (!productCategory) throw new MyError(400, 'productCategory is required');

      if (isTemplate == 0) {
        viewName = 'vwProduct';
      }
      const sqlCode = `
      select A.Product_ID, Product_Name, Product_Category, Category_Name, Product_Currency, Currency_Description, Product_HPP, Product_HNA, Product_HTollIN, Product_HTollINFee, Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Unit_Description, Product_Type, Type_Name, Product_IntermediateID, Item_Name,A.Product_Init, Product_ExpTime, Product_SalesID, Product_BatchSize, [Product_Owner], Product_bahanAktif, Product_BentukSediaan, Product_Dosis, Product_Kemasan, Product_RuangLingkup,Product_Status,isnull(m_customer_product.cust_id,'')+'-'+isnull(cust_name,'') as customer, A.product_notppi, A.Sediaan_kode, A._kode_Product_RuangLingkup   , A.Kategori_prod, A.jenis_prod
      from ${viewName} as A
      left join m_customer_product on A.product_id = m_customer_product.product_id
      left join m_customer on m_customer.cust_id = m_Customer_Product.cust_id
      where A.isActive = 1 and product_category = :productCategory order by A.Product_ID
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory: productCategory || '',
        },
      });

      console.log(sqlCode, 8);

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchBentukSediaan(req, res, next) {
    try {
      const sqlCode = `
      select Sediaan_Nama, Sediaan_kode from m_product_sediaan where isActive = 1 order by Sediaan_Nama
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchRuangLingkup(req, res, next) {
    try {
      const { productCategory } = req.query;
      if (!productCategory) throw new MyError(400, 'productCategory is required');
      const sqlCode = `
      select Name, ID from m_product_ruanglingkup where isactive = 1 and category_id = :productCategory order by Name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory,
        },
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async fetchCustomer(req, res, next) {
    try {
      const { productCategory = '02' } = req.query;

      const sqlCode = `
      select Cust_Name, Cust_ID from m_Customer where isActive = 1 and Cust_Type like :productCategory order by cust_id
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          productCategory,
        },
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async addNewProduct(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, bagian_user } = req.user;

      if (!user_id || !bagian_user) return res.status(401).json({
        message: 'Unauthorized request!'
      });

      let {
        productCategory,
        productType,
        productUnit,
        productID,
        productName,
        productCurrency,
        productHPP,
        productHNA,
        productHTollIN,
        productHTollINFee,
        productVolumeInBox,
        productVolumeInBigBox,
        productIntermediateID = '',
        productBatchSize,
        productOwner,
        productBahanAktif,
        productBentukSediaan,
        productKemasan,
        productDosis,
        productRuangLingkup,
        productStatus,
        cdob01,
        cdob02,
        cdob03,
        customer,
        jenisProd,
        catProd,
        status,
        userName = user_id,
        delegatedTo = delegated_to,
      } = req.body;

      if (!productUnit) {
        return res.status(400).json({ message: 'Satuan terkecil Unit harus di isi!' });
      }

      if (!productType) {
        return res.status(400).json({ message: 'Type harus di isi!' });
      }

      if (!jenisProd) {
        return res.status(400).json({ message: 'Jenis Produk Harus di isi' });
      }

      if (!productID) {
        console.log({ objectasdasd: productID });
        const queryGetProduct = `
        SELECT TOP 1 isnull(product_id, '') as Product_ID FROM m_product_auto_number where pk_id > (select top 1 PK_ID From m_product_auto_number where product_id in (select top 1 product_id from m_Product_template where isnull(product_periode,'') = '' and len(product_id) = 2 order by pk_Id desc)) order by pk_id
        `;
        console.log({queryGetProduct});
        const [getProductID] = await sequelizeMSQL.query(queryGetProduct, {});
        if (getProductID.length === 0) {
          return res.status(400).json({ message: 'Gagal mendapatkan Product ID' });
        }
        console.log({ data: getProductID[0].Product_ID });
        productID = getProductID[0].Product_ID;
        console.log({ productID });
      }

      if (!productID && (productCategory === '02' || productType === 'IN')) {
        return res.status(400).json({ message: 'PRODUCT ID harus diisi !!' });
      }

      const existingProduct = await sequelizeMSQL.query(
        "select COUNT(*) as jum from m_Product_template where isnull(Product_Periode,'') = '' and Product_ID like :productID",
        {
          type: QueryTypes.SELECT,
          replacements: { productID: productID },
        }
      );

      if (existingProduct[0].jum >= 1) {
        return res.status(400).json({ message: `Kode Product : ${productID} Sudah ada dalam database, mohon periksa kembali!` });
      }

      if (productCategory === '02' && customer.substring(0, 2) !== productID.substring(0, 2)) {
        return res.status(400).json({ message: 'Kode Produk tidak valid' });
      }

      const existingIntermediate = await sequelizeMSQL.query(
        "select * from m_item_manufacturing_template where isnull(item_Periode,'') = '' and Item_ID = :productIntermediateID",
        {
          type: QueryTypes.SELECT,
          replacements: { productIntermediateID: productIntermediateID },
        }
      );
      console.log({ existingIntermediate });
      if (existingIntermediate.length === 0 && productType === 'IN') {
        const newPKID = await sequelizeMSQL.query(
          "select max(PK_ID) + 1 as pkid from m_Item_Manufacturing_template where isnull(item_Periode,'') = ''",
          { type: QueryTypes.SELECT }
        );

        const insertIntermediateSQL = `
          insert into m_item_manufacturing_template(PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, jenis_prod, CDOB_01, CDOB_02, CDOB_03)
          select top 1 :newPKID, :productIntermediateID, :productIntermediateName, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, :userName, GETDATE(), 1, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, jenis_prod, :cdob01, :cdob02, :cdob03
          from m_item_manufacturing_template where isnull(item_Periode,'') = '' and item_id like LEFT(:productIntermediateID, CASE WHEN CHARINDEX(' ', :productIntermediateID) > 0 THEN CHARINDEX(' ', :productIntermediateID) - 1 ELSE LEN(:productIntermediateID) END) + '%'
        `;

        await sequelizeMSQL.query(insertIntermediateSQL, {
          replacements: {
            newPKID: newPKID[0].pkid,
            productIntermediateID: productIntermediateID,
            productIntermediateName: productName,
            userName,
            cdob01,
            cdob02,
            cdob03,
          },
        });
      }

      const newProductPKID = await sequelizeMSQL.query(
        "select max(PK_ID) + 1 as pkid from m_Product_template where isnull(Product_Periode,'') = ''",
        { type: QueryTypes.SELECT }
      );

      const productInit = await GlobalController.getProductInit(productID);

      const insertProductSQL = `
        insert into m_Product_template (jenis_prod, Kategori_prod, PK_ID, Product_ID, Product_Init, Product_Name, Product_Category, Product_Currency, Product_HPP, Product_HNA, Product_HTollIN, Product_HTollINFee, Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Product_Type, Product_IntermediateID, isActive, User_ID, Delegated_To, Process_Date, Product_BatchSize, Product_owner, Product_bahanAktif, product_bentuksediaan, product_kemasan, product_dosis, product_ruanglingkup, product_status, CDOB_01, CDOB_02, CDOB_03, product_import)
        values (:jenisProd, :catProd, :newProductPKID, :productID, :productInit, :productName, :productCategory, :productCurrency, :productHPP, :productHNA, :productHTollIN, :productHTollINFee, :productVolumeInBox, :productVolumeInBigBox, :productUnit, :productType, :productIntermediateID, 1, :userName, :delegatedTo, GETDATE(), :productBatchSize, :productOwner, :productBahanAktif, :productBentukSediaan, :productKemasan, :productDosis, :productRuangLingkup, :productStatus, :cdob01, :cdob02, :cdob03, :productImport)
      `;

      await sequelizeMSQL.query(insertProductSQL, {
        replacements: {
          jenisProd,
          catProd,
          newProductPKID: newProductPKID[0].pkid,
          productID: productID,
          productInit,
          productName: productName,
          productCategory: productCategory,
          productCurrency: productCurrency,
          productHPP: productHPP,
          productHNA: productHNA,
          productHTollIN: productHTollIN,
          productHTollINFee: productHTollINFee,
          productVolumeInBox: productVolumeInBox,
          productVolumeInBigBox: productVolumeInBigBox,
          productUnit: productUnit,
          productType: productType,
          productIntermediateID: productIntermediateID,
          userName,
          delegatedTo,
          productBatchSize: productBatchSize,
          productOwner: bagian_user,
          productBahanAktif: productBahanAktif,
          productBentukSediaan: productBentukSediaan,
          productKemasan: productKemasan,
          productDosis: productDosis,
          productRuangLingkup: productRuangLingkup,
          productStatus,
          cdob01,
          cdob02,
          cdob03,
          productImport: productRuangLingkup === '04' || productRuangLingkup === '05' || productName.toUpperCase().includes('OBESLIM') ? 1 : 0,
        },
      });

      if (productCategory === '02') {
        const insertCustomerProductSQL = `
          insert into m_Customer_Product (Cust_ID, Product_ID, Product_Init, Process_Date, User_ID, isActive, Delegated_to)
          values (:customerID, :productID, :productInit, GETDATE(), :userName, 1, :delegatedTo)
        `;

        await sequelizeMSQL.query(insertCustomerProductSQL, {
          replacements: {
            customerID: customer.substring(0, 2),
            productID: productID,
            productInit,
            userName,
            delegatedTo,
          },
        });
      }

      res.status(200).json({ message: 'Product has been saved successfully' });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }

  static async getProductInit(productID) {
    const result = await sequelizeMSQL.query(
      'select (isNULL(max(Product_init),-1))+1 as INIT from m_product where Product_ID like :productID and isActive = 0',
      {
        type: QueryTypes.SELECT,
        replacements: { productID },
      }
    );
    return result[0].INIT;
  }

  static async updateProduct(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, bagian_user } = req.user;
      let {
        productID,
        productName,
        productCategory,
        productVolumeInBox,
        productVolumeInBigBox,
        productUnit,
        productType,
        productIntermediateID = '',
        productBahanAktif,
        productBentukSediaan,
        productKemasan,
        productDosis,
        productRuangLingkup,
        productStatus,
        catProd,
        productNotPPI,
        cdob01,
        cdob02,
        cdob03,
        jenisProd,
        userName = user_id,
        delegatedTo = delegated_to,
      } = req.body;

      if (typeof(productNotPPI) === "undefined" || productNotPPI === null) {
        return res.status(400).json({ message: 'productNotPPI is required!' });
      }

      if (!productUnit) {
        return res.status(400).json({ message: 'Satuan terkecil Unit harus di isi!' });
      }

      if (!productType) {
        return res.status(400).json({ message: 'Type harus di isi!' });
      }

      if (!jenisProd) {
        return res.status(400).json({ message: 'Jenis Produk Harus di isi' });
      }

      if (!productID) {
        return res.status(400).json({ message: 'PRODUCT ID harus diisi !!' });
      }

      const strCDOB_01 = cdob01 ? '01' : '';
      const strCDOB_02 = cdob02 ? '02' : '';
      const strCDOB_03 = cdob03 ? '03' : '';

      let strSQL = `
        update m_Product_template set
          jenis_prod = :jenisProd,
          Product_Name = :productName,
          Product_Category = :productCategory,
          Product_VolumeInBox = :productVolumeInBox,
          Product_VolumeInBigBox = :productVolumeInBigBox,
          Product_Unit = :productUnit,
          Product_Type = :productType,
          Product_IntermediateID = :productIntermediateID,
          USER_ID = :userName,
          Delegated_To = :delegatedTo,
          Process_Date = GETDATE(),
          product_bahanAktif = :productBahanAktif,
          product_bentuksediaan = :productBentukSediaan,
          product_kemasan = :productKemasan,
          product_dosis = :productDosis,
          product_ruanglingkup = :productRuangLingkup,
          product_status = :productStatus,
          Kategori_prod = :catProd,
          product_notppi = :productNotPPI,
          CDOB_01 = :strCDOB_01,
          CDOB_02 = :strCDOB_02,
          CDOB_03 = :strCDOB_03
      `;

      if (productRuangLingkup === '04' || productRuangLingkup === '05' || productName.toUpperCase().includes('OBESLIM')) {
        strSQL += ', product_import = 1';
      } else {
        strSQL += ', product_import = 0';
      }

      strSQL += `
        where isnull(Product_Periode,'') = '' and Product_ID like :productID and isActive = 1
      `;

      await sequelizeMSQL.query(strSQL, {
        replacements: {
          jenisProd,
          productName: productName,
          productCategory: productCategory,
          productVolumeInBox: parseInt(productVolumeInBox),
          productVolumeInBigBox: parseInt(productVolumeInBigBox),
          productUnit: productUnit,
          productType: productType,
          productIntermediateID: productIntermediateID,
          userName,
          delegatedTo,
          productBahanAktif: productBahanAktif,
          productBentukSediaan: productBentukSediaan,
          productKemasan: productKemasan,
          productDosis: productDosis,
          productRuangLingkup: productRuangLingkup,
          productStatus: productStatus,
          catProd,
          productNotPPI,
          strCDOB_01,
          strCDOB_02,
          strCDOB_03,
          productID: productID,
        },
      });

      res.status(200).json({ message: 'Product has been updated successfully' });
    } catch (error) {
      console.error('Error:', error);
      next(error);
    }
  }

  static async getMappingID(req, res, next) {
    try {
      const { productType } = req.query;
      if (!productType) {
        return res.status(400).json({ message: 'productType is required!' });
      }

      const result = await MasterProductController.queryItemID(productType);
      const resp = {
        data: result,
      };
      console.log({ data: result });
      res.status(200).json(resp);
    } catch (error) {
      next(error);
    }
  }

  static async approveProduct(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { user_id, delegated_to, nama_user } = req.user;
      const { productCategory, productID } = req.body;

      if (!productCategory) {
        return res.status(400).json({ message: 'productCategory dan productID harus di isi!' });
      }

      const canApprove = await MasterProductController.cekApproverLine(user_id);
      let sPeriode;
      let sGetDate;

      if (!canApprove) {
        return res.status(401).json({ message: 'Anda tidak memiliki akses untuk approve' });
      }

      const dateQuery = `
      SELECT REPLACE(CONVERT(VARCHAR(19), GETDATE(), 121), '-', '') AS vPeriode,
      CONVERT(VARCHAR, GETDATE(), 20) AS GetNow
      `;

      const dateResult = await sequelizeMSQL.query(dateQuery, {
        type: QueryTypes.SELECT,
        transaction,
      });

      sPeriode = dateResult[0]?.vPeriode;
      sGetDate = dateResult[0]?.GetNow;

      if (productCategory == '01') {
        let sSQLA = `
          UPDATE m_item_manufacturing
          SET USER_ID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete'
          WHERE REPLACE(Item_ID, ' ', '') IN (SELECT Product_ID FROM m_Product WHERE Product_Type = 'IN');
          DELETE FROM m_item_manufacturing
          WHERE REPLACE(Item_ID, ' ', '') IN (SELECT Product_ID FROM m_Product WHERE Product_Type = 'IN');
        `;

        let sSQLB = `
          INSERT INTO m_Item_Manufacturing (
            PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
            Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
            User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,
            Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
          )
          SELECT
            PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
            Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
            '${user_id}' AS User_ID, '${delegated_to}' AS Delegated_To, '${sGetDate}' AS Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,
            Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
          FROM m_Item_Manufacturing_template
          WHERE ISNULL(item_Periode, '') = ''
          AND REPLACE(Item_ID, ' ', '') IN (SELECT Product_ID FROM m_Product_template WHERE ISNULL(Product_Periode, '') = '' AND Product_Type = 'IN');
        `;

        let sSQLC = `
          INSERT INTO m_Item_Manufacturing_template (
            PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
            Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
            User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,
            Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, item_Periode,
            tgl_berlaku, user_approve, user_delegated
          )
          SELECT
            PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
            Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
            User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,
            Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row,
            '${sPeriode}', '${sGetDate}', '${user_id}', '${delegated_to}' AS user_delegated
          FROM m_Item_Manufacturing_template
          WHERE ISNULL(item_Periode, '') = ''
          AND REPLACE(Item_ID, ' ', '') IN (SELECT Product_ID FROM m_Product_template WHERE ISNULL(Product_Periode, '') = '' AND Product_Type = 'IN');
        `;

        await sequelizeMSQL.query(sSQLA, { transaction });
        await sequelizeMSQL.query(sSQLB, { transaction });
        await sequelizeMSQL.query(sSQLC, { transaction });
      }

      let sSQL1 = `
      UPDATE m_product_bahanaktif
      SET USER_ID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete'
      WHERE product_id IN (SELECT product_id FROM m_product WHERE Product_Category = '${productCategory}');
      DELETE FROM m_product_bahanaktif
      WHERE product_id IN (SELECT product_id FROM m_product WHERE Product_Category = '${productCategory}');
      UPDATE m_product_bahanaktif_template
      SET Product_Periode='${sPeriode}', Approve_date='${sGetDate}', User_Approve='${user_id}', User_Delegated='${delegated_to}'
      WHERE ISNULL(Product_Periode, '') = ''
      AND product_id IN (SELECT product_id FROM m_Product_template WHERE ISNULL(Product_Periode, '') = '' AND Product_Category = '${productCategory}');
    `;

      let sSQL2 = `
      INSERT INTO m_product_bahanaktif (PK_ID, Product_ID, Product_BahanAktif, Product_Dosis, User_id, Delegated_to, Process_date)
      SELECT PK_ID, Product_ID, Product_BahanAktif, Product_Dosis, '${user_id}' AS User_id, '${delegated_to}' AS Delegated_to, '${sGetDate}' AS Process_date
      FROM m_product_bahanaktif_template
      WHERE ISNULL(Product_Periode, '') = '${sPeriode}';
    `;

      let sSQL3 = `
      INSERT INTO m_product_bahanaktif_template (PK_ID, Product_ID, Product_BahanAktif, Product_Dosis, Product_Periode, Approve_date, User_Approve, User_Delegated, User_id, Delegated_to, Process_date)
      SELECT PK_ID, Product_ID, Product_BahanAktif, Product_Dosis, NULL AS Product_Periode, NULL AS Approve_date, NULL AS User_Approve, NULL AS User_Delegated, User_id, Delegated_to, Process_date
      FROM m_product_bahanaktif_template
      WHERE ISNULL(Product_Periode, '') = '${sPeriode}';
    `;

      let sSQL4 = `
      UPDATE m_Product
      SET USER_ID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete'
      WHERE Product_Category = '${productCategory}';
      DELETE FROM m_Product
      WHERE Product_Category = '${productCategory}';
      UPDATE m_Product_template
      SET Product_Periode='${sPeriode}', Approve_date='${sGetDate}', User_Approve='${user_id}', User_Delegated='${delegated_to}'
      WHERE ISNULL(Product_Periode, N'') = ''
      AND Product_Category = '${productCategory}';
    `;
      console.log({ sSQL4 });
      let sSQL5 = `
      INSERT INTO m_Product (Kategori_prod, Product_ID, Product_Init, Product_Name, jenis_prod, Product_Category, Product_Currency, Product_HPP, Product_HNA, Product_HTollin, Product_HTollInFee,
        Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Product_Type, Product_IntermediateID, isActive, User_ID, Delegated_To, Process_Date,
        Product_Sediaan, Product_ExpTime, Product_SalesID, Product_isPPA, Product_isPseudo, Product_isBuy, Product_Batchsize, Product_Location,
        Product_GroupSediaan, Product_GroupTargetRealisasi, Product_SalesName, Product_Status, Product_SalesHNA, Product_ShortName, Product_SalesUnit,
        Product_isSuplemen, Product_LabelQA, Product_RetainBigSuperUnit, Product_RetainKonversiBig, Product_RetainBigUnit, Product_RetainKonversi,
        Product_RetainSmallUnit, Product_SediaanPlanning, Product_Owner, product_import, Product_KonversiProduksiToSales, Product_bahanAktif,
        Product_PN_HK_PProcessing, Product_PN_HK_PKSekunder, Product_PN_HK_Produksi, Product_PN_HK_PPIProduksi, Product_versiBPOM, Product_NotPPI,
        Product_BentukSediaan, Product_Kemasan, Product_Dosis, Product_RuangLingkup, PK_ID, CDOB_01, CDOB_02, CDOB_03)
      SELECT Kategori_prod, Product_ID, Product_Init, Product_Name, jenis_prod, Product_Category, Product_Currency, Product_HPP, Product_HNA, Product_HTollin, Product_HTollInFee,
        Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Product_Type, Product_IntermediateID, isActive,
        '${user_id}' AS User_ID, '${delegated_to}' AS Delegated_To, '${sGetDate}' AS Process_Date,
        Product_Sediaan, Product_ExpTime, Product_SalesID, Product_isPPA, Product_isPseudo, Product_isBuy, Product_Batchsize, Product_Location,
        Product_GroupSediaan, Product_GroupTargetRealisasi, Product_SalesName, Product_Status, Product_SalesHNA, Product_ShortName, Product_SalesUnit,
        Product_isSuplemen, Product_LabelQA, Product_RetainBigSuperUnit, Product_RetainKonversiBig, Product_RetainBigUnit, Product_RetainKonversi,
        Product_RetainSmallUnit, Product_SediaanPlanning, Product_Owner, product_import, Product_KonversiProduksiToSales, Product_bahanAktif,
        Product_PN_HK_PProcessing, Product_PN_HK_PKSekunder, Product_PN_HK_Produksi, Product_PN_HK_PPIProduksi, Product_versiBPOM, Product_NotPPI,
        Product_BentukSediaan, Product_Kemasan, Product_Dosis, Product_RuangLingkup, PK_ID, CDOB_01, CDOB_02, CDOB_03
      FROM m_Product_template
      WHERE ISNULL(Product_Periode, N'') = '${sPeriode}'
      AND Product_Category = '${productCategory}';
    `;
      console.log({ sSQL5 });
      let sSQL6 = `
      INSERT INTO m_Product_template (Kategori_prod, Product_ID, Product_Init, Product_Name, jenis_prod, Product_Category, Product_Currency, Product_HPP, Product_HNA, Product_HTollin, Product_HTollInFee,
        Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Product_Type, Product_IntermediateID, isActive, User_ID, Delegated_To, Process_Date,
        Product_Sediaan, Product_ExpTime, Product_SalesID, Product_isPPA, Product_isPseudo, Product_isBuy, Product_Batchsize, Product_Location,
        Product_GroupSediaan, Product_GroupTargetRealisasi, Product_SalesName, Product_Status, Product_SalesHNA, Product_ShortName, Product_SalesUnit,
        Product_isSuplemen, Product_LabelQA, Product_RetainBigSuperUnit, Product_RetainKonversiBig, Product_RetainBigUnit, Product_RetainKonversi,
        Product_RetainSmallUnit, Product_SediaanPlanning, Product_Owner, product_import, Product_KonversiProduksiToSales, Product_bahanAktif,
        Product_PN_HK_PProcessing, Product_PN_HK_PKSekunder, Product_PN_HK_Produksi, Product_PN_HK_PPIProduksi, Product_versiBPOM, Product_NotPPI,
        Product_BentukSediaan, Product_Kemasan, Product_Dosis, Product_RuangLingkup, PK_ID, Product_Periode, CDOB_01, CDOB_02, CDOB_03, Approve_date, User_Approve, User_Delegated)
      SELECT Kategori_prod, Product_ID, Product_Init, Product_Name, jenis_prod, Product_Category, Product_Currency, Product_HPP, Product_HNA, Product_HTollin, Product_HTollInFee,
        Product_VolumeInBox, Product_VolumeInBigBox, Product_Unit, Product_Type, Product_IntermediateID, isActive, User_ID, Delegated_To, Process_Date,
        Product_Sediaan, Product_ExpTime, Product_SalesID, Product_isPPA, Product_isPseudo, Product_isBuy, Product_Batchsize, Product_Location,
        Product_GroupSediaan, Product_GroupTargetRealisasi, Product_SalesName, Product_Status, Product_SalesHNA, Product_ShortName, Product_SalesUnit,
        Product_isSuplemen, Product_LabelQA, Product_RetainBigSuperUnit, Product_RetainKonversiBig, Product_RetainBigUnit, Product_RetainKonversi,
        Product_RetainSmallUnit, Product_SediaanPlanning, Product_Owner, product_import, Product_KonversiProduksiToSales, Product_bahanAktif,
        Product_PN_HK_PProcessing, Product_PN_HK_PKSekunder, Product_PN_HK_Produksi, Product_PN_HK_PPIProduksi, Product_versiBPOM, Product_NotPPI,
        Product_BentukSediaan, Product_Kemasan, Product_Dosis, Product_RuangLingkup, PK_ID, NULL AS Product_Periode, CDOB_01, CDOB_02, CDOB_03, NULL AS Approve_date, NULL AS User_Approve, NULL AS User_Delegated
      FROM m_Product_template
      WHERE ISNULL(Product_Periode, N'') = '${sPeriode}'
      AND Product_Category = '${productCategory}';
    `;

      await sequelizeMSQL.query(sSQL1, { transaction });
      await sequelizeMSQL.query(sSQL2, { transaction });
      await sequelizeMSQL.query(sSQL3, { transaction });
      await sequelizeMSQL.query(sSQL4, { transaction });
      await sequelizeMSQL.query(sSQL5, { transaction });
      await sequelizeMSQL.query(sSQL6, { transaction });

      const lastApproveDate = null;

      const resp = {
        message: 'Product has been approved successfully',
        data: lastApproveDate,
      };

      await transaction.commit();
      return res.status(200).json(resp);
    } catch (error) {
      console.error('Error:', error);
      await transaction.rollback();
      const resp = {
        message: 'gagal approve product, produk sudah di approve sebelumnya',
        extraData: error?.message || 'internal server error',
      };
      return res.status(500).json(resp);
    }
  }

  static async getBahanAktif(req, res, next) {
    try {
      const { productID } = req.query;
      if (!productID) {
        return res.status(400).json({ message: 'productID is required!' });
      }

      const result = await MasterProductController.getBahanAktifByProuductID(productID);
      console.log({resulta: result});
      const resp = {
        message: 'OK',
        data: result,
      };
      res.status(200).json(resp);
    } catch (error) {
      console.log({error});
      next(error);
    }
  }

  static async getLastApproveDate(req, res, next) {
    try {
      const sqlQuery = `
        SELECT TOP 1 CONVERT(VARCHAR(20), Approve_date, 13) AS dtAppr
        FROM m_Product_template
        ORDER BY Approve_date DESC
      `;

      const result = await sequelizeMSQL.query(sqlQuery, {
        type: QueryTypes.SELECT,
      });

      const lastApproveDate = result.length > 0 ? result[0]?.dtAppr : '';
      const resp = {
        message: 'OK',
        data: { lastApproveDate },
      };
      res.status(200).json(resp);
    } catch (error) {
      console.error('Error fetching last approve date:', error);
      next(error);
    }
  }

  static async createBahanAktifByProductID(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { user_id, delegated_to } = req.user;
      const { productID, bahanAktif, dosis } = req.body;

      if (!bahanAktif || !dosis) {
        return res.status(400).json({ message: 'Harap isi data' });
      }

      const checkProductQuery = `
        SELECT COUNT(*) AS jum
        FROM m_Product_template
        WHERE ISNULL(Product_Periode, '') = ''
          AND Product_ID LIKE :productID
      `;

      const checkProductResult = await sequelizeMSQL.query(checkProductQuery, {
        replacements: { productID: productID },
        type: QueryTypes.SELECT,
      });

      if (checkProductResult[0].jum === 0) {
        return res.status(400).json({ message: 'Harap simpan produk terlebih dahulu!' });
      }

      const insertQuery = `
        INSERT INTO m_product_bahanaktif_template (PK_ID, Product_ID, Product_BahanAktif, Product_Dosis, User_id, Delegated_to, Process_Date)
        VALUES (
          (SELECT MAX(pk_id) + 1 FROM m_product_bahanaktif_template WHERE ISNULL(product_periode, '') = ''),
          :productID,
          :bahanAktif,
          :dosis,
          :userID,
          :delegatedTo,
          GETDATE()
        )
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          productID: productID,
          bahanAktif: bahanAktif,
          dosis: dosis,
          userID: user_id,
          delegatedTo: delegated_to,
        },
        transaction,
      });

      await transaction.commit();
      res.status(200).json({ message: 'Data has been saved successfully' });
    } catch (error) {
      console.error('Error:', error);
      await transaction.rollback();
      res.status(500).json({ message: 'Failed to save data', extraData: error.message || 'internal server error' });
    }
  }

  static async updateBahanAktifByProductID(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { user_id, delegated_to } = req.user;
      const { productID, pkID, bahanAktif, dosis } = req.body;

      if (!pkID) {
        return res.status(400).json({ message: 'Harap pilih data yang akan di-update' });
      }

      const updateQuery = `
        UPDATE m_product_bahanaktif_template
        SET User_id = :userID,
            Delegated_to = :delegatedTo,
            Process_Date = GETDATE(),
            Product_BahanAktif = :bahanAktif,
            Product_Dosis = :dosis
        WHERE ISNULL(product_periode, '') = ''
          AND pk_id = :pkID
          AND product_id = :productID
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          userID: user_id,
          delegatedTo: delegated_to,
          bahanAktif: bahanAktif,
          dosis: dosis,
          pkID: pkID,
          productID: productID,
        },
        transaction,
      });

      await transaction.commit();
      res.status(200).json({ message: 'Data has been updated successfully' });
    } catch (error) {
      console.error('Error:', error);
      await transaction.rollback();
      res.status(500).json({ message: 'Failed to update data', extraData: error.message || 'internal server error' });
    }
  }

  static async deleteBahanAktifByProductID(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { user_id, delegated_to } = req.user;
      const { productID, pkID } = req.body;

      if (!pkID) {
        return res.status(400).json({ message: 'Harap pilih data yang akan dihapus' });
      }

      const deleteQuery = `
        DELETE FROM m_product_bahanaktif_template
        WHERE ISNULL(product_periode, '') = ''
          AND pk_id = :pkID
          AND product_id = :productID
      `;

      await sequelizeMSQL.query(deleteQuery, {
        replacements: {
          pkID: pkID,
          productID: productID,
        },
        transaction,
      });

      await transaction.commit();
      res.status(200).json({ message: 'Data has been deleted successfully' });
    } catch (error) {
      console.error('Error:', error);
      await transaction.rollback();
      res.status(500).json({ message: 'Failed to delete data', extraData: error.message || 'internal server error' });
    }
  }

  static async generateDAProdukBAK(req, res, next) {
    try {
      const { productCategory } = req.body;

      if (!productCategory) {
        return res.status(400).json({ message: 'Product category is required!' });
      }

      let file;
      let query;

      if (productCategory === '01') {
        file = 'DA.RD.000001_Rev11.doc';
        query = `
          SELECT ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor, a.Product_ID, A.Product_Name,
                 ISNULL(A.Product_Kemasan, '-') AS kemasan, ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
                 'bahan aktif' AS bahan_aktif, 'dosis' AS dosis, ISNULL(product_ruanglingkup, '-') AS product_ruanglingkup,
                 CASE WHEN ISNULL(Product_Unit, '(none)') = '(none)' THEN '-' ELSE product_unit END AS Product_Unit,
                 ISNULL(Product_VolumeInBox, 0) AS Product_VolumeInBox, ISNULL(Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
                 CASE WHEN product_notppi = 1 THEN '-' ELSE 'Ada' END AS customer, ISNULL(product_status, '-') AS product_status,
                 A.Kategori_prod
          FROM vwProduct_template A
          WHERE A.Product_name NOT LIKE 'Granulat%' AND A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY A.PK_ID
        `;
      } else {
        file = 'DA.RD.000026.doc';
        query = `
          SELECT ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor, a.Product_ID, A.Product_Name,
                 ISNULL(A.Product_Kemasan, '-') AS kemasan, ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
                 'bahan aktif' AS bahan_aktif, 'dosis' AS dosis, ISNULL(product_ruanglingkup, '-') AS product_ruanglingkup,
                 CASE WHEN ISNULL(Product_Unit, '(none)') = '(none)' THEN '-' ELSE product_unit END AS Product_Unit,
                 ISNULL(Product_VolumeInBox, 0) AS Product_VolumeInBox, ISNULL(Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
                 ISNULL(C.Cust_Name, '-') AS customer
          FROM vwProduct_template A
          LEFT JOIN m_Customer_Product B ON A.Product_ID = B.Product_ID
          LEFT JOIN m_Customer C ON C.Cust_ID = B.Cust_ID
          WHERE A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY PK_ID
        `;
      }

      const result = await sequelizeMSQL.query(query, {
        replacements: { productCategory },
        type: QueryTypes.SELECT,
      });

      if (result.length === 0) {
        return res.status(404).json({ message: 'No data found' });
      }

      // const path = await copyTemplate(file);

      // await insertDataIntoWordDocument(path, result);

      res.status(200).json({
         message: 'OK',
         data: result,
        });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Failed to export file', extraData: error.message || 'internal server error' });
    }
  }

  static async generateDAProduk(req, res, next) {
    console.log('MASUK SINI --------------------------->');
    try {
      const { productCategory, page = 0, size = 10, isTemplate = 'true' } = req.query;

      if (!productCategory) {
        return res.status(400).json({ message: 'Product category is required!' });
      }

      const { limit, offset } = getPagination(parseInt(page), parseInt(size));

      let file;
      let queryString;
      let countString;
      let tableName = 'vwProduct_template';
      if (isTemplate !== 'true') tableName = 'vwProduct';
      console.log({tableName});
      if (productCategory === '01') {
        file = 'DA.RD.000001_Rev11.doc';
        queryString = `
          SELECT * FROM (
            SELECT ROW_NUMBER() OVER (ORDER BY A.PK_ID ASC) AS RowNum, a.Product_ID, A.Product_Name,
                   ISNULL(A.Product_Kemasan, '-') AS kemasan, ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
                   'bahan aktif' AS bahan_aktif, 'dosis' AS dosis, ISNULL(product_ruanglingkup, '-') AS product_ruanglingkup,
                   CASE WHEN ISNULL(Product_Unit, '(none)') = '(none)' THEN '-' ELSE product_unit END AS Product_Unit,
                   ISNULL(Product_VolumeInBox, 0) AS Product_VolumeInBox, ISNULL(Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
                   CASE WHEN product_notppi = 1 THEN '-' ELSE 'Ada' END AS customer, ISNULL(product_status, '-') AS product_status,
                   A.Kategori_prod
            FROM ${tableName} A
            WHERE A.Product_name NOT LIKE 'Granulat%' AND A.isActive = 1 AND A.product_category = :productCategory
          ) AS Result
          WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit
          ORDER BY RowNum;
        `;
        countString = `
          SELECT COUNT(*) AS count
          FROM ${tableName} A
          WHERE A.Product_name NOT LIKE 'Granulat%' AND A.isActive = 1 AND A.product_category = :productCategory
        `;
      } else {
        file = 'DA.RD.000026.doc';
        queryString = `
          SELECT * FROM (
            SELECT ROW_NUMBER() OVER (ORDER BY A.PK_ID ASC) AS RowNum, a.Product_ID, A.Product_Name,
                   ISNULL(A.Product_Kemasan, '-') AS kemasan, ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
                   'bahan aktif' AS bahan_aktif, 'dosis' AS dosis, ISNULL(product_ruanglingkup, '-') AS product_ruanglingkup,
                   CASE WHEN ISNULL(Product_Unit, '(none)') = '(none)' THEN '-' ELSE product_unit END AS Product_Unit,
                   ISNULL(Product_VolumeInBox, 0) AS Product_VolumeInBox, ISNULL(Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
                   ISNULL(C.Cust_Name, '-') AS customer
            FROM ${tableName} A
            LEFT JOIN m_Customer_Product B ON A.Product_ID = B.Product_ID
            LEFT JOIN m_Customer C ON C.Cust_ID = B.Cust_ID
            WHERE A.isActive = 1 AND A.product_category = :productCategory
          ) AS Result
          WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit
          ORDER BY RowNum;
        `;
        countString = `
          SELECT COUNT(*) AS count
          FROM ${tableName} A
          LEFT JOIN m_Customer_Product B ON A.Product_ID = B.Product_ID
          LEFT JOIN m_Customer C ON C.Cust_ID = B.Cust_ID
          WHERE A.isActive = 1 AND A.product_category = :productCategory
        `;
      }

      const result = await sequelizeMSQL.query(queryString, {
        replacements: { productCategory, offset, limit },
        type: QueryTypes.SELECT,
      });

      const [total] = await sequelizeMSQL.query(countString, {
        replacements: { productCategory },
        type: QueryTypes.SELECT,
      });

      const data = {
        rows: result,
        count: total?.count || 0
      };

      const response = getPagingData(data, page, limit);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error:', error, '@generateDAProduk');
      res.status(500).json({ message: 'Failed to export file', extraData: error.message || 'internal server error' });
    }
  }

  static async getDAProdukContent(req, res, next) {
    try {
      const { productCategory } = req.query;
      if (!productCategory) {
        return res.status(400).json({ message: 'Product category is required!' });
      }

      let file;
      let noRevisi = ''
      let queryString;
      let tableName = 'vwProduct_template';
      if (productCategory === '01') {
        file = 'DA.RD.000001';
        noRevisi = '40';
        queryString = `
          SELECT
            ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor,
            A.Product_ID,
            A.Product_Name,
            ISNULL(A.Product_Kemasan, '-') AS kemasan,
            ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
            ISNULL(A.product_ruanglingkup, '-') AS product_ruanglingkup,
            CASE WHEN ISNULL(A.Product_Unit, '(none)') = '(none)' THEN '-' ELSE A.product_unit END AS Product_Unit,
            ISNULL(A.Product_VolumeInBox, 0) AS Product_VolumeInBox,
            ISNULL(A.Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
            CASE WHEN A.product_notppi = 1 THEN '-' ELSE 'Ada' END AS customer,
            ISNULL(A.product_status, '-') AS product_status,
            A.Kategori_prod
          FROM ${tableName} A
          WHERE A.Product_name NOT LIKE 'Granulat%' AND A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY A.PK_ID
        `;
      } else {
        file = 'DA.RD.000026';
        noRevisi = '20'
        queryString = `
          SELECT
            ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor,
            A.Product_ID,
            A.Product_Name,
            ISNULL(A.Product_Kemasan, '-') AS kemasan,
            ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
            ISNULL(A.product_ruanglingkup, '-') AS product_ruanglingkup,
            CASE WHEN ISNULL(A.Product_Unit, '(none)') = '(none)' THEN '-' ELSE A.product_unit END AS Product_Unit,
            ISNULL(A.Product_VolumeInBox, 0) AS Product_VolumeInBox,
            ISNULL(A.Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
            ISNULL(C.Cust_Name, '-') AS customer
          FROM ${tableName} A
          LEFT JOIN m_Customer_Product B ON A.Product_ID = B.Product_ID
          LEFT JOIN m_Customer C ON C.Cust_ID = B.Cust_ID
          WHERE A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY A.PK_ID
        `;
      }

      // Fetch main product data
      const products = await sequelizeMSQL.query(queryString, {
        replacements: { productCategory },
        type: QueryTypes.SELECT,
      });

      // For each product, fetch its bahan aktif & dosis
      for (let i = 0; i < products.length; i++) {
        const productID = products[i].Product_ID;
        const bahanAktifQuery = `
          SELECT Product_BahanAktif, Product_Dosis
          FROM m_product_bahanaktif_template
          WHERE ISNULL(Product_Periode, '') = '' AND Product_ID = :productID
          ORDER BY PK_ID ASC
        `;
        const bahanAktifRows = await sequelizeMSQL.query(bahanAktifQuery, {
          replacements: { productID },
          type: QueryTypes.SELECT,
        });

        products[i].bahan_aktif_detail = bahanAktifRows.map(
          row => `- ${row.Product_BahanAktif?.toString().trim().replace(/\s+/g, ' ') || ''} (${row.Product_Dosis?.toString().trim().replace(/\s+/g, ' ') || ''})`
        );
      }

      return res.status(200).json({
        message: 'OK',
        fileTemplate: file,
        noRevisi,
        data: products,
      });
    } catch (error) {
      console.error('Error:', error, '@getDAProdukContent');
      res.status(500).json({ message: 'Failed to get DA Produk content', extraData: error.message || 'internal server error' });
    }
  }

  static async getDAProdukContentORI(req, res, next) {
    try {
      const { productCategory } = req.query;
      if (!productCategory) {
        return res.status(400).json({ message: 'Product category is required!' });
      }

      let file;
      let queryString;
      let tableName = 'vwProduct';
      if (productCategory === '01') {
        file = 'DA.RD.000001_Rev11.doc';
        queryString = `
          SELECT
            ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor,
            A.Product_ID,
            A.Product_Name,
            ISNULL(A.Product_Kemasan, '-') AS kemasan,
            ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
            ISNULL(A.product_ruanglingkup, '-') AS product_ruanglingkup,
            CASE WHEN ISNULL(A.Product_Unit, '(none)') = '(none)' THEN '-' ELSE A.product_unit END AS Product_Unit,
            ISNULL(A.Product_VolumeInBox, 0) AS Product_VolumeInBox,
            ISNULL(A.Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
            CASE WHEN A.product_notppi = 1 THEN '-' ELSE 'ada' END AS customer,
            ISNULL(A.product_status, '-') AS product_status,
            A.Kategori_prod
          FROM ${tableName} A
          WHERE A.Product_name NOT LIKE 'Granulat%' AND A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY A.PK_ID
        `;
      } else {
        file = 'DA.RD.000026.doc';
        queryString = `
          SELECT
            ROW_NUMBER() OVER(ORDER BY A.PK_ID ASC) AS Nomor,
            A.Product_ID,
            A.Product_Name,
            ISNULL(A.Product_Kemasan, '-') AS kemasan,
            ISNULL(A.Product_BentukSediaan, '-') AS bentukSediaan,
            ISNULL(A.product_ruanglingkup, '-') AS product_ruanglingkup,
            CASE WHEN ISNULL(A.Product_Unit, '(none)') = '(none)' THEN '-' ELSE A.product_unit END AS Product_Unit,
            ISNULL(A.Product_VolumeInBox, 0) AS Product_VolumeInBox,
            ISNULL(A.Product_VolumeInBigBox, 0) AS Product_VolumeInBigBox,
            ISNULL(C.Cust_Name, '-') AS customer
          FROM ${tableName} A
          LEFT JOIN m_Customer_Product B ON A.Product_ID = B.Product_ID
          LEFT JOIN m_Customer C ON C.Cust_ID = B.Cust_ID
          WHERE A.isActive = 1 AND A.product_category = :productCategory
          ORDER BY A.PK_ID
        `;
      }

      // Fetch main product data
      const products = await sequelizeMSQL.query(queryString, {
        replacements: { productCategory },
        type: QueryTypes.SELECT,
      });

      // For each product, fetch its bahan aktif & dosis from m_product_bahanaktif (not _template)
      for (let i = 0; i < products.length; i++) {
        const productID = products[i].Product_ID;
        const bahanAktifQuery = `
          SELECT Product_BahanAktif, Product_Dosis
          FROM m_product_bahanaktif
          WHERE Product_ID = :productID
          ORDER BY PK_ID ASC
        `;
        const bahanAktifRows = await sequelizeMSQL.query(bahanAktifQuery, {
          replacements: { productID },
          type: QueryTypes.SELECT,
        });

        // Format as array of string: "-BahanAktif (Dosis)", sanitize whitespace
        products[i].bahan_aktif_detail = bahanAktifRows.map(
          row => `- ${row.Product_BahanAktif?.toString().trim().replace(/\s+/g, ' ') || ''} (${row.Product_Dosis?.toString().trim().replace(/\s+/g, ' ') || ''})`
        );
      }

      return res.status(200).json({
        message: 'OK',
        fileTemplate: file,
        data: products,
      });
    } catch (error) {
      console.error('Error:', error, '@getDAProdukExportContent');
      res.status(500).json({ message: 'Failed to get DA Produk export content', extraData: error.message || 'internal server error' });
    }
  }

  static async deleteProduct(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { productID } = req.body;

      if (!productID) {
        return res.status(400).json({ message: 'PRODUCT ID harus diisi !!' });
      }

      const checkFormulaQuery = `
        SELECT * FROM m_PPI_Header
        WHERE PPI_ProductID = :productID
          AND isActive = 1
      `;

      const formulaResult = await sequelizeMSQL.query(checkFormulaQuery, {
        replacements: { productID: productID.trim() },
        type: QueryTypes.SELECT,
      });

      if (formulaResult.length > 0) {
        return res.status(400).json({ message: 'Master product sudah ada di formula, tidak bisa di hapus, harap hapus formula jika ingin hapus produk' });
      }

      const checkRetainedQuery = `
        SELECT DISTINCT prodid FROM t_Retained
        UNION
        SELECT DISTINCT prodid FROM t_Retained_2
        UNION
        SELECT DISTINCT prodid FROM t_Retained_sup
      `;

      const retainedResult = await sequelizeMSQL.query(checkRetainedQuery, {
        type: QueryTypes.SELECT,
      });

      let deleteQuery;
      if (retainedResult.length > 0) {
        deleteQuery = `
          UPDATE m_product_template
          SET isActive = 0
          WHERE product_id = :productID
        `;
      } else {
        deleteQuery = `
          DELETE FROM m_Product_template
          WHERE ISNULL(Product_Periode, '') = ''
            AND product_id LIKE :productID;
          DELETE FROM m_product_bahanaktif_template
          WHERE ISNULL(Product_Periode, '') = ''
            AND product_id LIKE :productID
        `;
      }

      await sequelizeMSQL.query(deleteQuery, {
        replacements: { productID: productID.trim() },
        transaction,
      });

      await transaction.commit();
      res.status(200).json({ message: 'Data has been deleted successfully' });
    } catch (error) {
      console.error('Error:', error);
      await transaction.rollback();
      res.status(500).json({ message: 'Failed to delete data', extraData: error.message || 'internal server error' });
    }
  }

  static async getBahanAktifByProuductID(productID) {
    if (!productID) {
        return null;
    }

    const query = `
        SELECT PK_ID, Product_ID, Product_BahanAktif, Product_Dosis
        FROM m_product_bahanaktif_template
        WHERE ISNULL(product_periode, '') = ''
        AND product_id = :productID
        ORDER BY 1
    `;

    try {
        const result = await sequelizeMSQL.query(query, {
            replacements: { productID },
            type: sequelizeMSQL.QueryTypes.SELECT
        });

        console.log({result});
        if (result.length === 0) {
            return null;
        }

        return result.map(row => ({
            PK_ID: row.PK_ID,
            Product_ID: row.Product_ID,
            Product_BahanAktif: row.Product_BahanAktif,
            Product_Dosis: row.Product_Dosis
        }));
    } catch (error) {
        return null;
    }
  }

  static async queryItemID(productType) {
    if (productType === 'IN') {
      const strSQL = `
        SELECT Item_ID, Group_Type, Item_Name, Item_Size, Item_Description, item_unit,
               item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime,
               item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate,
               item_status
        FROM vwM_ItemWithGroup_template
        WHERE isActive = 1 AND Item_Name LIKE 'GRANULAT%'
      `;

      try {
        const grecLister = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });

        const itemIDs = [];
        if (grecLister.length > 0) {
          grecLister.forEach((item) => {
            itemIDs.push({
              itemID: item.Item_ID,
              itemName: item.Item_Name,
              master: item.Group_Type,
              satuan: item.item_unit,
            });
          });

          return itemIDs;
        } else {
          throw new Error('Data Not Found!');
        }
      } catch (error) {
        throw new Error(error.message);
      }
    } else {
      throw new Error('Hanya untuk PRODUK ANTARA !!!');
    }
  }

  static cekApproverLine = async (user_id) => {
    const sqlQuery = `
      SELECT TOP 1 Appr_Identity
      FROM m_Approver_Lines
      WHERE isActive = 1
        AND Appr_ApplicationCode LIKE 'PRODUCT'
        AND Appr_ID LIKE :userID
    `;

    const result = await sequelizeMSQL.query(sqlQuery, {
      type: QueryTypes.SELECT,
      replacements: { userID: user_id },
    });

    return result.length > 0;
  };

  static async showLastApproveDate() {
    try {
      const sqlQuery = `
        SELECT TOP 1 CONVERT(VARCHAR(20), Approve_date, 13) AS dtAppr
        FROM m_Product_template
        ORDER BY Approve_date DESC
      `;

      const result = await sequelizeMSQL.query(sqlQuery, {
        type: QueryTypes.SELECT,
      });

      return result.length > 0 ? result[0].dtAppr : '';
    } catch (error) {
      console.error('Error fetching last approve date:', error);
      throw error;
    }
  }

  static async getGeneratedLink(req, res, next) {
    try {
      const { user_id, delegated_to } = req.user;
      let { psn, id, tgl, fileN, uid = user_id, did = delegated_to, token } = req.query;

      if(!user_id) throw new MyError(401, 'not authorized');

      if (!psn || !id || !tgl || !fileN ) {
        throw new MyError(400, 'All query parameters are required');
      }

      const execSP = await sequelizeMSQL.query(`SELECT dbo.fnGetToken('${user_id}') AS Token`, {
        type: QueryTypes.SELECT,
      });

      token = execSP[0].Token;
      if (!token || token === '') {
        throw new MyError(500, 'Failed to generate token');
      }

      const link = MasterProductController.generateLink(psn, id, tgl, fileN, uid, did, token);

      res.status(200).json({ link });
    } catch (error) {
      next(error);
    }
  }

  static generateLink(psn, id, tgl, fileN, uid, did, token) {
    const urlEprintHub = process.env.EPRINTHUB_ENDPOINT || 'http://192.168.1.39:8080/eprinthub/PrintOffice.aspx'
    return `${urlEprintHub}?psn=${psn}&id=${id}&tgl=${tgl}&FileN=${fileN}&UID=${uid}&DID=${did}&Token=${token}`;
  }

  static async getCDOBstatus(req, res, next) {
    try {
      const {productID, isTemplate} = req.query;
      let tableName = 'm_product';

      if (isTemplate) tableName = 'm_product_template';
      console.log('MASUK');
      if (!productID) return res.status(400).send('missing required parameters!');

      const strSQL = `SELECT ISNULL(A.CDOB_01, '') as CDOB_01, ISNULL(A.CDOB_02, '') as CDOB_02, ISNULL(A.CDOB_03, '') as CDOB_03
                FROM ${tableName} A
                WHERE product_ID = :productID
                ${isTemplate ? "AND ISNULL(A.product_periode, '') = ''" : ''}`;

      const result = await sequelizeMSQL.query(strSQL, {
        replacements: {
          productID
        }
      })

      const resp = {
        message: 'OK'
      }
      if (!result || result.length <= 0 ) {
        resp['data'] = null;
      }

      resp['data'] = result[0]

      return res.status(200).json(resp);

    } catch (error) {
      console.log({error});
      const resp = {
        message: 'Internal server error',
        details: error?.message
      }
      return res.status(500).json(resp)
    }
  }
}

module.exports = MasterProductController;
