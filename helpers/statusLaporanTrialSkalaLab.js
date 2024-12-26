const listStatus = [
  "Menunggu Spv RD3",
  "Menunggu Approve Manager RD1/RD2",
  "Menunggu Approve Manager RD3",
  "Menunggu Approve HD",
  "Approved",
];

const getStatusLaporanTrialSkalaLab = (num) => {
  console.log(num, "< NUM");

  return listStatus[+num - 1];
};

module.exports = { getStatusLaporanTrialSkalaLab };
