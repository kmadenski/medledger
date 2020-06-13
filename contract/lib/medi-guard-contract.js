/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const keys = require('./key_enum');

class MediGuardContract extends Contract {   
    /**
     * 
     * @param ctx 
     * @returns
     */
    async init(ctx){

    } 
    /**
     * 
     * @param {*} ctx 
     * @param {*} args.accessId 
     * @param {*} args.placeId 
     */
    async addAccess(ctx, args) {
        args = JSON.parse(args);

        const accessId = args.accessId ;
        const placeId = args.placeId ;
        const patient = await ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);

        if (!patient || await this._isAceessByPatientAndPlaceExist(ctx, patient, placeId)) {
            let response = {};
            response.error = `Access asset joining place with patient exist`;
            return response;
        }

        const place = await this._readMyAsset(ctx, placeId);

        const asset = { patient: patient, place: placeId, state: 'INIT' };
        const buffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(accessId, buffer)
        const patientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PATIENT_ACCESS, [patient, accessId]);
        const placePatientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PLACE_PATIENT_ACCESS, [placeId, patient, accessId]);
        await ctx.stub.putState(patientAccessCompositeKey, buffer);
        await ctx.stub.putState(placePatientAccessCompositeKey, buffer);
        let response = {};
        response.success = `Access with accessId ${accessId} is updated in the world state`;
        return response;
    }
    async grantAccess(ctx, args) {
        args = JSON.parse(args);
        const accessId = args.accessId;

        const access = await this._readMyAsset(ctx,accessId);
        
        const patient = ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);
        if (access.patient !== patient) {
            let response = {};
            response.error = 'Access denied';
            return response;
        }

        access.state = 'GRANT';
        const placeId = access.place;
        const buffer = Buffer.from(JSON.stringify(access));
        await ctx.stub.putState(accessId, buffer)
        const patientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PATIENT_ACCESS, [patient, accessId]);
        const placePatientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PLACE_PATIENT_ACCESS, [placeId, patient, accessId]);
        await ctx.stub.putState(patientAccessCompositeKey, buffer);
        await ctx.stub.putState(placePatientAccessCompositeKey, buffer);
        let response = {};
        response.success = `Access with accessId ${accessId} is updated in the world state`;
        return response;
    }
    async revokeAccess(ctx, args) {
        args = JSON.parse(args);
        const accessId = args.accessId;

        const access = await this._readMyAsset(ctx,accessId);
        
        const patient = ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);
        if (access.patient !== patient) {
            let response = {};
            response.error = 'Access denied';
            return response;
        }

        access.state = 'REVOKE';
        const placeId = access.place;
        const buffer = Buffer.from(JSON.stringify(access));
        await ctx.stub.putState(accessId, buffer)
        const patientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PATIENT_ACCESS, [patient, accessId]);
        const placePatientAccessCompositeKey = await ctx.stub.createCompositeKey(keys.PLACE_PATIENT_ACCESS, [placeId, patient, accessId]);
        await ctx.stub.putState(patientAccessCompositeKey, buffer);
        await ctx.stub.putState(placePatientAccessCompositeKey, buffer);
        let response = {};
        response.success = `Access with accessId ${accessId} is updated in the world state`;
        return response;
    }
    async getAccessesByPatient(ctx) {
        const patient = await ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);

        const self = this;
        const result = await ctx.stub.getStateByPartialCompositeKey(keys.PATIENT_ACCESS, [patient]).then(function (iterator) {
            return self._getResultOfCompositeKeyStatemant(iterator);
        });
        return result;
    }
    async getPlaces(ctx) {
        let queryString = {
            selector: {}
        };

        let queryResults = await this._queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults;
    }
    async addPlace(ctx, args) {
        //@todo czy x509 to admin
        args = JSON.parse(args);
        const placeId = args.placeId;
        const label = args.label;
        const exists = await this._myAssetExists(ctx, placeId);
        if (exists) {
            let response = {};
            response.error = `The my asset ${placeId} exist`;
            return response;
        }

        const asset = { place: placeId, label: label };
        const buffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(placeId, buffer);
        let response = {};
        response.success = `Place with placeId ${placeId} is updated in the world state`;
        return response;
    }
    async putFile(ctx, args) {
        args = JSON.parse(args);
        const fileId = args.fileId;
        const label = args.label;
        const hash = args.hash;

        const patient = ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);

        const asset = { fileId: fileId, label: label, hash: hash, patient: patient};
        const buffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(fileId, buffer);
        const patientFileCompositeKey = await ctx.stub.createCompositeKey(keys.PATIENT_FILE, [patient, fileId]);
        await ctx.stub.putState(patientFileCompositeKey, buffer);

        let response = {};
        response.success = `File with fileId ${fileId} is updated in the world state`;
        return response;
    }
    async putFileForPatient(ctx, args){
        args = JSON.parse(args);
        const fileId = args.fileId;
        const label = args.label;
        const hash = args.hash;
        const patient = args.patientId;

        const place = ctx.clientIdentity.getAttributeValue(keys.PLACE_ATTR);
        
        const hasAccess = await this._isPlaceHasAccessToPatientFiles(ctx, place, patient);
        console.log(hasAccess);
        if(!hasAccess){
            let response = {};
            response.error = 'Access denied';
            return response;
        }    

        const asset = { fileId: fileId, label: label, hash: hash, patient: patient };
        const buffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(fileId, buffer); 

        const patientFileCompositeKey = await ctx.stub.createCompositeKey(keys.PATIENT_FILE, [patient, fileId]);
            await ctx.stub.putState(patientFileCompositeKey, buffer);

        let response = {};
        response.success = `File with fileId ${fileId} is updated in the world state`;
        return response;
    }
    async getFilesByPatient(ctx, args) {
        args = JSON.parse(args);
        const patient = args.patientId;
        const place = ctx.clientIdentity.getAttributeValue(keys.PLACE_ATTR);
        const hasAccess = await this._isPlaceHasAccessToPatientFiles(ctx, place, patient);
        console.log(args)
        console.log(hasAccess);
        if(!hasAccess){
            let response = {};
            response.error = 'Access denied';
            return response;
        }        

        const self = this;
        const result = await ctx.stub.getStateByPartialCompositeKey(keys.PATIENT_FILE, [patient]).then(function (iterator) {
            return self._getResultOfCompositeKeyStatemant(iterator);
        });
        
        return result;
    }
    async addFileUse(ctx, fileUseId, file, accessId) {
        args = JSON.parse(args);
        const fileUseId = args.fileUseId;
        const fileId = args.fileId;
        const accessId = args.accessId;

        const place = ctx.clientIdentity.getAttributeValue(keys.PLACE_ATTR);
        const access = await this._readMyAsset(ctx, accessId);
        if(access.place !== place || access.state !== 'GRANT'){
            let response = {};
            response.error = 'Access denied';
            return response;
        }
        const fileFileUseCompositeKey = ctx.stub.createCompositeKey(keys.FILE_FILEUSE, [fileId, fileUseId]);
        const now = Date.now();
    
        const asset = { fileUseId: fileUseId, file: fileId, access: accessId, created: now.toString()};
        const buffer = Buffer.from(JSON.stringify(asset));
        await ctx.stub.putState(fileUseId, buffer); 
        await ctx.stub.putState(fileFileUseCompositeKey, buffer);
           
    }
    async getFileUsesByFile(ctx, fileId) {
        const patient = ctx.clientIdentity.getAttributeValue(keys.PATIENT_ATTR);
        const file = await this._readMyAsset(ctx, fileId);
        if(file.patient !== patient){
            let response = {};
            response.error = 'Access denied';
            return response;
        }

        const self = this;
        const result = await ctx.stub.getStateByPartialCompositeKey(keys.FILE_FILEUSE, [fileId]).then(function (iterator) {
            return self._getResultOfCompositeKeyStatemant(iterator);
        });
        
        return result;
    }
    async _isAceessByPatientAndPlaceExist(ctx, patientId, placeId) {
        const self = this;
        const result = JSON.parse(await ctx.stub.getStateByPartialCompositeKey(keys.PLACE_PATIENT_ACCESS, [placeId, patientId]).then(function (iterator) {
            return self._getResultOfCompositeKeyStatemant(iterator);
        }));
        console.log(result);
        if (result.length > 1) {
            throw new Error(`Inconsistency detection`);
        } else {
            return result.length == 1;
        }
    }
    async _isPlaceHasAccessToPatientFiles(ctx, place, patient){
        try{
            const result = JSON.parse(await this._getAceessByPatientAndPlace(ctx, patient, place));
            const access = result[0].Record;
            if(access.state !== 'GRANT'){
                return false;
            }
        }catch(err){
            return false;
        }

        return true;
    }
    async _getAceessByPatientAndPlace(ctx, patientId, placeId) {
        const accessExist = await this._isAceessByPatientAndPlaceExist(ctx, patientId, placeId)
        if (!accessExist) {
            throw new Error(`Access asset joining place with patient not exist`);
        }

        const self = this;
        const result = await ctx.stub.getStateByPartialCompositeKey(keys.PLACE_PATIENT_ACCESS, [placeId, patientId]).then(function (iterator) {
            return self._getResultOfCompositeKeyStatemant(iterator);
        });
        
        return result;
    }
    async _readMyAsset(ctx, myAssetId) {

        const exists = await this._myAssetExists(ctx, myAssetId);

        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }

        const buffer = await ctx.stub.getState(myAssetId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }
    async _myAssetExists(ctx, myAssetId) {
        const buffer = await ctx.stub.getState(myAssetId);
        return (!!buffer && buffer.length > 0);
    }
    async _getResultOfCompositeKeyStatemant(resultsIterator) {
        let allResults = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let res = await resultsIterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};

        //console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;

        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }

        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await resultsIterator.close();
        console.info(allResults);
        console.log(JSON.stringify(allResults));
        return JSON.stringify(allResults);
      }
    }
    }
        /**
     * Evaluate a queryString
     *
     * @param {Context} ctx the transaction context
     * @param {String} queryString the query string to be evaluated
    */
  async _queryWithQueryString(ctx, queryString) {

    console.log('query String');
    console.log(JSON.stringify(queryString));

    let resultsIterator = await ctx.stub.getQueryResult(queryString);

    let allResults = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let res = await resultsIterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};

        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;

        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }

        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await resultsIterator.close();
        console.info(allResults);
        console.log(JSON.stringify(allResults));
        return JSON.stringify(allResults);
      }
    }
  }
}


module.exports = MediGuardContract;
