'use strict';
const Constants = require('../constants');
const ObjectAssign = require('object-assign');
const ParseValidation = require('../../../../helpers/parse-validation');


const initialState = {
    hydrated: false,
    loading: false,
    showSaveSuccess: false,
    error: undefined,
    hasError: {},
    help: {},
    username: '',
    email: '',
    coins: '-',
    reservedCoins: '-',
    messages: [],
    availableCoins: '-',
    lostCoins: '-',
    characters: [],
    // // TODO: loading image for house
    house: {
        name: '',
        image: ''
    }
};
const reducer = function (state = initialState, action) {
    if (action.type === Constants.GET_USER) {
        return ObjectAssign({}, state, {
            loading: true,
            hydrated: false
        });
    }

    if (action.type === Constants.GET_USER_RESPONSE || action.type==Constants.DISMISS_MESSAGES_RESPONSE) {
        const validation = ParseValidation(action.response);
        console.log(action.response);
        return ObjectAssign({}, state, {
            loading: false,
            hydrated: true,
            error: validation.error,
            hasError: validation.hasError,
            help: validation.help,
            username: action.response.username,
            email: action.response.email,
            coins: action.response.coins,
            reservedCoins: action.response.reservedCoins,
            availableCoins: action.response.availableCoins,
            lostCoins: action.response.lostCoins,
            messages: action.response.messages,
            characters: action.response.characters,
            house: action.response.house
        });
    }

    if (action.type === Constants.SAVE_USER) {
        return ObjectAssign({}, state, {
            loading: true,
            username: action.request.data.username,
            email: action.request.data.email
        });
    }

    if (action.type === Constants.SAVE_USER_RESPONSE) {
        const validation = ParseValidation(action.response);

        const stateUpdates = {
            loading: false,
            showSaveSuccess: !action.err,
            error: validation.error,
            hasError: validation.hasError,
            help: validation.help
        };

        if (action.response.hasOwnProperty('username')) {
            stateUpdates.username = action.response.username;
            stateUpdates.email = action.response.email;
        }

        return ObjectAssign({}, state, stateUpdates);
    }

    if (action.type === Constants.HIDE_USER_SAVE_SUCCESS) {
        return ObjectAssign({}, state, {
            showSaveSuccess: false
        });
    }

    return state;
};


module.exports = reducer;
