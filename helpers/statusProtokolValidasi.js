const listStatus = ["Menunggu Approve Manager", "Approved"];

const getStatusProtokolValidasi = (num) => {
  return listStatus[+num - 1];
};

module.exports = { getStatusProtokolValidasi };
