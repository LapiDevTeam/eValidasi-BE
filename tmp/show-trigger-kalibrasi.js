const { sequelizeMSQL } = require('./config/config.sequelize.dbmssql');

(async () => {
  try {
    const rows = await sequelizeMSQL.query(
      "SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.trigger_T_Kalibrasi_Permohonan_INSERT')) AS def",
      { type: sequelizeMSQL.QueryTypes.SELECT }
    );

    console.log(rows[0] && rows[0].def ? rows[0].def : 'NO_DEF');
  } catch (e) {
    console.error('TRIGGER_READ_FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    try { await sequelizeMSQL.close(); } catch (_) {}
  }
})();
