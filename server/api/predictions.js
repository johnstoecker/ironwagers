'use strict';
const AuthPlugin = require('../auth');
const Boom = require('boom');
const EscapeRegExp = require('escape-string-regexp');
const Joi = require('joi');


const internals = {};


internals.applyRoutes = function (server, next) {

    const Prediction = server.plugins['hapi-mongo-models'].Prediction;

    server.route({
        method: 'GET',
        path: '/predictions',
        config: {
            auth: {
                strategy: 'session',
                scope: ['account', 'admin']
            },
        },
        handler: function (request, reply) {

            const query = {};
            if (request.query.author) {
                query.author = new RegExp('^.*?' + EscapeRegExp(request.query.author) + '.*$', 'i');
            }
            if (request.query.status) {
                query.status = request.query.status
            }
            if (request.query.userId) {
                query.userId = request.query.userId
            }
            const fields = request.query.fields;
            const sort = request.query.sort;
            const limit = request.query.limit;
            const page = request.query.page;

            Prediction.pagedFind(query, fields, sort, limit, page, (err, results) => {

                if (err) {
                    return reply(err);
                }

                reply(results);
            });
        }
    });

    server.route({
        method: 'GET',
        path: '/predictions/my',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {
            const id = request.auth.credentials.user._id.toString();
            console.log(id);

            Prediction.findByUserId(id, (err, predictions) => {

                if (err) {
                    return reply(err);
                }

                if (!predictions) {
                    return reply(Boom.notFound());
                }

                reply(predictions);
            });
        }
    });

    // TODO: update a predictions
    // Validate this, make sure it is for the current user
    // Make sure it changes status back to pending
    // Cant update prediction that is true or false
    // Can only update text/tags

    server.route({
        method: 'POST',
        path: '/predictions/{id}/comments',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {
//                 authorHouse: request.auth.credentials.user.house.toString(),

            const params = {
                user_id: request.auth.credentials.user._id.toString(),
                author: request.auth.credentials.user.username.toString(),
                authorHouse: "Hightower",
                text : request.payload.text
            }

            Prediction.addComment(request.params.id, params, (err, prediction) => {
                if (err) {
                    return reply(err);
                }

                reply(prediction)
            })
        }
    })

    server.route({
        method: 'POST',
        path: '/predictions/my',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            },
        },
        handler: function (request, reply) {
            const params = {
              user_id : request.auth.credentials.user._id.toString(),
              author: request.auth.credentials.user.username.toString(),
              text : request.payload.text,
              tags : request.payload.tags,
              season: 6,
              status: 'pending'
            }

            Prediction.create(params, (err, prediction) => {

                if (err) {
                    return reply(err);
                }

                reply(prediction);
            });
        }
    });

    next();
};


exports.register = function (server, options, next) {

    server.dependency(['auth', 'hapi-mongo-models'], internals.applyRoutes);

    next();
};


exports.register.attributes = {
    name: 'predictions'
};