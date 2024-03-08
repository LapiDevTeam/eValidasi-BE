const listStatus = [
  "Menunggu Approve SPV",
  "Menunggu Approve Manager",
  //   "Menunggu Approve Head",
];

const getStatus = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatus };
