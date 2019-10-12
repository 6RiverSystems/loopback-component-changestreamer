const should = require('chai').should();
const app = require('./server');
const request = require('supertest');
const spy = require('sinon').spy;
const stream = require('stream');
const http = require('http');
const uuid = require('uuid');

describe('loopback-component-changestreamer', () => {
	let Foo;
	let Bar;

	let changesUrl;
	let outStream;
	let messages;

	beforeEach(() => {
		Foo = app.models.Foo;
		Bar = app.models.Bar;

		changesUrl = app.settings.url + 'changes';
		messages = [];
		// eslint-disable-next-line
		outStream = stream.PassThrough();
		outStream.on('data', (chunk) => {
			const textChunk = chunk.toString('utf8');
			messages.push(textChunk);
		});
	});

	afterEach(() => {
		return request(app).delete('/changes');
	});

	context('initialize connection', () => {
		it('should set SSE headers', (done) => {
			request(app).get('/changes')
			.expect('Content-Type', /text\/event-stream/)
			.expect('Connection', 'keep-alive')
			.expect('Cache-Control', 'no-cache')
			.expect('Access-Control-Allow-Origin', '*')
			.expect(200, done);
		});

		it('set user headers', (done) => {
			const fooID = uuid.v4();
			const foo = {id: fooID, foo: 'habba'};
			http.get(changesUrl, (res) => {
				res.pipe(outStream);
			});
			request(app).post('/api/Foos')
			  .set('X-Auth-Request-User', 'test@gmail.com')
			.send(foo)
			.expect(200)
			.then((response) => {
				// eslint-disable-next-line
				messages[1].should.equal(`data: {"seqNo":0,"modelName":"Foo","kind":"create","target":"${fooID}","meta":{"headers":{"x-auth-request-user":"test@gmail.com"}},"data":{"id":"${fooID}","foo":"habba"}}\n\n`);
				done();
			});
		});

		it('should write retry timout as first parameter', (done) => {
			http.get(changesUrl, (res) => {
				res.pipe(outStream);
			});
			setTimeout(() => {
				messages.length.should.be.equal(1);
				messages[0].should.equal('retry: 2000\n\n');
				done();
			}, 2000);
		});
	});

	context('on model create', () => {
		it('should write change event with kind create', (done) => {
			const fooID = uuid.v4();
			const barID = uuid.v4();
			http.get(changesUrl, (res) => {
				res.pipe(outStream);
				// create a model
				Foo.create({id: fooID, foo: 'habba'});
				// makes another model using new/save
				const bar = new Bar({id: barID, bar: 'bahha'});
				bar.save();
			});
			setTimeout(() => {
				messages.length.should.be.equal(3);
				// eslint-disable-next-line
				messages[1].should.equal(`data: {"seqNo":0,"modelName":"Foo","kind":"create","target":"${fooID}","meta":{"headers":[]},"data":{"id":"${fooID}","foo":"habba"}}\n\n`);
				// eslint-disable-next-line
				messages[2].should.equal(`data: {"seqNo":1,"modelName":"Bar","kind":"create","target":"${barID}","meta":{"headers":[]},"data":{"id":"${barID}","bar":"bahha"}}\n\n`);
				done();
			}, 2000);
		});
	});

	context('statistics', () => {
		it('should print statistics', (done) => {
			request(app).get('/changes/stat')
			.expect('Content-Type', /application\/json/)
			.expect(200, {
				connections: 0,
				seqNo: 0,
			}, done);
		});
	});

	context('with existing models', () => {
		let fooID;
		let barID;
		let foo;
		let bar;

		beforeEach(() => {
			fooID = uuid.v4();
			return Foo.create({id: fooID, foo: 'foo'}).then((m) => foo = m);
		});

		beforeEach(() => {
			barID = uuid.v4();
			return Bar.create({id: barID, bar: 'bar'}).then((m) => bar = m);
		});

		context('on update', () => {
			it('should write change event with kind = update', (done) => {
				http.get(changesUrl, (res) => {
					res.pipe(outStream);
					foo.foo = 'baz';
					foo.save();
				});
				setTimeout(() => {
					messages.length.should.be.equal(2);
					// eslint-disable-next-line
					messages[1].should.equal(`data: {"seqNo":2,"modelName":"Foo","kind":"update","target":"${fooID}","meta":{"headers":[]},"data":{"id":"${fooID}","foo":"baz"}}\n\n`);
					done();
				}, 2000);
			});
		});

		context('on delete', () => {
			it('should write change event with kind = remove', (done) => {
				http.get(changesUrl, (res) => {
					res.pipe(outStream);
					bar.destroy();
				});
				setTimeout(() => {
					messages.length.should.be.equal(2);
					// eslint-disable-next-line
					messages[1].should.equal(`data: {"seqNo":2,"modelName":"Bar","kind":"remove","target":"${barID}","where":{"id":"${barID}"},"meta":{"headers":[]},"data":{"id":"${barID}","bar":"bar"}}\n\n`);
					done();
				}, 2000);
			});
		});
	});
});
