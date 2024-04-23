const configMssql = {
  user: process.env.MS_SQL_DB_USER,
  password: process.env.MS_SQL_DB_PWD,
  server: process.env.MS_SQL_DB_SERVER,
  database: process.env.MS_SQL_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
const {
  t_protokolSkalaLab_status,
  t_productBrief_status,
  t_catatanTrial_status,
  t_formulaFix_status,
} = require("../models/index");

//check table status protokol
const checkStatusProductBrief = async (id) => {
  let apprNo = 1;
  const checkStatus = await t_productBrief_status.findAll({
    where: {
      ProductBriefId: id,
      is_approve: true,
    },
    order: [["approver_no", "DESC"]],
  });
  if (checkStatus.length) apprNo = checkStatus[0]?.approver_no + 1;
  return apprNo;
};
//check table status protokol
const checkStatusProtokol = async (id) => {
  let apprNo = 1;
  const checkStatus = await t_protokolSkalaLab_status.findAll({
    where: {
      ProtokolTrialSkalaLabID: id,
      is_approve: true,
    },
    order: [["approver_no", "DESC"]],
  });
  if (checkStatus.length) apprNo = checkStatus[0]?.approver_no + 1;
  return apprNo;
};
const checkStatusCatatanTrial = async (id) => {
  let apprNo = 1;
  const checkStatus = await t_catatanTrial_status.findAll({
    where: {
      CatatanTrialID: id,
      is_approve: true,
    },
    order: [["approver_no", "DESC"]],
  });
  if (checkStatus.length) apprNo = checkStatus[0]?.approver_no + 1;
  return apprNo;
};
const checkStatusFormulaFix = async (id) => {
  let apprNo = 1;
  const checkStatus = await t_formulaFix_status.findAll({
    where: {
      FormulaFixID: id,
      is_approve: true,
    },
    order: [["approver_no", "DESC"]],
  });
  if (checkStatus.length) apprNo = checkStatus[0]?.approver_no + 1;
  return apprNo;
};

module.exports = {
  checkStatusProductBrief,
  checkStatusProtokol,
  checkStatusCatatanTrial,
  checkStatusFormulaFix,
};
