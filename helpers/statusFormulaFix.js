const listStatus = ["Approved", "Menunggu Approve RD3", "Menunggu Approve HD"];

const getStatusFormulaFix = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusFormulaFix };
