/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var Lib = require('../../lib');

var Custom = module.exports = {};

Custom.name = 'custom';

Custom.attributes = {
    coords: {
        valType: 'data_array',
        dflt: []
    },
    markerColor: {
        valType: 'color'
    }
};

Custom.supplyDefaults = function(traceIn, traceOut) {

    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, Custom.attributes, attr, dflt);
    }

    var coords = coerce('coords');

    // ... or some other crazy custom default logic
    coerce('markerColor', (coords.length > 10) ? 'blue' : 'red');
};

/**
 *  @param {object} traceIn custom (full) trace object
 *  @param {object} layout (full) layout object
 *
 *  @return {array} array of 'expended' traces
 *
 */
Custom.expandData = function(traceIn, layout) {
    var dataOut = [];

    var newTrace = {
        type: 'bar',
        x: [],
        y: [],
        marker: {
            color: traceIn.markerColor
        }
    };

    traceIn.coords.forEach(function(v, i) {
        if(i % 2) {
            newTrace.y.push(v);
        }
        else {
            newTrace.x.push(v);
        }
    });

    // or maybe a separate Custom.expandLayout method ??
    layout.title = 'custom trace type!';

    dataOut.push(newTrace);

    return dataOut;
};

// we need these below so that Plotly.register doesn't complain
// ... we could clean these up a little to remove redundancy.
Custom.moduleType = 'trace';
Custom.categories = [];
Custom.basePlotModule = require('../../plots/cartesian');
Custom.meta = {
    description: 'CUSTOM TRACE'
};
