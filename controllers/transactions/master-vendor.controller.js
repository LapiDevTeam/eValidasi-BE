'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');

/**
 * GET /list
 * Returns all vendors, optionally filtered by status_aktif or search term.
 * Query params: search (optional), status_aktif (optional: '1'|'0')
 */
const getVendorList = async (req, res, next) => {
  try {
    const { search, status_aktif } = req.query;

    let query = `
      SELECT
        vendor_id,
        kode_vendor,
        nama_vendor,
        alamat,
        kota,
        telepon,
        email,
        pic_vendor,
        terdaftar_pg,
        no_fo_pg,
        status_aktif,
        created_by,
        CONVERT(nvarchar, created_date, 106) AS created_date,
        updated_by,
        CONVERT(nvarchar, updated_date, 106) AS updated_date
      FROM T_Kalibrasi_Master_Vendor
      WHERE 1 = 1
    `;

    const replacements = {};

    if (search) {
      query += ` AND (nama_vendor LIKE :search OR kode_vendor LIKE :search)`;
      replacements.search = `%${search}%`;
    }

    if (status_aktif !== undefined && status_aktif !== '') {
      query += ` AND status_aktif = :status_aktif`;
      replacements.status_aktif = status_aktif === '1' ? 1 : 0;
    }

    query += ` ORDER BY nama_vendor ASC`;

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in getVendorList:', error);
    next(error);
  }
};

/**
 * GET /detail
 * Returns a single vendor by vendor_id.
 * Query params: vendor_id (required)
 */
const getVendorDetail = async (req, res, next) => {
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      const err = new Error('vendor_id is required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT
        vendor_id,
        kode_vendor,
        nama_vendor,
        alamat,
        kota,
        telepon,
        email,
        pic_vendor,
        terdaftar_pg,
        no_fo_pg,
        status_aktif,
        created_by,
        CONVERT(nvarchar, created_date, 106) AS created_date,
        updated_by,
        CONVERT(nvarchar, updated_date, 106) AS updated_date
      FROM T_Kalibrasi_Master_Vendor
      WHERE vendor_id = :vendor_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { vendor_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!results.length) {
      const err = new Error('Vendor tidak ditemukan');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results[0],
    });
  } catch (error) {
    console.error('Error in getVendorDetail:', error);
    next(error);
  }
};

/**
 * POST /save
 * Create or update a vendor record.
 * Body: vendor_id (null = create), kode_vendor, nama_vendor, alamat, kota,
 *       telepon, email, pic_vendor, terdaftar_pg, no_fo_pg, status_aktif
 */
const saveVendor = async (req, res, next) => {
  try {
    const { user_id, nama_user } = req.user;
    const {
      vendor_id,
      kode_vendor,
      nama_vendor,
      alamat,
      kota,
      telepon,
      email,
      pic_vendor,
      terdaftar_pg,
      no_fo_pg,
      status_aktif,
    } = req.body;

    if (!kode_vendor || !nama_vendor) {
      const err = new Error('kode_vendor dan nama_vendor wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (!vendor_id) {
      // Check duplicate kode
      const checkQuery = `
        SELECT COUNT(*) AS cnt FROM T_Kalibrasi_Master_Vendor
        WHERE kode_vendor = :kode_vendor
      `;
      const checkResult = await sequelizeMSQL.query(checkQuery, {
        replacements: { kode_vendor },
        type: Sequelize.QueryTypes.SELECT,
      });
      if (checkResult[0]?.cnt > 0) {
        const err = new Error(`Kode vendor '${kode_vendor}' sudah terdaftar`);
        err.statusCode = 400;
        res.status(400).json({ success: false, message: err.message });
        next(err);
        return;
      }

      const insertQuery = `
        INSERT INTO T_Kalibrasi_Master_Vendor
          (kode_vendor, nama_vendor, alamat, kota, telepon, email, pic_vendor,
           terdaftar_pg, no_fo_pg, status_aktif, created_by, created_date)
        VALUES
          (:kode_vendor, :nama_vendor, :alamat, :kota, :telepon, :email, :pic_vendor,
           :terdaftar_pg, :no_fo_pg, :status_aktif, :created_by, SYSDATETIME())
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          kode_vendor,
          nama_vendor,
          alamat: alamat || null,
          kota: kota || null,
          telepon: telepon || null,
          email: email || null,
          pic_vendor: pic_vendor || null,
          terdaftar_pg: terdaftar_pg ? 1 : 0,
          no_fo_pg: no_fo_pg || null,
          status_aktif: status_aktif !== false ? 1 : 0,
          created_by: user_id,
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(200).json({ success: true, message: 'Vendor berhasil ditambahkan' });
    }

    // Update existing
    const updateQuery = `
      UPDATE T_Kalibrasi_Master_Vendor
      SET
        kode_vendor  = :kode_vendor,
        nama_vendor  = :nama_vendor,
        alamat       = :alamat,
        kota         = :kota,
        telepon      = :telepon,
        email        = :email,
        pic_vendor   = :pic_vendor,
        terdaftar_pg = :terdaftar_pg,
        no_fo_pg     = :no_fo_pg,
        status_aktif = :status_aktif,
        updated_by   = :updated_by,
        updated_date = SYSDATETIME()
      WHERE vendor_id = :vendor_id
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        vendor_id,
        kode_vendor,
        nama_vendor,
        alamat: alamat || null,
        kota: kota || null,
        telepon: telepon || null,
        email: email || null,
        pic_vendor: pic_vendor || null,
        terdaftar_pg: terdaftar_pg ? 1 : 0,
        no_fo_pg: no_fo_pg || null,
        status_aktif: status_aktif !== false ? 1 : 0,
        updated_by: user_id,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Vendor berhasil diperbarui' });
  } catch (error) {
    console.error('Error in saveVendor:', error);
    next(error);
  }
};

/**
 * DELETE /delete
 * Soft-delete (set status_aktif = 0) or hard-delete a vendor.
 * Query params: vendor_id (required)
 */
const deleteVendor = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { vendor_id } = req.query;

    if (!vendor_id) {
      const err = new Error('vendor_id is required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if vendor is used in any eksternal record
    const checkUsage = `
      SELECT COUNT(*) AS cnt
      FROM T_Kalibrasi_Eksternal
      WHERE vendor_id = :vendor_id
    `;
    const usageResult = await sequelizeMSQL.query(checkUsage, {
      replacements: { vendor_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (usageResult[0]?.cnt > 0) {
      // Soft-delete only when vendor is referenced
      const softDeleteQuery = `
        UPDATE T_Kalibrasi_Master_Vendor
        SET status_aktif = 0, updated_by = :updated_by, updated_date = SYSDATETIME()
        WHERE vendor_id = :vendor_id
      `;
      await sequelizeMSQL.query(softDeleteQuery, {
        replacements: { vendor_id, updated_by: user_id },
        type: Sequelize.QueryTypes.UPDATE,
      });
      return res.status(200).json({
        success: true,
        message: 'Vendor dinonaktifkan karena masih digunakan di data kalibrasi eksternal',
      });
    }

    const deleteQuery = `DELETE FROM T_Kalibrasi_Master_Vendor WHERE vendor_id = :vendor_id`;
    await sequelizeMSQL.query(deleteQuery, {
      replacements: { vendor_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Vendor berhasil dihapus' });
  } catch (error) {
    console.error('Error in deleteVendor:', error);
    next(error);
  }
};

module.exports = {
  getVendorList,
  getVendorDetail,
  saveVendor,
  deleteVendor,
};
