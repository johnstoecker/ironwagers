'use strict';
const Joi = require('joi');
const MongoModels = require('mongo-models');

class Character extends MongoModels {}

Character.collection = 'characters';

Character.schema = Joi.object().keys({
    name: Joi.string().required(),
    house: Joi.string().required(),
    isDead: Joi.boolean().required(),
    popularity: Joi.number().integer().min(0).required()
});

module.exports = Character;
