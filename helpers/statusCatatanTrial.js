const listStatus = ["Menunggu Approve Manager", "Approved", "Closed"];

const getStatusCatatanTrial = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusCatatanTrial };
