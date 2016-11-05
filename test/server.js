let loopback = require('loopback');

let app = loopback();
let PORT = 3033;

app.set('legacyExplorer', false);

app.start = (done) => {
	let listener = app.listen(PORT, () => {
		app.stop = function(cb) {
			listener.close(cb);
		};
		done();
	});
};

before((done) => {
	app.start(done);
});

after((done) => {
	app.stop(done);
});

module.exports = app;
