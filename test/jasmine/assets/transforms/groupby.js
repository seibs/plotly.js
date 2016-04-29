'use strict';

// var Lib = require('@src/lib');
var Lib = require('../../../../src/lib');

/*eslint no-unused-vars: 0*/


// so that Plotly.register knows what to do with it
exports.moduleType = 'transform';

// determines to link between transform type and transform module
exports.name = 'groupby';

// ... as trace attributes
exports.attributes = {
    active: {
        valType: 'boolean',
        dflt: true
    },
    groups: {
        valType: 'data_array',
        dflt: []
    },
    groupColors: {
        valType: 'any',
        dflt: {}
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

    var active = coerce('active');

    if(!active) return transformOut;

    coerce('groups');
    coerce('groupColors');

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

    // one-to-many case

    var groups = opts.groups;

    var groupNames = groups.filter(function(g, i, self) {
        return self.indexOf(g) === i;
    });

    var dataOut = new Array(groupNames.length);
    var len = Math.min(fullTrace.x.length, fullTrace.y.length, groups.length);

    for(var i = 0; i < groupNames.length; i++) {
        var groupName = groupNames[i];

        // TODO is this the best pattern ???
        // maybe we could abstract this out
        var traceOut = dataOut[i] = Lib.extendDeep({}, fullTrace);

        traceOut.x = [];
        traceOut.y = [];
        delete traceOut.transforms;

        for(var j = 0; j < len; j++) {
            if(groups[j] !== groupName) continue;

            traceOut.x.push(fullTrace.x[j]);
            traceOut.y.push(fullTrace.y[j]);
        }

        traceOut.name = groupName;
        traceOut.marker.color = opts.groupColors[groupName];
    }

//     console.log(dataOut);

    return dataOut;
};
