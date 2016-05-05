/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

function getDelay(fullLayout) {
    // maybe we should add a 'gl' (and 'svg') layoutCategory ??
    return (fullLayout._has('gl3d')|| fullLayout._has('gl2d')) ? 500 : 0;
}

function getRedrawFunc(gd) {

    // do not work for polar plots
    if(gd._fullLayout._hasPolar) return;

    return function() {
        (gd.calcdata || []).forEach(function(d) {
            if(d[0] && d[0].t && d[0].t.cb) d[0].t.cb();
        });
    };
}

var Snapshot = {
    getDelay: getDelay,
    getRedrawFunc: getRedrawFunc,
    clone: require('./cloneplot'),
    toSVG: require('./tosvg'),
    svgToImg: require('./svgtoimg'),
    toImage: require('./toimage')
};

module.exports = Snapshot;
