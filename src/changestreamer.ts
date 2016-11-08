import * as http from 'http';
import * as loopback from 'loopback';

// Sequence number generator
function* seqNoGen() {
	let index = 0;
	while(true) {
		yield index++;
	}
}


// 3 possible kinds of update
// create: new object created
// update: existing model updated
// remove: existing model removed
type UpdateKind = 'update' | 'create' | 'remove';

// Change message to push to clients
interface Change {
	seqNo: number
	target: number | string
	modelName: string
	where: any
	data: any
	kind: UpdateKind
}

export class ChangeStreamer {

	private responses = new Set<http.ServerResponse>();
	private seqNo = seqNoGen();

	constructor(
		private models: loopback.Model[],
		private reconnectTimeout: number = 2 * 60 * 1000,
		private responseTimeout: number = 0
	) {
		models.forEach((model) => this.observeModel(model));
	}

	// observeModel registers after save and after delete observers
	private observeModel(model: loopback.Model) {
		model.observe('after save',   (ctx, next) => this.notify(ctx, model, 'save',	 next));
		model.observe('after delete', (ctx, next) => this.notify(ctx, model, 'delete', next));
	}

	// notify constructs a change object and streams it to all registered connections
	private notify(ctx: loopback.Context, model: loopback.Model, opType: 'save' | 'delete', next: loopback.Next) {

		let idName	= model.getIdName();
		let where		= ctx.where;
		let data		= ctx.instance || ctx.data;
		let whereId = where && where[idName];
		let modelName = model.definition.name;

		// the data includes the id or the where includes the id
		let target: string | number;
		if (data && (data[idName] || data[idName] === 0)) {
			target = data[idName];
		} else if (where && (where[idName] || where[idName] === 0)) {
			target = where[idName];
		}

		let hasTarget = target === 0 || !!target;

		let updateKind: UpdateKind;
		switch (opType) {
			case 'save':
				if (ctx.isNewInstance === undefined) {
					updateKind = hasTarget ? 'update' : 'create';
				} else {
					updateKind = ctx.isNewInstance ? 'create' : 'update';
				}
				break;

			case 'delete':
				updateKind = 'remove';
				break;
		}

		// Change object
		let change: Change = {
			seqNo: this.seqNo.next().value,
			modelName: model.definition.name,
			kind: updateKind,
			target,
			where,
			data
		};

		// Notify clients about the change
		if (this.responses.size > 0) {
			let json = JSON.stringify(change);

			this.responses.forEach((res) => {
				if (!res.finished) {
					res.write(`data: ${json}\n\n`);
				}
			});
		}

		next();
	}

	// stream registers request for subsequent change events streaming
	public stream(req: http.ClientRequest, res: http.ServerResponse) {
		// Set number of SSE specific headers
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('Access-Control-Allow-Origin', '*');

		// Response timout. The connection will be terminated from server side after this amount of time
		res.setTimeout(this.responseTimeout, null);
		// Set retry timeout for client (Browser) to connect to server after connection is lost ore closed
		res.write(`retry: ${this.reconnectTimeout}\n\n`);

		// Store client connection to push changes
		this.responses.add(res);

		// Remove listener on client disconnect
		req.on('close', (err) => {
			this.responses.delete(res);
			res.statusCode = 200;
			res.end();
		});
	}

};
