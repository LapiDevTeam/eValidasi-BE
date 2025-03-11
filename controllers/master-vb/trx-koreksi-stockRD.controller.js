const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const { fnGetStatusNo, fnGetUserApprNo, fnCekJobLevel, Get_DeptID } = require('../../helpers/validation-rd.helper');
const MyError = require('../../helpers/errors');

async function sbCekButton(req, res, next) {
  const { user_id, delegated_to, joblevel_id_user, bagian_user } = req.user;
  if (user_id === '') throw new MyError(401, "Not Authentication");

  const { noDoc, userName = user_id } = req.query;

  if (!noDoc || !userName) {
    return res.status(400).json({ message: "No Doc and User Name are required" });
  }

  try {
    const strStatusNo = await fnGetStatusNo(noDoc.trim());
    const deptID = await Get_DeptID(userName);
    const strUserApprNo = await fnGetUserApprNo(deptID, userName);
    const strJobLevel = await fnCekJobLevel(userName);

    let buttons = {
      CmdUpdate: false,
      cmdDelete: false,
      cmdPrint: false,
      cmdApprove: false,
      cmdReject: false,
      cmdAddNew: false
    };

    Disable_Button(buttons, 'CmdUpdate', 'cmdDelete', 'cmdPrint', 'cmdApprove', 'cmdReject');

    if (!deptID.startsWith("RD")) {
      return res.status(200).json({ buttons });
    }

    if (strJobLevel === "STF") {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else if (strJobLevel === "SPV" && strStatusNo === 0) {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else if (strUserApprNo === 1) {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete', 'cmdApprove', 'cmdReject');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else {
      Disable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete', 'cmdApprove', 'cmdReject');
    }

    if (strStatusNo >= 1 && strUserApprNo <= 2) {
      Enable_Button(buttons, 'cmdPrint');
    } else {
      Disable_Button(buttons, 'cmdPrint');
    }

    return res.status(200).json({ buttons });
  } catch (error) {
    console.error('Error checking button status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function Disable_Button(buttons, ...buttonNames) {
  buttonNames.forEach(buttonName => {
    if (buttons.hasOwnProperty(buttonName)) {
      buttons[buttonName] = false;
    }
  });
}

function Enable_Button(buttons, ...buttonNames) {
  buttonNames.forEach(buttonName => {
    if (buttons.hasOwnProperty(buttonName)) {
      buttons[buttonName] = true;
    }
  });
}



module.exports = {
  sbCekButton,
  // other exports...
};