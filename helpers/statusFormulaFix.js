const listStatus = ["Approved"];

const getStatusFormulaFix = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusFormulaFix };
