const listStatus = ["Approved"];

const getStatusCatatanTrial = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusCatatanTrial };
