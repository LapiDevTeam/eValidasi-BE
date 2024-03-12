const listStatus = [
  "Menunggu Approve HD",
  //   "Menunggu Approve Manager",
  //   "Menunggu Approve Head",
];

const getStatus = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatus };
