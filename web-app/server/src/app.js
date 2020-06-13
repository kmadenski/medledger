'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const util = require('util');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let network = require('./fabric/network.js');

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(fileUpload({
  createParentPath: true
}));

const configPath = path.join(process.cwd(), './config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);

//use this identity to query
const appAdmin = config.appAdmin;
const appPatient = config.userName;
const appPlace = config.userNamePlace;

//get all assets in world state
  app.get('/getPlaces', async (req, res) => {

    let networkObj = await network.connectToNetwork(appPatient);
    let response = await network.invoke(networkObj, true, 'getPlaces', '');
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.get('/getAccessesByPatient', async (req, res) => {

    let networkObj = await network.connectToNetwork(appPatient);
    let response = await network.invoke(networkObj, true, 'getAccessesByPatient', '');
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.post('/addAccess', async (req, res) => {
    let networkObj = await network.connectToNetwork(appPatient);
    const uuid = uuidv4();
    const place = req.body.place;
    const args = {'accessId':uuid,'placeId':place};
    let response = await network.invoke(networkObj, false, 'addAccess', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.post('/grantAccess', async (req, res) => {
    let networkObj = await network.connectToNetwork(appPatient);
    const accessId = req.body.accessId;
    const args = {'accessId':accessId};
    let response = await network.invoke(networkObj, false, 'grantAccess', JSON.stringify(args));
    console.log(response);
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.post('/revokeAccess', async (req, res) => {
    let networkObj = await network.connectToNetwork(appPatient);
    const accessId = req.body.accessId;
    const args = {'accessId':accessId};
    let response = await network.invoke(networkObj, false, 'revokeAccess', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.post('/addPlace', async (req, res) => {
    let networkObj = await network.connectToNetwork(appPatient);
    const placeId = req.body.placeId;
    const label = req.body.label;

    const args = {'placeId':placeId,"label":label};
    let response = await network.invoke(networkObj, false, 'addPlace', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });
  app.post('/uploadFile', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    const file = req.files.file;
    const hash = file.md5;
    const label = req.body.label;
    let fileId = req.body.fileId;

    if(typeof fileId === 'undefined' || !fileId){
      fileId = uuidv4();
    }
    const args = {'fileId':fileId,"label":label,"hash": hash};

    let networkObj = await network.connectToNetwork(appPatient);
    let response = await network.invoke(networkObj, false, 'putFile', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  });
  app.post('/uploadFileForPatient', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    const file = req.files.file;
    const hash = file.md5;
    const label = file.name;
    const patientId = req.body.patient;
    let fileId = req.body.fileId;

    if(typeof fileId === 'undefined' || !fileId){
      fileId = uuidv4();
    }

    file.mv('./uploads/'+fileId);

    const args = {'fileId':fileId,"label":label,"hash": hash,"patientId":patientId};
    console.log(args);
    let networkObj = await network.connectToNetwork(appPlace);
    let response = await network.invoke(networkObj, false, 'putFileForPatient', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  });
  app.get('/getFilesByPatient', async (req, res) => {

    let networkObj = await network.connectToNetwork(appPlace);
    const patientId = req.query.patient;
    const args = {'patientId':patientId};
    
    let response = await network.invoke(networkObj, true, 'getFilesByPatient', JSON.stringify(args));
    let parsedResponse = await JSON.parse(response);
    res.send(parsedResponse);
  
  });

app.listen(process.env.PORT || 8081);
console.log("server running");