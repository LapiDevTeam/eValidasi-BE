const listStatus = [
  "Menunggu Approve Managr",
  //   "Menunggu Approve Manager",
  //   "Menunggu Approve Head",
];

const getStatus = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatus };
