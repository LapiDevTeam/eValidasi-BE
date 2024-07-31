const listStatus = ["Menunggu Approve Manager", "Approved"];

const getStatusProposalDiversifikasi = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusProposalDiversifikasi };
