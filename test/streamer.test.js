let should = require('chai').should();
let app = require('./server');
let request = require('supertest');
var spy = require('sinon').spy;
let stream = require('stream');
let http = require('http');
let uuid = require('uuid');

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
		outStream = stream.PassThrough();
		outStream.on('data', (chunk) => {
			let textChunk = chunk.toString('utf8');
			messages.push(textChunk);
		});
	});

	afterEach(() => {
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

		it('should write retry timout as first parameter', (done) => {
			http.get(changesUrl, (res) => {
				res.pipe(outStream);
			});
			setTimeout(() => {
				messages.length.should.be.equal(1);
				messages[0].should.equal('retry: 120000\n\n');
				done();
			}, 2000);
		});
	});

	context('on model create', () => {

		it('should write change event on model create', (done) => {
			const fooID = uuid.v4();
			const barID = uuid.v4();
			http.get(changesUrl, (res) => {
				res.pipe(outStream);
				// create a model
				Foo.create({id: fooID, foo: 'habba'});
				// makes another model using new/save
				let bar = new Bar({id: barID, bar: 'bahha'});
				bar.save();
			});
			setTimeout(() => {
				messages.length.should.be.equal(3);
				messages[1].should.equal(`data: {"seqNo":0,"modelName":"Foo","kind":"create","target":"${fooID}","data":{"id":"${fooID}","foo":"habba"}}\n\n`);
				messages[2].should.equal(`data: {"seqNo":1,"modelName":"Bar","kind":"create","target":"${barID}","data":{"id":"${barID}","bar":"bahha"}}\n\n`);
				done();
			}, 2000);
		});
	});


	context('existing models', () => {

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

		context('update models', () => {
			it('should write change event on model update', (done) => {
				http.get(changesUrl, (res) => {
					res.pipe(outStream);
					foo.foo = 'baz';
					foo.save();
				});
				setTimeout(() => {
					messages.length.should.be.equal(2);
					messages[1].should.equal(`data: {"seqNo":2,"modelName":"Foo","kind":"update","target":"${fooID}","data":{"id":"${fooID}","foo":"baz"}}\n\n`);
					done();
				}, 2000);
			});
		});

		context('delete models', () => {
			it('should write change event on model delete', (done) => {
				http.get(changesUrl, (res) => {
					res.pipe(outStream);
					bar.destroy()
				});
				setTimeout(() => {
					messages.length.should.be.equal(2);
					messages[1].should.equal(`data: {"seqNo":3,"modelName":"Bar","kind":"remove","target":"${barID}","where":{"id":"${barID}"},"data":{"id":"${barID}","foo":"bar"}}\n\n`);
					done();
				}, 2000);
			});
		});
	});


});
