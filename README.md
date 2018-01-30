# loopback-component-changestreamer

The component observes a number specified models and notifies about the changes by SSE.

The main difference with Loopback /change-stream channels is that this implementation creates only two observers (after save and after delete) per model and then streams the changes to keep-alive registered connections. In contrast Loopback creates two same observers for **each** connection.


## Install and Setup
Install the company:
  npm install --save loopback-component-changestreamer

**Important**! Disable compression middleware in middleware.json files like this:

  ```javascript
  {
    ...
    "compression": {
      "enabled":false
  	},
  	...
  }
  ```

Add the following configuration to component-config.json:

  ```javascript
  {
    ...
    "loopback-component-changestreamer": {
      "mountPath": "/api/updates",
      "reconnectTimeout": 3000,
      "responseTimeout": 120000,
      "models": [
        "Foo",
        "Bar",
        "Baz"
      ],
      "headers": [
        "x-auth-request-user"
      ]
    },
    ...
  }
  ```

See _e2e/_ directory as an example for how to make project configuration.

The configuration parameters:
  * mountPath - base URL to subscribe for updates;
  * reconnectTimeout - instruct Browser to reconnect after this timeout if connection is lost;
  * responseTimeout - the response socket will be closed after this timeout;
  * models - array of model names to observe.
	* headers - headers and values to embed in the stream metadata.

The component configuration above adds 3 middleware rules:
  * GET "/api/updates" to connect some SourceEvent listener;
  * GET "/api/updates/stat" to see a statistics about number of current connections;
  * DELETE "/api/updates" to close all registered connections.

The following snippet can be used on client side to connect:

  ```javascript
  var src = new EventSource('//<host>:<port>/api/updates');
  src.addEventListener('message', function(message) {
    ...
  });
  ```
