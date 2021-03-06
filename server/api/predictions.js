'use strict';
const AuthPlugin = require('../auth');
const Boom = require('boom');
const EscapeRegExp = require('escape-string-regexp');
const Joi = require('joi');
const Mongodb = require('mongodb');
const Async = require('async');


const internals = {};

internals.applyRoutes = function (server, next) {

    const Prediction = server.plugins['hapi-mongo-models'].Prediction;
    const Wager = server.plugins['hapi-mongo-models'].Wager;
    const User = server.plugins['hapi-mongo-models'].User;

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
                query.author = EscapeRegExp(request.query.author);
            }
            if (request.query.status) {
                query.status = request.query.status
            }
            if (request.query.userId) {
                query.userId = request.query.userId
            }
            if (request.query.tag) {
                query.tags = request.query.tag
            }
            if (request.query.id) {
                query._id = Mongodb.ObjectId(request.query.id)
            }
            const fields = request.query.fields;
            const sort = request.query.sort || "-_id";
            const limit = (request.query.limit && parseInt(request.query.limit)) || 50;
            const page = request.query.page;
            console.log(query)
            Prediction.pagedFind(query, fields, sort, limit, page, (err, results) => {
                // console.log(results)
                if (err) {
                    return reply(err);
                }

                reply(results);
            });
        }
    });

    server.route({
        method: 'GET',
        // LOL this API path smh
        path: '/predictions/foruser',
        handler: function (request, reply) {
            const query = {};
            const username = request.query.author;
            Wager.find({author: username}, (err, results) => {
                if (err) {
                    return reply(err);
                }
                console.log(results)
                let predictionIds = []
                for(var i=0; i< results.length; i++) {
                    console.log(results[i])
                    predictionIds.push(Mongodb.ObjectId(results[i].predictionId))
                }
                const sort = request.query.sort || "-_id";
                const page = request.query.page;
                console.log("prediction ids:")
                console.log(predictionIds)
                Prediction.pagedFind({ "$or": [{ author: username}, {_id: { "$in": predictionIds}}]}, null, sort, null, page, (err, predictions) =>{
                    if(err) {
                        return reply(err);
                    }
                    reply(predictions);
                })
            })

        }
    })

    server.route({
        method: 'GET',
        path: '/predictions/top',
        handler: function (request, reply) {
            const query = {};
            if (request.query.author) {
                query.author = EscapeRegExp(request.query.author);
            }
            const fields = request.query.fields;
            const sort = request.query.sort || "-commentsCount";
            const limit = 20;
            const page = 1;

            Prediction.pagedFind(query, fields, sort, limit, page, (err, results) => {
                // console.log(results)
                if (err) {
                    return reply(err);
                }

                reply(results);
            });
        }
    });

    server.route({
        method: 'GET',
        path: '/predictions/thronesy',
        handler: function (request, reply) {
            if (request.query.author) {
                query.author = EscapeRegExp(request.query.author);
            }
            const fields = request.query.fields;
            // const sort = request.query.sort || "{commentsCount: -1}";
            const limit = 20;
            const page = 1;

            Prediction.pagedFind({$or:[ {awards: ['thronesy']},{ status: "won"}]}, fields, "-_id", limit, page, (err, results) => {
                // console.log(results)
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

    server.route({
        method: 'POST',
        path: '/predictions/updateWagerCoins',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin']
            }
        },
        handler: function (request, reply) {
            // const id = request.auth.credentials.user._id.toString();
            console.log(id);

            Prediction.find({}, (err, predictions) => {

                if (err) {
                    return reply(err);
                }

                if (!predictions) {
                    return reply(Boom.notFound());
                }
                const tasks = {}
                for(let i=0; i< predictions.length; i++) {
                    pred = predictions[i]
                    let wagerCoins = 0;
                    for(let ind=0; ind<pred.comments.length;ind++) {
                        if(comment.coins) {
                            wagerCoins+= comment.coins
                        }
                    }
                    tasks[i] = function (done) {
                        Prediction.findOneAndUpdate({_id: pred.id},{$set: {wagerCoins: wagerCoins}},(err, result) => {
                            if(err){
                                return reply(err)
                            }
                            return(result)
                        })
                    }
                }
                Async.auto(tasks, (err, results) => {
                    if (err) {
                        return callback(err);
                    }
                    callback(results);
                });


            });
        }
    });

    server.route({
        method: 'POST',
        path: '/predictions/{id}/wagers',
        config: {
            auth: {
                strategy: 'session',
                scope: ['account' ]
            }
        },
        handler: function (request, reply) {
            Prediction.findById(request.params.id, (err, pred) => {
                if (err) {
                    return reply(err);
                }
                if (!pred) {
                    return reply(Boom.notFound())
                }
                if (pred.status != "pending" && pred.status != "standing" && !pred.locked) {
                    return reply(Boom.badRequest("only bet on pending or standing predictions"))
                }
                console.log(request.params.id)
                console.log("the prediction:")
                console.log(pred)

                const params = {
                  user_id : request.auth.credentials.user._id.toString(),
                  author: request.auth.credentials.user.username.toString(),
                  authorHouse: (request.auth.credentials.user.house && request.auth.credentials.user.house.name) || "unaffiliated",
                  status: 'pending',
                  coins: parseInt(request.payload.coins),
                  comments: []
                }

                console.log("wager params")
                console.log(params)

                if(params.coins < 1) {
                    return reply(Boom.badRequest("Incorrect coins"))
                }
                const userUpdate = {
                    $inc: {
                        availableCoins: -params.coins,
                        reservedCoins: params.coins
                    }
                }
                const findParam = {
                    _id: Mongodb.ObjectId(params.user_id),
                    availableCoins: { $gt: params.coins-1 }
                }
                console.log(findParam)
                User.findOneAndUpdate(findParam, userUpdate, (err, user) => {
                    console.log('updated user')
                    if (err) {
                        return reply(err);
                    }

                    if (!user) {
                        return reply(Boom.badRequest("Not enough coins"))
                    }

                    const wagerParams = {
                        userId: params.user_id,
                        authorHouse: request.auth.credentials.user.house && request.auth.credentials.user.house.name,
                        author: request.auth.credentials.user.username,
                        coins: params.coins,
                        predictionId: pred._id,
                        status: 'pending'
                    }
                    Wager.insertOne(wagerParams, (err, wager) => {
                        console.log('updated wager')
                        if (err) {
                            return reply(err);
                        }

                        const predictionCommentParams = {
                            user_id: request.auth.credentials.user._id.toString(),
                            author: request.auth.credentials.user.username.toString(),
                            authorHouse: request.auth.credentials.user.house && request.auth.credentials.user.house.name.toString(),
                            coins: params.coins,
                            text : request.auth.credentials.user.username.toString() + " has wagered " + params.coins
                        }

                        Prediction.addComment(request.params.id, predictionCommentParams, (err, prediction) => {
                            console.log("added comment")
                            if (err) {
                                return reply(err);
                            }

                        })
                    })
                });
            })
        }
    })

    // TODO: update a predictions
    // Validate this, make sure it is for the current user
    // Make sure it changes status back to pending
    // Cant update prediction that is true or false
    // Can only update text/tags

    server.route({
        method: 'PUT',
        path: '/predictions/{id}',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin']
            }
        },
        handler: function(request, reply) {
            if (request.payload.status) {
                Prediction.updatePredictionStatus(request, reply)
            } else if (request.payload.award) {
                Prediction.awardPrediction(request, reply)
            }
        }
    })


    server.route({
        method: 'POST',
        path: '/predictions/{id}/removereaction',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {

            Prediction.removeReaction(request.params.id, request.auth.credentials.user._id.toString(), request.auth.credentials.user.username, request.payload.reaction, (err, prediction) => {
                if (err) {
                    return reply(err);
                }

                reply(prediction)
            })
        }
    })

    server.route({
        method: 'POST',
        path: '/predictions/{id}/addreaction',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {
            Prediction.addReaction(request.params.id, request.auth.credentials.user._id.toString(), request.auth.credentials.user.username, request.payload, (err, prediction) => {
                if (err) {
                    return reply(err);
                }

                reply(prediction)
            })
        }
    })

    server.route({
        method: 'POST',
        path: '/predictions/{id}/comments/{commentId}/addreaction',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {
            Prediction.addCommentReaction(request.params.id, request.params.commentId, request.auth.credentials.user._id.toString(), request.auth.credentials.user.username, request.payload, (err, prediction) => {
                if (err) {
                    return reply(err);
                }

                reply(prediction)
            })
        }
    })

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

            const params = {
                user_id: request.auth.credentials.user._id.toString(),
                author: request.auth.credentials.user.username.toString(),
                //authorHouse: request.auth.credentials.user.house.toString(),
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
        method: 'DELETE',
        path: '/predictions/{predictionId}/comments/{commentId}',
        config: {
            auth: {
                strategy: 'session',
                scope: ['admin', 'account']
            }
        },
        handler: function (request, reply) {

            const user_id = request.auth.credentials.user._id.toString()

            // TODO: how to get second id here?
            Prediction.deleteCommentFromPrediction(request.params.predictionId, request.params.commentId, user_id, (err, prediction) => {
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
              authorHouse: (request.auth.credentials.user.house && request.auth.credentials.user.house.name) || "unaffiliated",
              text : request.payload.text,
              tags : request.payload.tags,
              season: 6,
              status: 'pending',
              coins: parseInt(request.payload.coins),
              comments: [],
              awards: [],
              time: new Date(),
              commentsCount: 0
            }

            if(params.coins < 1) {
                return reply(Boom.badRequest("Incorrect coins"))
            }
            const userUpdate = {
                $inc: {
                    availableCoins: -params.coins,
                    reservedCoins: params.coins
                }
            }
            const findParam = {
                _id: Mongodb.ObjectId(params.user_id),
                availableCoins: { $gt: params.coins-1 }
            }
            console.log(findParam)
            User.findOneAndUpdate(findParam, userUpdate, (err, user) => {

                if (err) {
                    return reply(err);
                }

                if (!user) {
                    return reply(Boom.badRequest("Not enough coins"))
                }

                Prediction.insertOne(params, (err, prediction) => {

                    if (err) {
                        return reply(err);
                    }
                    console.log(params)
                    console.log(params._id)

                    const wagerParams = {
                        userId: params.user_id,
                        authorHouse: request.auth.credentials.user.house && request.auth.credentials.user.house.name,
                        author: request.auth.credentials.user.username,
                        coins: params.coins,
                        predictionId: params._id,
                        status: 'pending'
                    }
                    Wager.insertOne(wagerParams, (err, docs) => {
                        if (err) {
                            return reply(err);
                        }

                        reply(prediction)
                    })
                });
            })
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
