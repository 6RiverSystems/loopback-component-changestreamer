
import * as http from 'http';
import * as loopback from './types/loopback';

import {Middleware} from './middleware';

// Comopnent options
type Options = {
	name: string							// The streamer component will me accessible from app[<name>] variable
	models: string[]					// Array of model names
	mountPath?: string				// Mount path for middleware function
	reconnectTimeout?: number // Timeout for browser to reconnect on connection lost
	responseTimeout?: number	// Response timeout in milliseconds
	headers: string[]					// Array of headers to instert into metadata
}

// Component registration function
export = function(app: loopback.Application, options: Options) {

	let {
		name = 'streamer',
		mountPath = '/changes',
		responseTimeout,
		reconnectTimeout,
		models: modelNames ,
		headers: headerLower
	} = options;

	// Convert model name array to model class array
	// throw Error if model not found
	let models = modelNames.map((name) => {
		let model = app.models[name];
		if (!model) { throw new Error(`Unable to find model with name: ${name}`); }
		return model;
	});

	let headers = headerLower.map((header) => {
		return header.toLowerCase();
	});

	let streamer = new Middleware(models, reconnectTimeout, responseTimeout, headers);

	// Register statistics middleware
	app.get(mountPath + '/stat', (req: http.ClientRequest, res: http.ServerResponse) => {
		streamer.stat(req, res);
	});

	// Register streaming middleware
	app.get(mountPath, (req: http.ClientRequest, res: http.ServerResponse) => {
		streamer.stream(req, res);
	});

	// Drop connections, clear seqNo generator
	app.delete(mountPath, (req: http.ClientRequest, res: http.ServerResponse) => {
		streamer.reset(req, res);
	});

}
