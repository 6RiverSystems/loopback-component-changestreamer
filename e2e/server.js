let loopback = require('loopback');
let boot = require('loopback-boot');

let app = module.exports = loopback();

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
	if (err) { throw err; }
});

app.start = (done) => {
	let listener = app.listen(() => {
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


