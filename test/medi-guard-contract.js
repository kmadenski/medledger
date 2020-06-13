/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { ChaincodeStub, ClientIdentity } = require('fabric-shim');
const { MediGuardContract } = require('..');
const winston = require('winston');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext {

    constructor() {
        this.stub = sinon.createStubInstance(ChaincodeStub);
        this.clientIdentity = sinon.createStubInstance(ClientIdentity);
        this.logging = {
            getLogger: sinon.stub().returns(sinon.createStubInstance(winston.createLogger().constructor)),
            setLevel: sinon.stub(),
        };
    }

}

describe('MediGuardContract', () => {

    let contract;
    let ctx;

    beforeEach(() => {
        contract = new MediGuardContract();
        ctx = new TestContext();
        ctx.stub.getState.withArgs('1001').resolves(Buffer.from('{"value":"medi guard 1001 value"}'));
        ctx.stub.getState.withArgs('1002').resolves(Buffer.from('{"value":"medi guard 1002 value"}'));
    });

    describe('#mediGuardExists', () => {

        it('should return true for a medi guard', async () => {
            await contract.mediGuardExists(ctx, '1001').should.eventually.be.true;
        });

        it('should return false for a medi guard that does not exist', async () => {
            await contract.mediGuardExists(ctx, '1003').should.eventually.be.false;
        });

    });

    describe('#createMediGuard', () => {

        it('should create a medi guard', async () => {
            await contract.createMediGuard(ctx, '1003', 'medi guard 1003 value');
            ctx.stub.putState.should.have.been.calledOnceWithExactly('1003', Buffer.from('{"value":"medi guard 1003 value"}'));
        });

        it('should throw an error for a medi guard that already exists', async () => {
            await contract.createMediGuard(ctx, '1001', 'myvalue').should.be.rejectedWith(/The medi guard 1001 already exists/);
        });

    });

    describe('#readMediGuard', () => {

        it('should return a medi guard', async () => {
            await contract.readMediGuard(ctx, '1001').should.eventually.deep.equal({ value: 'medi guard 1001 value' });
        });

        it('should throw an error for a medi guard that does not exist', async () => {
            await contract.readMediGuard(ctx, '1003').should.be.rejectedWith(/The medi guard 1003 does not exist/);
        });

    });

    describe('#updateMediGuard', () => {

        it('should update a medi guard', async () => {
            await contract.updateMediGuard(ctx, '1001', 'medi guard 1001 new value');
            ctx.stub.putState.should.have.been.calledOnceWithExactly('1001', Buffer.from('{"value":"medi guard 1001 new value"}'));
        });

        it('should throw an error for a medi guard that does not exist', async () => {
            await contract.updateMediGuard(ctx, '1003', 'medi guard 1003 new value').should.be.rejectedWith(/The medi guard 1003 does not exist/);
        });

    });

    describe('#deleteMediGuard', () => {

        it('should delete a medi guard', async () => {
            await contract.deleteMediGuard(ctx, '1001');
            ctx.stub.deleteState.should.have.been.calledOnceWithExactly('1001');
        });

        it('should throw an error for a medi guard that does not exist', async () => {
            await contract.deleteMediGuard(ctx, '1003').should.be.rejectedWith(/The medi guard 1003 does not exist/);
        });

    });

});