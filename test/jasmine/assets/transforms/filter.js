'use strict';

// var Lib = require('@src/lib');
var Lib = require('../../../../src/lib');

/*eslint no-unused-vars: 0*/


// so that Plotly.register knows what to do with it
exports.moduleType = 'transform';

// determines to link between transform type and transform module
exports.name = 'filter';

// ... as trace attributes
exports.attributes = {
    operation: {
        valType: 'enumerated',
        values: ['=', '<', '>'],
        dflt: '='
    },
    value: {
        valType: 'number',
        dflt: 0
    },
    filtersrc: {
        valType: 'enumerated',
        values: ['x', 'y'],
        dflt: 'x'
    }
};

/**
 * Supply transform attributes defaults
 *
 * @param {object} transformIn
 *  object linked to trace.transforms[i] with 'type' set to exports.name
 * @param {object} fullData
 *  the plot's full data
 * @param {object} layout
 *  the plot's (not-so-full) layout
 *
 * @return {object} transformOut
 *  copy of transformIn that contains attribute defaults
 */
exports.supplyDefaults = function(transformIn, fullData, layout) {
    var transformOut = {};

    function coerce(attr, dflt) {
        return Lib.coerce(transformIn, transformOut, exports.attributes, attr, dflt);
    }

    coerce('operation');
    coerce('value');
    coerce('filtersrc');

    // or some more complex logic using fullData and layout

    return transformOut;
};

/**
 * Apply transform !!!
 *
 * @param {object} opts
 *  full transform options
 * @param {object} fullTrace
 *  full trace object where the transform is nested
 * @param {object} layout
 *  the plot's (not-so-full) layout
 *
 * @return {object} dataOut
 *  array of transformed traces
 */
exports.transform = function(opts, fullTrace, layout) {

    // one-to-one case
    //
    // TODO is this the best pattern ???
    // maybe we could abstract this out
    var traceOut = Lib.extendDeep({}, fullTrace);
    delete traceOut.transforms;

    traceOut.x = [];
    traceOut.y = [];

    var filterFunc = getFilterFunc(opts);

    var src, opp, len;
    switch(opts.filtersrc) {
        case 'x':
            src = 'x';
            opp = 'y';
            len = fullTrace.x.length;
            break;

        case 'y':
            src = 'y';
            opp = 'x';
            len = fullTrace.y.length;
            break;
    }

    for(var i = 0; i < len; i++) {
        var v = fullTrace[src][i];

        if(!filterFunc(v)) continue;

        traceOut[src].push(v);
        traceOut[opp].push(fullTrace[opp][i]);
    }

    return [traceOut];
};

function getFilterFunc(opts) {
    var value = opts.value;

    switch(opts.operation) {
        case '=':
            return function(v) { return v === value; };
        case '<':
            return function(v) { return v < value; };
        case '>':
            return function(v) { return v > value; };
    }
}
