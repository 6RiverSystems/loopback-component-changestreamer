"use strict";
// ChangeStreamerMiddleware is a core of the library
// it incapsulates all streaming logics inside
class Middleware {
    constructor(
        // Loopback models to be observed
        models, 
        // Timeouts Client (Browser) reconnection attempt
        // Default 2 seconds
        reconnectTimeout = 2 * 1000, 
        // Timeouts server response stream being closed
        // Default 10 minutes
        responseTimeout = 10 * 60 * 1000) {
        this.models = models;
        this.reconnectTimeout = reconnectTimeout;
        this.responseTimeout = responseTimeout;
        // Sequence number generator
        this.seqNo = new Date().getTime();
        // Container to store keep-alive responses
        this.responses = new Set();
        models.forEach((model) => this.observeModel(model));
    }
    // Print statistics
    stat(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        let json = JSON.stringify({
            connections: this.responses.size,
            seqNo: this.seqNo
        });
        res.end(json);
    }
    // reset drops all connections and sets seqNo to 0
    reset(req, res) {
        this.disconnectAll();
        this.seqNo = 0;
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
    }
    // stream registers request for subsequent change events streaming
    stream(req, res) {
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
        req.once('close', () => this.disconnect(res));
    }
    // observeModel registers after save and after delete observers
    observeModel(model) {
        model.observe('after save', (ctx, next) => this.notify(ctx, model, 'save', next));
        model.observe('after delete', (ctx, next) => this.notify(ctx, model, 'delete', next));
    }
    // notify constructs a change object and streams it to all registered connections
    notify(ctx, model, opType, next) {
        let idName = model.getIdName();
        let where = ctx.where;
        let data = ctx.instance || ctx.data;
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
                if (!ctx.isNewInstance && (hasTarget || where)) {
                    updateKind = 'update';
                }
                else {
                    updateKind = 'create';
                }
                break;
            case 'delete':
                updateKind = 'remove';
                break;
        }
        // Change object
        let change = {
            seqNo: this.seqNo++,
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
    // disconnectAll removes all connections
    disconnectAll() {
        for (let res of this.responses) {
            this.closeResponse(res);
        }
        this.responses.clear();
    }
    // Disconnect response and close it
    disconnect(res) {
        this.responses.delete(res);
        this.closeResponse(res);
    }
    // closeResponse closes response stream if it's not finished
    closeResponse(res) {
        if (!res.finished) {
            res.statusCode = 200;
            res.end();
        }
    }
}
exports.Middleware = Middleware;
;
