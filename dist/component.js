"use strict";
const middleware_1 = require("./middleware");
module.exports = function (app, options) {
    let { name = 'streamer', mountPath = '/changes', responseTimeout, reconnectTimeout, models: modelNames, headers: headerLower } = options;
    // Convert model name array to model class array
    // throw Error if model not found
    let models = modelNames.map((name) => {
        let model = app.models[name];
        if (!model) {
            throw new Error(`Unable to find model with name: ${name}`);
        }
        return model;
    });
    let headers = [];
    if (headerLower) {
        headers = headerLower.map((header) => {
            return header.toLowerCase();
        });
    }
    let streamer = new middleware_1.Middleware(models, reconnectTimeout, responseTimeout, headers);
    // Register statistics middleware
    app.get(mountPath + '/stat', (req, res) => {
        streamer.stat(req, res);
    });
    // Register streaming middleware
    app.get(mountPath, (req, res) => {
        streamer.stream(req, res);
    });
    // Drop connections, clear seqNo generator
    app.delete(mountPath, (req, res) => {
        streamer.reset(req, res);
    });
};
