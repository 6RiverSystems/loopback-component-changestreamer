let should = require('chai').should();
let app = require('./server');
let request = require('supertest');
var spy = require('sinon').spy;
let stream = require('stream');
let http = require('http');

describe('Streamer', () => {

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

	it('should write change event on model create', (done) => {
		http.get(changesUrl, (res) => {
			res.pipe(outStream);
			// create a model
			Foo.create({id: 1, foo: 'habba'});
			// makes another model using new/save
			let bar = new Bar({id: 1, bar: 'bahha'});
			bar.save();
		});
		setTimeout(() => {
			messages.length.should.be.equal(3);
			messages[1].should.equal('data: {"seqNo":0,"modelName":"Foo","kind":"create","target":1,"data":{"id":1,"foo":"habba"}}\n\n');
			messages[2].should.equal('data: {"seqNo":1,"modelName":"Bar","kind":"create","target":1,"data":{"id":1,"bar":"bahha"}}\n\n');
			done();
		}, 2000);
	});

});
