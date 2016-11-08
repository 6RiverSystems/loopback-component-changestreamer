"use strict";
// HTTP response headers to setup to establish SSE connection
const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
};
// Sequence number generator
function* seqNoGen() {
    let index = 0;
    while (true) {
        yield index++;
    }
}
class ChangeStreamer {
    constructor(models, reconnectTimeout = 2 * 60 * 1000, responseTimeout = 0) {
        this.models = models;
        this.reconnectTimeout = reconnectTimeout;
        this.responseTimeout = responseTimeout;
        this.clients = new Set();
        this.seqNo = seqNoGen();
        models.forEach((model) => this.observeModel(model));
    }
    // observeModel registers after save and after delete observers
    observeModel(model) {
        model.observe('after save', (ctx, next) => this.notify(ctx, model, 'save', next));
        model.observe('after delete', (ctx, next) => this.notify(ctx, model, 'delete', next));
    }
    // notify constructs a change object and streams it to all registered connections
    notify(ctx, model, opType, next) {
        // No need to do anything if no listeners detected
        if (this.clients.size > 0) {
            let idName = model.getIdName();
            let where = ctx.where;
            let data = ctx.instance || ctx.data;
            let whereId = where && where[idName];
            let modelName = model.definition.name;
            // the data includes the id or the where includes the id
            let target;
            if (data && (data[idName] || data[idName] === 0)) {
                target = data[idName];
            }
            else if (where && (where[idName] || where[idName] === 0)) {
                target = where[idName];
            }
            let hasTarget = target === 0 || !!target;
            let updateKind;
            switch (opType) {
                case 'save':
                    if (ctx.isNewInstance === undefined) {
                        updateKind = hasTarget ? 'update' : 'create';
                    }
                    else {
                        updateKind = ctx.isNewInstance ? 'create' : 'update';
                    }
                    break;
                case 'delete':
                    updateKind = 'remove';
                    break;
            }
            // Change object
            let change = {
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
    // Register request to stream changes
    stream(req, res) {
        res.set(SSE_HEADERS);
        res.setTimeout(this.responseTimeout);
        res.write(`retry: ${this.reconnectTimeout}\n\n`);
        this.clients.add(res);
        req.connection.addListener('close', () => {
            this.clients.delete(res);
            res.status = 200;
            res.end();
        });
    }
}
exports.ChangeStreamer = ChangeStreamer;
;
