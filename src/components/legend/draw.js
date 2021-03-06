/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var d3 = require('d3');

var Plotly = require('../../plotly');
var Lib = require('../../lib');
var Plots = require('../../plots/plots');
var dragElement = require('../dragelement');
var Drawing = require('../drawing');
var Color = require('../color');

var constants = require('./constants');
var getLegendData = require('./get_legend_data');
var style = require('./style');
var helpers = require('./helpers');
var anchorUtils = require('./anchor_utils');


module.exports = function draw(gd) {
    var fullLayout = gd._fullLayout;
    var clipId = 'legend' + fullLayout._uid;

    if(!fullLayout._infolayer || !gd.calcdata) return;

    var opts = fullLayout.legend,
        legendData = fullLayout.showlegend && getLegendData(gd.calcdata, opts),
        hiddenSlices = fullLayout.hiddenlabels || [];

    if(!fullLayout.showlegend || !legendData.length) {
        fullLayout._infolayer.selectAll('.legend').remove();
        fullLayout._topdefs.select('#' + clipId).remove();

        Plots.autoMargin(gd, 'legend');
        return;
    }

    if(typeof gd.firstRender === 'undefined') gd.firstRender = true;
    else if(gd.firstRender) gd.firstRender = false;

    var legend = fullLayout._infolayer.selectAll('g.legend')
        .data([0]);

    legend.enter().append('g')
        .attr({
            'class': 'legend',
            'pointer-events': 'all'
        });

    var clipPath = fullLayout._topdefs.selectAll('#' + clipId)
        .data([0]);

    clipPath.enter().append('clipPath')
        .attr('id', clipId)
        .append('rect');

    var bg = legend.selectAll('rect.bg')
        .data([0]);

    bg.enter().append('rect')
        .attr({
            'class': 'bg',
            'shape-rendering': 'crispEdges'
        })
        .call(Color.stroke, opts.bordercolor)
        .call(Color.fill, opts.bgcolor)
        .style('stroke-width', opts.borderwidth + 'px');

    var scrollBox = legend.selectAll('g.scrollbox')
        .data([0]);

    scrollBox.enter().append('g')
        .attr('class', 'scrollbox');

    var scrollBar = legend.selectAll('rect.scrollbar')
        .data([0]);

    scrollBar.enter().append('rect')
        .attr({
            'class': 'scrollbar',
            'rx': 20,
            'ry': 2,
            'width': 0,
            'height': 0
        })
        .call(Color.fill, '#808BA4');

    var groups = scrollBox.selectAll('g.groups')
        .data(legendData);

    groups.enter().append('g')
        .attr('class', 'groups');

    groups.exit().remove();

    if(helpers.isGrouped(opts)) {
        groups.attr('transform', function(d, i) {
            return 'translate(0,' + i * opts.tracegroupgap + ')';
        });
    }

    var traces = groups.selectAll('g.traces')
        .data(Lib.identity);

    traces.enter().append('g').attr('class', 'traces');
    traces.exit().remove();

    traces.call(style)
        .style('opacity', function(d) {
            var trace = d[0].trace;
            if(Plots.traceIs(trace, 'pie')) {
                return hiddenSlices.indexOf(d[0].label) !== -1 ? 0.5 : 1;
            } else {
                return trace.visible === 'legendonly' ? 0.5 : 1;
            }
        })
        .each(function(d, i) {
            drawTexts(this, gd, d, i, traces);

            var traceToggle = d3.select(this).selectAll('rect')
                .data([0]);

            traceToggle.enter().append('rect')
                .classed('legendtoggle', true)
                .style('cursor', 'pointer')
                .attr('pointer-events', 'all')
                .call(Color.fill, 'rgba(0,0,0,0)');

            traceToggle.on('click', function() {
                if(gd._dragged) return;

                var fullData = gd._fullData,
                    trace = d[0].trace,
                    legendgroup = trace.legendgroup,
                    traceIndicesInGroup = [],
                    tracei,
                    newVisible;

                if(Plots.traceIs(trace, 'pie')) {
                    var thisLabel = d[0].label,
                        newHiddenSlices = hiddenSlices.slice(),
                        thisLabelIndex = newHiddenSlices.indexOf(thisLabel);

                    if(thisLabelIndex === -1) newHiddenSlices.push(thisLabel);
                    else newHiddenSlices.splice(thisLabelIndex, 1);

                    Plotly.relayout(gd, 'hiddenlabels', newHiddenSlices);
                } else {
                    if(legendgroup === '') {
                        traceIndicesInGroup = [trace.index];
                    } else {
                        for(var i = 0; i < fullData.length; i++) {
                            tracei = fullData[i];
                            if(tracei.legendgroup === legendgroup) {
                                traceIndicesInGroup.push(tracei.index);
                            }
                        }
                    }

                    newVisible = trace.visible === true ? 'legendonly' : true;
                    Plotly.restyle(gd, 'visible', newVisible, traceIndicesInGroup);
                }
            });
        });

    // Position and size the legend
    var lyMin = 0,
        lyMax = fullLayout.height;

    computeLegendDimensions(gd, traces);

    if(opts.height > lyMax) {
        // If the legend doesn't fit in the plot area,
        // do not expand the vertical margins.
        expandHorizontalMargin(gd);
    } else {
        expandMargin(gd);
    }

    // Scroll section must be executed after repositionLegend.
    // It requires the legend width, height, x and y to position the scrollbox
    // and these values are mutated in repositionLegend.
    var gs = fullLayout._size,
        lx = gs.l + gs.w * opts.x,
        ly = gs.t + gs.h * (1-opts.y);

    if(anchorUtils.isRightAnchor(opts)) {
        lx -= opts.width;
    }
    else if(anchorUtils.isCenterAnchor(opts)) {
        lx -= opts.width / 2;
    }

    if(anchorUtils.isBottomAnchor(opts)) {
        ly -= opts.height;
    }
    else if(anchorUtils.isMiddleAnchor(opts)) {
        ly -= opts.height / 2;
    }

    // Make sure the legend top and bottom are visible
    // (legends with a scroll bar are not allowed to stretch beyond the extended
    // margins)
    var legendHeight = opts.height,
        legendHeightMax = gs.h;

    if(legendHeight > legendHeightMax) {
        ly = gs.t;
        legendHeight = legendHeightMax;
    }
    else {
        if(ly > lyMax) ly = lyMax - legendHeight;
        if(ly < lyMin) ly = lyMin;
        legendHeight = Math.min(lyMax - ly, opts.height);
    }

    // Set size and position of all the elements that make up a legend:
    // legend, background and border, scroll box and scroll bar
    legend.attr('transform', 'translate(' + lx + ',' + ly + ')');

    bg.attr({
        width: opts.width - opts.borderwidth,
        height: legendHeight - opts.borderwidth,
        x: opts.borderwidth / 2,
        y: opts.borderwidth / 2
    });

    var scrollPosition = scrollBox.attr('data-scroll') || 0;

    scrollBox.attr('transform', 'translate(0, ' + scrollPosition + ')');

    clipPath.select('rect').attr({
        width: opts.width - 2 * opts.borderwidth,
        height: legendHeight - 2 * opts.borderwidth,
        x: opts.borderwidth - scrollPosition,
        y: opts.borderwidth
    });

    scrollBox.call(Drawing.setClipUrl, clipId);

    // If scrollbar should be shown.
    if(opts.height - legendHeight > 0 && !gd._context.staticPlot) {

        // increase the background and clip-path width
        // by the scrollbar width and margin
        bg.attr({
            width: opts.width -
                2 * opts.borderwidth +
                constants.scrollBarWidth +
                constants.scrollBarMargin
        });

        clipPath.select('rect').attr({
            width: opts.width -
                2 * opts.borderwidth +
                constants.scrollBarWidth +
                constants.scrollBarMargin
        });

        if(gd.firstRender) {
            // Move scrollbar to starting position
            scrollHandler(constants.scrollBarMargin, 0);
        }

        var scrollBarYMax = legendHeight -
                constants.scrollBarHeight -
                2 * constants.scrollBarMargin,
            scrollBoxYMax = opts.height - legendHeight,
            scrollBarY = constants.scrollBarMargin,
            scrollBoxY = 0;

        scrollHandler(scrollBarY, scrollBoxY);

        legend.on('wheel',null);
        legend.on('wheel', function() {
            scrollBoxY = Lib.constrain(
                scrollBox.attr('data-scroll') -
                    d3.event.deltaY / scrollBarYMax * scrollBoxYMax,
                -scrollBoxYMax, 0);
            scrollBarY = constants.scrollBarMargin -
                scrollBoxY / scrollBoxYMax * scrollBarYMax;
            scrollHandler(scrollBarY, scrollBoxY);
            d3.event.preventDefault();
        });

        scrollBar.on('.drag',null);
        scrollBox.on('.drag',null);
        var drag = d3.behavior.drag().on('drag', function() {
            scrollBarY = Lib.constrain(
                d3.event.y - constants.scrollBarHeight / 2,
                constants.scrollBarMargin,
                constants.scrollBarMargin + scrollBarYMax);
            scrollBoxY = - (scrollBarY - constants.scrollBarMargin) /
                scrollBarYMax * scrollBoxYMax;
            scrollHandler(scrollBarY, scrollBoxY);
        });

        scrollBar.call(drag);
        scrollBox.call(drag);

    }


    function scrollHandler(scrollBarY, scrollBoxY) {
        scrollBox.attr('data-scroll', scrollBoxY);
        scrollBox.attr('transform', 'translate(0, ' + scrollBoxY + ')');
        scrollBar.call(
            Drawing.setRect,
            opts.width,
            scrollBarY,
            constants.scrollBarWidth,
            constants.scrollBarHeight
        );
        clipPath.select('rect').attr({
            y: opts.borderwidth - scrollBoxY
        });
    }

    if(gd._context.editable) {
        var xf, yf, x0, y0;

        legend.classed('cursor-move', true);

        dragElement.init({
            element: legend.node(),
            prepFn: function() {
                var transform = Lib.getTranslate(legend);

                x0 = transform.x;
                y0 = transform.y;
            },
            moveFn: function(dx, dy) {
                var newX = x0 + dx,
                    newY = y0 + dy;

                var transform = 'translate(' + newX + ', ' + newY + ')';
                legend.attr('transform', transform);

                xf = dragElement.align(newX, 0, gs.l, gs.l+gs.w, opts.xanchor);
                yf = dragElement.align(newY, 0, gs.t+gs.h, gs.t, opts.yanchor);
            },
            doneFn: function(dragged) {
                if(dragged && xf !== undefined && yf !== undefined) {
                    Plotly.relayout(gd, {'legend.x': xf, 'legend.y': yf});
                }
            }
        });
    }
};

function drawTexts(context, gd, d, i, traces) {
    var fullLayout = gd._fullLayout,
        trace = d[0].trace,
        isPie = Plots.traceIs(trace, 'pie'),
        traceIndex = trace.index,
        name = isPie ? d[0].label : trace.name;

    var text = d3.select(context).selectAll('text.legendtext')
        .data([0]);
    text.enter().append('text').classed('legendtext', true);
    text.attr({
        x: 40,
        y: 0,
        'data-unformatted': name
    })
    .style('text-anchor', 'start')
    .classed('user-select-none', true)
    .call(Drawing.font, fullLayout.legend.font)
    .text(name);

    function textLayout(s) {
        Plotly.util.convertToTspans(s, function() {
            if(gd.firstRender) {
                computeLegendDimensions(gd, traces);
                expandMargin(gd);
            }
        });
        s.selectAll('tspan.line').attr({x: s.attr('x')});
    }

    if(gd._context.editable && !isPie) {
        text.call(Plotly.util.makeEditable)
            .call(textLayout)
            .on('edit', function(text) {
                this.attr({'data-unformatted': text});
                this.text(text)
                    .call(textLayout);
                if(!this.text()) text = ' \u0020\u0020 ';
                Plotly.restyle(gd, 'name', text, traceIndex);
            });
    }
    else text.call(textLayout);
}

function computeLegendDimensions(gd, traces) {
    var fullLayout = gd._fullLayout,
        opts = fullLayout.legend,
        borderwidth = opts.borderwidth;

    opts.width = 0;
    opts.height = 0;

    traces.each(function(d) {
        var trace = d[0].trace,
            g = d3.select(this),
            bg = g.selectAll('.legendtoggle'),
            text = g.selectAll('.legendtext'),
            tspans = g.selectAll('.legendtext>tspan'),
            tHeight = opts.font.size * 1.3,
            tLines = tspans[0].length || 1,
            tWidth = text.node() && Drawing.bBox(text.node()).width,
            mathjaxGroup = g.select('g[class*=math-group]'),
            textY,
            tHeightFull;

        if(!trace.showlegend) {
            g.remove();
            return;
        }

        if(mathjaxGroup.node()) {
            var mathjaxBB = Drawing.bBox(mathjaxGroup.node());
            tHeight = mathjaxBB.height;
            tWidth = mathjaxBB.width;
            mathjaxGroup.attr('transform','translate(0,' + (tHeight / 4) + ')');
        }
        else {
            // approximation to height offset to center the font
            // to avoid getBoundingClientRect
            textY = tHeight * (0.3 + (1 - tLines) / 2);
            text.attr('y', textY);
            tspans.attr('y', textY);
        }

        tHeightFull = Math.max(tHeight * tLines, 16) + 3;

        g.attr('transform',
            'translate(' + borderwidth + ',' +
                (5 + borderwidth + opts.height + tHeightFull / 2) +
            ')'
        );
        bg.attr({x: 0, y: -tHeightFull / 2, height: tHeightFull});

        opts.height += tHeightFull;
        opts.width = Math.max(opts.width, tWidth || 0);
    });

    opts.width += 45 + borderwidth * 2;
    opts.height += 10 + borderwidth * 2;

    if(helpers.isGrouped(opts)) {
        opts.height += (opts._lgroupsLength-1) * opts.tracegroupgap;
    }

    traces.selectAll('.legendtoggle')
        .attr('width', (gd._context.editable ? 0 : opts.width) + 40);

    // make sure we're only getting full pixels
    opts.width = Math.ceil(opts.width);
    opts.height = Math.ceil(opts.height);
}

function expandMargin(gd) {
    var fullLayout = gd._fullLayout,
        opts = fullLayout.legend;

    var xanchor = 'left';
    if(anchorUtils.isRightAnchor(opts)) {
        xanchor = 'right';
    }
    else if(anchorUtils.isCenterAnchor(opts)) {
        xanchor = 'center';
    }

    var yanchor = 'top';
    if(anchorUtils.isBottomAnchor(opts)) {
        yanchor = 'bottom';
    }
    else if(anchorUtils.isMiddleAnchor(opts)) {
        yanchor = 'middle';
    }

    // lastly check if the margin auto-expand has changed
    Plots.autoMargin(gd, 'legend', {
        x: opts.x,
        y: opts.y,
        l: opts.width * ({right: 1, center: 0.5}[xanchor] || 0),
        r: opts.width * ({left: 1, center: 0.5}[xanchor] || 0),
        b: opts.height * ({top: 1, middle: 0.5}[yanchor] || 0),
        t: opts.height * ({bottom: 1, middle: 0.5}[yanchor] || 0)
    });
}

function expandHorizontalMargin(gd) {
    var fullLayout = gd._fullLayout,
        opts = fullLayout.legend;

    var xanchor = 'left';
    if(anchorUtils.isRightAnchor(opts)) {
        xanchor = 'right';
    }
    else if(anchorUtils.isCenterAnchor(opts)) {
        xanchor = 'center';
    }

    // lastly check if the margin auto-expand has changed
    Plots.autoMargin(gd, 'legend', {
        x: opts.x,
        y: 0.5,
        l: opts.width * ({right: 1, center: 0.5}[xanchor] || 0),
        r: opts.width * ({left: 1, center: 0.5}[xanchor] || 0),
        b: 0,
        t: 0
    });
}
