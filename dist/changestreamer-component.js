/// <reference path="../typings/index.d.ts" />
"use strict";
const changestreamer_1 = require('./changestreamer');
module.exports = function (app, options) {
    let { name = 'streamer', mountPath = '/changes', responseTimeout, reconnectTimeout, models: modelNames } = options;
    // Convert model name array to model class array
    // throw Error if model not found
    let models = modelNames.map((name) => {
        let model = app.models[name];
        if (!model) {
            throw new Error(`Unable to find model with name: ${name}`);
        }
        return model;
    });
    let streamer = new changestreamer_1.ChangeStreamer(models, reconnectTimeout, responseTimeout);
    // Register middleware
    app.use(mountPath, (req, res) => {
        streamer.stream(req, res);
    });
};
