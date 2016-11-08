/// <reference path="../typings/index.d.ts" />

import * as http from 'http';
import * as loopback from 'loopback';


import {ChangeStreamer} from './changestreamer';

// Comopnent options
type Options = {
	name: string							// The streamer component will me accessible from app[<name>] variable
	models: string[]					// Array of model names
	mountPath?: string				// Mount path for middleware function
	reconnectTimeout?: number // Timeout for browser to reconnect on connection lost
	responseTimeout?: number	// Response timeout in milliseconds
}

// Component registration function
export = function(app: loopback.Application, options: Options) {

	let {
		name = 'streamer',
		mountPath = '/changes',
		responseTimeout,
		reconnectTimeout,
		models: modelNames
	} = options;

	// Convert model name array to model class array
	// throw Error if model not found
	let models = modelNames.map((name) => {
		let model = app.models[name];
		if (!model) { throw new Error(`Unable to find model with name: ${name}`); }
		return model;
	});

	let streamer = new ChangeStreamer(models, reconnectTimeout, responseTimeout);

	// Register middleware
	app.use(mountPath, (req: http.ClientRequest, res: http.ServerResponse) => {
		streamer.stream(req, res);
	});
}
