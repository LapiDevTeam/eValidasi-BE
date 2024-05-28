const listStatus = ["Approved"];

const getStatusLaporanTrialSkalaLab = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusLaporanTrialSkalaLab };
