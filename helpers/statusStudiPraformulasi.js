const listStatus = ["Menunggu Approve RD3", "Menunggu Approve HD"];

const getStatusStudiPraformulasi = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusStudiPraformulasi };
