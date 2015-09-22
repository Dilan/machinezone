var _ = require('lodash'),
    InvalidError = require('standard-error'),
    when = require('when');

module.exports.configure = function() {
    return {
        config: require(__dirname + '/config/'),
        basePath: __dirname,
        getLogger: require('log4js').getLogger,
        // storage in memory (for simplicity)
        storage: {
            data: {},
            clear: function() {
                this.data = {};
                return when(true);
            },
            findById: function(id) {
                return this.data[id];
            },
            save: function(id, items) {
                this.data[id].updated = new Date();
                this.data[id].items = items;
                return when(this.data[id]);
            },
            create: function() {
                var id = require('node-uuid').v4();
                this.data[id] = { id: id, updated: new Date(), created: new Date(), items: [] };
                return when(this.data[id]);
            }
        }
    };
};

var validateRoute = {
    sequenceAdd: function(core, req) {
        var sequence = req.body['sequence'],
            observation = req.body['observation'];

        if (typeof sequence === 'undefined') {
            throw new InvalidError('Property [sequence] is missed.');
        }
        if (typeof core.storage.findById(sequence) === 'undefined') {
            throw new InvalidError('The sequence isn\'t found');
        }
        if (typeof observation === 'undefined') {
            throw new InvalidError('Property [observation] is missed.');
        }

        var color = observation['color'],
            numbers = observation['numbers'];

        if (typeof color === 'undefined') {
            throw new InvalidError('Property [sequence.color] is missed.');
        } else if (_.includes(['green', 'red'], color) === false) {
            throw new InvalidError('Unexpected color [' + color + '].');
        }
        if (color === 'green') {
            if (typeof numbers === 'undefined') {
                throw new InvalidError('Property [sequence.numbers] is missed.');
            } else if (!_.isArray(numbers) || numbers.length !== 2) {
                throw new InvalidError('Unexpected [sequence.numbers] value.');
            }
        }
        if (color === 'red' && typeof core.storage.findById(sequence) === 'undefined') {
            throw new InvalidError('There isn\'t enough data');
        }
        return when(true);
    }
};

module.exports.express = function(core) {
    var app = require('express')();

    app.set('json replacer', null);
    app.set('json spaces', 4);

    core.app = app;

    // middleware
    var bodyParser = require('body-parser');
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(function(req, res, next) {
        core.getLogger('[trace]').info(
            '[%s %s]' + (req.method !== 'GET' ? ' %j' : ''),
            req.method,
            req.url,
            (req.method !== 'GET') ? req.body : ''
        );
        next();
    });

    // routes
    app.post('/sequence/create', function(req, res) {
        core.storage.create().then(function(sequence) {
            res.json({
                status: 'ok',
                response: { sequence: sequence.id }
            });
        });
    });
    app.post('/clear', function(req, res) {
        core.storage.clear().then(function() {
            res.json({
                status: 'ok',
                response: 'ok'
            });
        });
    });

    /*
     curl -X POST -H "Content-Type: application/json" -d '{ "sequence":"b78fbeb6-12bb-4e92-8ecf-59c5ab062fa9", "observation":{"color":"green","numbers":["1110111", "0011101"] } }' http://127.0.0.1:3001/sequence/add
    */
    app.post('/sequence/add', function(req, res) {
        validateRoute.sequenceAdd(core, req).
            then(function() {
                var sequence = req.body['sequence'],
                    observation = req.body['observation'],
                    color = observation['color'],
                    numbers = observation['numbers'] || [];

                var trafficLight = require('./traffic-light');

                var list = trafficLight.newObservation(
                    color,
                    numbers.reverse(),
                    core.storage.findById(sequence).items
                );

                if (!_.first(list).numbers[1].assumption.length || !_.first(list).numbers[0].assumption.length) {
                    throw new InvalidError('No solutions found');
                }

                core.storage.save(sequence, list).then(function() {
                    return res.json({
                        status: 'ok',
                        response: {
                            start: trafficLight.possibleVariants(_.first(list)),
                            missing: trafficLight.brokenMaskList(list).reverse()
                        }
                    });
                });
            }).
            catch(InvalidError, function(err) {
                return res.status(400).json({ status: 'error', msg: err.message });
            }).
            catch(function(err) {
                core.getLogger('[sequence.add]]').error(err);
                return res.status(500).json({ status: 'error', msg: 'Unexpected error.' });
            });
    });

    app.get('/sequence/:id', function(req, res) {
        var sequence = core.storage.findById(req.params.id);
        return res.json({
            status: 'ok',
            response: { sequence: sequence }
        });
    });

    return app;
};

module.exports.http = function(core) {
    var logger = core.getLogger('[bootstrap.http]');

    return require('http').createServer(core.app)
        .on('listening', function() {
            logger.debug('Express server listening on port ' + core.config.http.port);
        })
        .on('error', function(err) {
            if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
                logger.error('Error while starting HTTP server.');
                logger.error('%j', err);
                process.exit(1);
            }
        })
        .listen(core.config.http.port, core.config.http.address);
};
