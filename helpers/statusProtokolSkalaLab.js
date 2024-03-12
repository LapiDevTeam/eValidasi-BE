const listStatus = [
  // "Menunggu Approve RD1/RD2",
  "Menunggu Approve RD3",
  "Menunggu Approve HD",
];

const getStatusProtokolSkalaLab = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusProtokolSkalaLab };
