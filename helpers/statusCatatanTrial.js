const listStatus = ["Menunggu Approve Manager", "Approved"];

const getStatusCatatanTrial = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusCatatanTrial };
