'use strict';
// call the packages we need
var express = require('express');        // call express
var app = express();      
var si = require('systeminformation');
const os = require('os');
var bodyParser = require('body-parser');
var cors = require('cors');
const socket = require('socket.io-client');
var Pusher = require('pusher');
var mysql = require('mysql');

// To convert from bytes to gigabytes
const bytesToGigaBytes = 1024 * 1024 * 1024;
// To specify the interval (in milliseconds)
const intervalInMs = 10000;


var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Wonderful1",
  database: "sitemonitoring"
});
con.connect(function(err) {
	if (err) throw err;
  		console.log("Connected!");
  		var sql = "INSERT INTO serverData (platform) VALUES ('platform')";
  		con.query(sql, function (err, result) {
    if (err) throw err;
    	console.log("1 record inserted");
  	});
 });

// var pusher = new Pusher({
//   appId: '361321',
//   key: 'fa2c8fc73abb0c80ad50',
//   secret: '31d5fc9a09ad20a9a47a',
//   cluster: 'ap2',
//   encrypted: true
// });
// //pusher notification 
// pusher.trigger('my-channel', 'my-event', {
//   "message": "hello world"
// });

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

var port = process.env.PORT || 4322;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

function getStaticData(callback){
	return new Promise((resolve, reject) => {
	  		process.nextTick(() => {
			si.osInfo().then(resp=>{
				let staticData = {};
				staticData= {
					platform:resp.platform,
					os_hostname:resp.hostname,
					os_distro: resp.distro,
					os_release:resp.release,
					os_arch:resp.arch,
					os_logofile:resp.logofile,
				
				}

				si.system().then(resp=>{
				
					staticData.s_manufacturer=resp.manufacturer;
					staticData.s_model= resp.model;
					staticData.s_serial= resp.serial;
					staticData.s_uuid= resp.uuid;
				
					si.cpu().then(resp=>{
						staticData.cpu_manufacturer=resp.manufacturer;
						staticData.cpu_brand=resp.brand;
						staticData.cpu_speed=resp.speed;
						staticData.cpu_cores=resp.cores;
							if (callback) { 
							callback(staticData) 
							}
				            resolve(staticData);	
					});
				});
			});     
		});
	});
}
function getRamData(callback){
	return new Promise((resolve, reject)=>{
		process.nextTick(()=>{
			let ramData={};
			si.mem().then(resp=>{
				ramData.ramTotal = (resp.total/bytesToGigaBytes).toFixed(2);
				ramData.ramUsed = (resp.used/bytesToGigaBytes).toFixed(2);
				ramData.ramFree =(resp.free/bytesToGigaBytes).toFixed(2);

				if (callback) { 
					callback(ramData) 
				}
				    resolve(ramData);
			});
		});
	});
}
function getCPU(callback){
	return new Promise((resolve, reject)=>{
		process.nextTick(()=>{
			let cpuData={};
			si.currentLoad().then(resp=>{
				cpuData.cpu_avgload = resp.avgload;
				cpuData.cpu_currentload = resp.currentload;
				cpuData.cpu_currentload_user = resp.currentload_user;
				cpuData.cpu_currentload_system =resp.currentload_system;

				si.cpuTemperature().then(resp=>{
					cpuData.cpuTemperature=resp.main;

					if (callback) { 
						callback(cpuData) 
					}
				    resolve(cpuData);
				});
			});
		});
	});
}
function getNetwork(callback){
	return new Promise((resolve, reject)=>{
		process.nextTick(()=>{
			let networkData={};
			si.networkStats().then(resp=>{
				networkData.networkStats_Recieved_sec = (resp.rx_sec).toFixed(2);
				networkData.networkStats_Transfered_sec = (resp.tx_sec).toFixed(2);
				networkData.networkStats_Recieved_rx = (resp.rx).toFixed(2);
				networkData.networkStats_Transfered_tx = (resp.tx).toFixed(2);

				if (callback) { 
					callback(networkData) 
				}
				    resolve(networkData);
			});
		});
	});
}

function getDynamicData(callback){
	return new Promise((resolve, reject) => {
	  	process.nextTick(() => {
	  		let dynamicData = {};
			si.cpuTemperature().then(resp=>{
				dynamicData.cpuTemperature=resp.main;
				si.mem().then(resp=>{
					dynamicData.totalMemory =(resp.total/bytesToGigaBytes).toFixed(2);
					dynamicData.freeMemory =(resp.free/bytesToGigaBytes).toFixed(2);
					dynamicData.usedMemory =(resp.used/bytesToGigaBytes).toFixed(2);

					si.networkStats().then(resp=>{
						dynamicData.networkStats_Recieved_sec = (resp.rx_sec).toFixed(2);
						dynamicData.networkStats_Transfered_sec = (resp.tx_sec).toFixed(2);

						si.currentLoad().then(resp=>{
							dynamicData.cpu_avgload = resp.avgload;
							dynamicData.cpu_currentload = resp.currentload;
							
								if (callback) { 
									callback(dynamicData) 
								}
		            				resolve(dynamicData);
						});
					});
				});
			});
		});
	});
}


// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
			getStaticData(function(staticData){
	    	res.json(staticData);
			});	
});

router.get('/dynamicData', function(req, res) {
			getDynamicData(function(dynamicData){
	    	res.json(dynamicData);
			});	
});
router.get('/ramData', function(req, res) {
			getRamData(function(ramData){
	    	res.json(ramData);
			});	
});

router.get('/cpuData', function(req, res) {
			getCPU(function(cpuData){
	    	res.json(cpuData);
			});	
});

router.get('/networkData', function(req, res) {
			getNetwork(function(networkData){
	    	res.json(networkData);
			});	
});

router.post('/ramData',function(req,res){
	var ramData = req.json(ramData);
	
});


// more routes for our API will happen here
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);
app.use('/dynamicData', router);
app.use('/ramData', router);
app.use('/cpuData', router);
app.use('/networkData', router);


// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);



