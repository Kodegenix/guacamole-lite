const EventEmitter = require('events').EventEmitter;
const Ws = require('ws');
const DeepExtend = require('deep-extend');

const ClientConnection = require('./ClientConnection.js');

class Server extends EventEmitter {

    constructor(wsOptions, guacdOptions, clientOptions, callbacks, log) {
        super();
        if (log) {
            if (log.info && log.error && log.debug) {
                this.log = log;
            } else {
                throw new Error("Functions : info, error, debug expected in logger")
            }
        }

        if (wsOptions) {
            this.wsOptions = wsOptions;
        } else {
            this.wsOptions = {
                port: 8080
            }
        }
        this.guacdOptions = Object.assign({
            host: '127.0.0.1',
            port: 4822
        }, guacdOptions);

        this.clientOptions = {};
        DeepExtend(this.clientOptions, {
            log: {
                verbose: true
            },

            crypt: {
                cypher: 'AES-256-CBC',
            },

            connectionDefaultSettings: {
                rdp: {
                    'args': 'connect',
                    'port': '3389',
                    'width': 1024,
                    'height': 768,
                    'dpi': 96,
                },
                vnc: {
                    'args': 'connect',
                    'port': '5900',
                    'width': 1024,
                    'height': 768,
                    'dpi': 96,
                }
            },

            allowedUnencryptedConnectionSettings: {
                rdp: [
                    'width',
                    'height',
                    'dpi'
                ],
                vnc: [
                    'width',
                    'height',
                    'dpi'
                ]
            }

        }, clientOptions);

        this.callbacks = Object.assign({
            processConnectionSettings: (settings, callback) => callback(undefined, settings)
        }, callbacks);

        this.connectionsCount = 0;
        this.activeConnections = {};

        if (this.log) {
            this.log.info('Starting guacamole websocket server ' + this.wsOptions.port ? ' on port ' + this.wsOptions.port : '');
        }

        this.webSocketServer = new Ws.Server(this.wsOptions);
        this.webSocketServer.on('connection', this.newConnection.bind(this));

        process.on('SIGTERM', this.close.bind(this));
        process.on('SIGINT', this.close.bind(this));

    }

    close() {
        if (this.log){
            this.log.info('Closing all connections and exiting...');
        }
        this.webSocketServer.close(() => {
            Object
                .keys(this.activeConnections)
                .forEach(key => this.activeConnections[key].close());
        });

    }

    newConnection(webSocketConnection) {
        this.connectionsCount++;
        this.activeConnections[this.connectionsCount] = new ClientConnection(this, this.connectionsCount, webSocketConnection, this.log)
    }
}

module.exports = Server;
