'use strict';
// ==================================================================================
// battery.js
// ----------------------------------------------------------------------------------
// Description:   System Information - library
//                for Node.js
// Copyright:     (c) 2014 - 2017
// Author:        Sebastian Hildebrandt
// ----------------------------------------------------------------------------------
// License:       MIT
// ==================================================================================
// 6. Battery
// ----------------------------------------------------------------------------------

const os = require('os');
const exec = require('child_process').exec;
const fs = require('fs');
const util = require('./util');

let _platform = os.type();

const _linux = (_platform === 'Linux');
const _darwin = (_platform === 'Darwin');
const _windows = (_platform === 'Windows_NT');
const NOT_SUPPORTED = 'not supported';

function getValue(lines, property, separator) {
  separator = separator || ':';
  property = property.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith(property)) {
      const parts = lines[i].split(separator);
      if (parts.length > 1) {
        return parts[1].trim();
      }
    }
  }
  return '';
}

module.exports = function (callback) {

  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      let result = {
        hasbattery: false,
        cyclecount: 0,
        ischarging: false,
        maxcapacity: 0,
        currentcapacity: 0,
        percent: 0
      };

      if (_linux) {
        let battery_path = '';
        if (fs.existsSync('/sys/class/power_supply/BAT1/status')) {
          battery_path = '/sys/class/power_supply/BAT1/'
        } else if (fs.existsSync('/sys/class/power_supply/BAT0/status')) {
          battery_path = '/sys/class/power_supply/BAT0/'
        }
        if (battery_path) {
          exec("cat " + battery_path + "status", function (error, stdout) {
            if (!error) {
              let lines = stdout.toString().split('\n');
              if (lines.length > 0 && lines[0]) result.ischarging = (lines[0].trim().toLowerCase() === 'charging')
            }
            exec("cat " + battery_path + "cyclec_ount", function (error, stdout) {
              if (!error) {
                let lines = stdout.toString().split('\n');
                if (lines.length > 0 && lines[0]) result.cyclecount = parseFloat(lines[0].trim());
              }
              exec("cat " + battery_path + "charge_full", function (error, stdout) {
                if (!error) {
                  let lines = stdout.toString().split('\n');
                  if (lines.length > 0 && lines[0]) result.maxcapacity = parseFloat(lines[0].trim());
                }
                exec("cat " + battery_path + "charge_now", function (error, stdout) {
                  if (!error) {
                    let lines = stdout.toString().split('\n');
                    if (lines.length > 0 && lines[0]) result.currentcapacity = parseFloat(lines[0].trim());
                  }
                  if (result.maxcapacity && result.currentcapacity) {
                    result.hasbattery = true;
                    result.percent = 100.0 * result.currentcapacity / result.maxcapacity;
                  }
                  if (callback) { callback(result) }
                  resolve(result);
                })
              })
            })
          })
        } else {
          if (callback) { callback(result) }
          resolve(result);
        }
      }
      if (_darwin) {
        exec("ioreg -n AppleSmartBattery -r | grep '\"CycleCount\"';ioreg -n AppleSmartBattery -r | grep '\"IsCharging\"';ioreg -n AppleSmartBattery -r | grep '\"MaxCapacity\"';ioreg -n AppleSmartBattery -r | grep '\"CurrentCapacity\"'", function (error, stdout) {
          if (!error) {
            let lines = stdout.toString().replace(/ +/g, "").replace(/"+/g, "").split('\n');
            lines.forEach(function (line) {
              if (line.indexOf('=') !== -1) {
                if (line.toLowerCase().indexOf('cyclecount') !== -1) result.cyclecount = parseFloat(line.split('=')[1].trim());
                if (line.toLowerCase().indexOf('ischarging') !== -1) result.ischarging = (line.split('=')[1].trim().toLowerCase() === 'yes');
                if (line.toLowerCase().indexOf('maxcapacity') !== -1) result.maxcapacity = parseFloat(line.split('=')[1].trim());
                if (line.toLowerCase().indexOf('currentcapacity') !== -1) result.currentcapacity = parseFloat(line.split('=')[1].trim());
              }
            });
          }
          if (result.maxcapacity && result.currentcapacity) {
            result.hasbattery = true;
            result.percent = 100.0 * result.currentcapacity / result.maxcapacity;
          }
          if (callback) { callback(result) }
          resolve(result);
        });
      }
      if (_windows) {
        exec("WMIC Path Win32_Battery Get BatteryStatus, DesignCapacity, EstimatedChargeRemaining /value", function (error, stdout) {
          if (stdout) {
            let lines = stdout.split('\r\n');
            let status = getValue(lines, 'BatteryStatus', '=').trim();
            if (status) {
              status = parseInt(status || '2');
              result.hasbattery = true;
              result.maxcapacity = parseInt(getValue(lines, 'DesignCapacity', '=') || 0);
              result.percent = parseInt(getValue(lines, 'EstimatedChargeRemaining', '=') || 0);
              result.currentcapacity = parseInt(result.maxcapacity * result.percent / 100);
              result.ischarging = (status >= 6 && status <= 9) || (!(status === 3) && !(status === 1) && result.percent < 100);
            }
          }
          if (callback) { callback(result) }
          resolve(result);
        });
      }
    });
  });
};
