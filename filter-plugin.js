'use strict';

var Lib = require('./src/lib');


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
        valType: 'any',
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
 * @param {object} fullLayout
 *  the plot's full layout
 * @return {object} transformOut
 *  copy of transformIn that contains attribute defaults
 */
exports.supplyDefaults = function(transformIn, fullData, fullLayout) {
    var transformOut = {};

    function coerce(attr, dflt) {
        Lib.coerce(transformIn, transformOut, exports.attributes, attr, dflt)
    }

    coerce('operation');
    coerce('value');
    coerce('filtersrc');

    // or some more complex logic using fullData and fullLayout

    return transformOut;
};

/**
 * Apply transform !!!
 *
 * @param {object} opts
 *  full transform options
 * @param {object} fullTrace
 *  full trace object where the transform is nested
 * @param {object} fullLayout
 *  the plot's full layout
 *
 */
exports.transform = function(opts, fullTrace, fullLayout) {
    var filterFunc = getFilterFunc(opts);

    // one-to-one in this case
    var traceOut = {};

    switch(opts.filtersrc) {
        case 'x':
            traceOut.x = fullTrace.x.filter(filterFunc);
            traceOut.y = fullTrace.y;
            break;

        case 'y':
            traceOut.x = fullTrace.x;
            traceOut.y = fullTrace.y.filter(filterFunc);
            break;
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
