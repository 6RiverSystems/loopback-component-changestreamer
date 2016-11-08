
// HTTP response headers to setup to establish SSE connection
const SSE_HEADERS: loopback.ResponseHeaders = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	'Connection': 'keep-alive',
	'Access-Control-Allow-Origin': '*'
};

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

	private clients = new Set<loopback.Response>();
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
		// No need to do anything if no listeners detected
		if (this.clients.size > 0) {

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
			let json = JSON.stringify(change);
			this.clients.forEach((client) => {
				if (!client.finished) {
					client.write(`data: ${json}\n\n`);
				}
			});

		}

		next();
	}

	// stream registers request for subsequent change events streaming
	public stream(req: loopback.Request, res: loopback.Response) {
		// Set number of SSE specific headers
		res.set(SSE_HEADERS);
		// Response timout. The connection will be terminated from server side after this amount of time
		res.setTimeout(this.responseTimeout);
		// Set retry timeout for client (Browser) to connect to server after connection is lost ore closed
		res.write(`retry: ${this.reconnectTimeout}\n\n`);

		// Store client connection to push changes
		this.clients.add(res);
		// Remove listener on client disconnect
		req.connection.addListener('close', () => {
			this.clients.delete(res);
			res.status = 200;
			res.end();
		});
	}

};
