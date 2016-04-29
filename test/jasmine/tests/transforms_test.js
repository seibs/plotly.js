var Plotly = require('@lib/index');
var Plots = require('@src/plots/plots');
var Lib = require('@src/lib');

var d3 = require('d3');
var createGraphDiv = require('@assets/create_graph_div');
var destroyGraphDiv = require('@assets/destroy_graph_div');

Plotly.register([
    require('@assets/transforms/filter'),
    require('@assets/transforms/groupby')
]);


describe('one-to-one transforms:', function() {
    'use strict';

    var mockData0 = [{
        x: [-2, -1, -2, 0, 1, 2, 3],
        y: [1, 2, 3, 1, 2, 3, 1],
        transforms: [{
            type: 'filter',
            operation: '>'
        }]
    }];

    var mockData1 = [Lib.extendDeep({}, mockData0[0]), {
        x: [20, 11, 12, 0, 1, 2, 3],
        y: [1, 2, 3, 2, 5, 2, 0],
        transforms: [{
            type: 'filter',
            operation: '<',
            value: 10
        }]
    }];

    afterEach(destroyGraphDiv);

    it('supplyTraceDefaults should supply the transform defaults', function() {
        var traceIn = {
            y: [2, 1, 2],
            transforms: [{ type: 'filter' }]
        };

        var traceOut = Plots.supplyTraceDefaults(traceIn, 0, {});

        expect(traceOut.transforms).toEqual([{
            type: 'filter',
            operation: '=',
            value: 0,
            filtersrc: 'x'
        }]);
    });

    it('supplyDataDefaults should apply the transform', function() {
        var dataIn = [{
            x: [-2, -1, -2, 0, 1, 2, 3],
            y: [1, 2, 3, 1, 2, 3, 1],
            transforms: [{
                type: 'filter',
                operation: '>',
                value: '0',
                filtersrc: 'x'
            }]
        }];

        var dataOut = [];
        Plots.supplyDataDefaults(dataIn, dataOut, {}, []);

        // does not mutate user data
        expect(dataIn[0].x).toEqual([-2, -1, -2, 0, 1, 2, 3]);
        expect(dataIn[0].y).toEqual([1, 2, 3, 1, 2, 3, 1]);
        expect(dataIn[0].transforms).toEqual([{
            type: 'filter',
            operation: '>',
            value: '0',
            filtersrc: 'x'
        }]);

        // applies transform
        expect(dataOut[0].x).toEqual([1, 2, 3]);
        expect(dataOut[0].y).toEqual([2, 3, 1]);
        expect(dataOut[0].transforms).toEqual([]);

        // keep ref to user data
        expect(dataOut[0]._input.x).toEqual([-2, -1, -2, 0, 1, 2, 3]);
        expect(dataOut[0]._input.y).toEqual([1, 2, 3, 1, 2, 3, 1]);
        expect(dataOut[0]._input.transforms).toEqual([{
            type: 'filter',
            operation: '>',
            value: '0',
            filtersrc: 'x'
        }]);

        // keep ref to full transforms array
        expect(dataOut[0]._fullTransforms).toEqual([{
            type: 'filter',
            operation: '>',
            value: 0,
            filtersrc: 'x'
        }]);

        // set index w.r.t. fullData
        expect(dataOut[0].index).toEqual(0);

        // TODO do we really need this ???
        // set _index w.r.t. user data
        expect(dataOut[0]._index).toEqual(0);
    });

    it('Plotly.plot should plot the transform trace', function(done) {
        var data = Lib.extendDeep([], mockData0);

        Plotly.plot(createGraphDiv(), data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(3);

            done();
        });
    });

    it('Plotly.restyle should work', function(done) {
        var data = Lib.extendDeep([], mockData0);
        data[0].marker = { color: 'red' };

        var gd = createGraphDiv();

        function assertTrace() {
            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(3);
        }

        Plotly.plot(gd, data).then(function() {
            assertTrace();
            expect(gd._fullData[0].marker.color).toEqual('red');

            return Plotly.restyle(gd, 'marker.color', 'blue');
        }).then(function() {
            assertTrace();
            expect(gd._fullData[0].marker.color).toEqual('blue');

            return Plotly.restyle(gd, 'marker.color', 'red');
        }).then(function() {
            assertTrace();
            expect(gd._fullData[0].marker.color).toEqual('red');

            return Plotly.restyle(gd, 'transforms[0].value', 2.5);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(1);

            done();
        });
    });

    it('Plotly.extendTraces should work', function(done) {
        var data = Lib.extendDeep([], mockData0);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(gd.data[0].x.length).toEqual(7);
            expect(gd._fullData[0].x.length).toEqual(3);

            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(3);

            return Plotly.extendTraces(gd, {
                x: [ [-3,4,5] ],
                y: [ [1,-2,3] ]
            }, [0]);
        }).then(function() {
            expect(gd.data[0].x.length).toEqual(10);
            expect(gd._fullData[0].x.length).toEqual(5);

            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(5);

            done();
        });
    });

    it('Plotly.deleteTraces should work', function(done) {
        var data = Lib.extendDeep([], mockData1);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            return Plotly.deleteTraces(gd, [1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(3);

            return Plotly.deleteTraces(gd, [0]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(0);
            expect(d3.selectAll('.point').size()).toEqual(0);

            done();
        });

    });

    it('toggling trace visibility should work', function(done) {
        var data = Lib.extendDeep([], mockData1);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            return Plotly.restyle(gd, 'visible', 'legendonly', [1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(1);
            expect(d3.selectAll('.point').size()).toEqual(3);

            return Plotly.restyle(gd, 'visible', false, [0]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(0);
            expect(d3.selectAll('.point').size()).toEqual(0);

            return Plotly.restyle(gd, 'visible', [true, true], [0, 1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            done();
        });
    });

});

describe('one-to-many transforms:', function() {
    'use strict';

    var mockData0 = [{
        mode: 'markers',
        x: [1, -1, -2, 0, 1, 2, 3],
        y: [1, 2, 3, 1, 2, 3, 1],
        transforms: [{
            type: 'groupby',
            groups: ['a', 'a', 'b', 'a', 'b', 'b', 'a'],
            groupColors: { a: 'red', b: 'blue' }
        }]
    }];

    var mockData1 = [Lib.extendDeep({}, mockData0[0]), {
        mode: 'markers',
        x: [20, 11, 12, 0, 1, 2, 3],
        y: [1, 2, 3, 2, 5, 2, 0],
        transforms: [{
            type: 'groupby',
            groups: ['b', 'a', 'b', 'b', 'b', 'a', 'a'],
            groupColors: { a: 'green', b: 'black' }
        }]
    }];

    afterEach(destroyGraphDiv);

    it('Plotly.plot should plot the transform traces', function(done) {
        var data = Lib.extendDeep([], mockData0);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);

            var expected = [4, 3];
            d3.selectAll('.trace').each(function(_, i) {
                var node = d3.select(this);

                expect(node.selectAll('.point').size()).toEqual(expected[i]);
            });

            done();
        });
    });

    it('Plotly.restyle should work', function(done) {
        var data = Lib.extendDeep([], mockData0);
        data[0].marker = { size: 20 };

        var gd = createGraphDiv();

        function assertTrace(color, opacity) {
            var len = [4, 3];

            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            d3.selectAll('.trace').each(function(_, i) {
                var trace = d3.select(this);

                expect(trace.selectAll('.point').size()).toEqual(len[i]);

                trace.selectAll('.point').each(function() {
                    var point = d3.select(this);

                    expect(point.style('fill')).toEqual(color[i]);
                    expect(+point.style('opacity')).toEqual(opacity[i]);
                });
            });
        }

        Plotly.plot(gd, data).then(function() {
            assertTrace(['rgb(255, 0, 0)', 'rgb(0, 0, 255)'], [1, 1]);

            return Plotly.restyle(gd, 'marker.opacity', 0.4);
        }).then(function() {
            assertTrace(['rgb(255, 0, 0)', 'rgb(0, 0, 255)'], [0.4, 0.4]);

            expect(gd._fullData[0].marker.opacity).toEqual(0.4);
            expect(gd._fullData[1].marker.opacity).toEqual(0.4);

            return Plotly.restyle(gd, 'marker.opacity', 1);
        }).then(function() {
            assertTrace(['rgb(255, 0, 0)', 'rgb(0, 0, 255)'], [1, 1]);

            expect(gd._fullData[0].marker.opacity).toEqual(1);
            expect(gd._fullData[1].marker.opacity).toEqual(1);

            return Plotly.restyle(gd, {
                'transforms[0].groupColors': { a: 'green', b: 'red' },
                'marker.opacity': 0.4
            });
        }).then(function() {
            assertTrace(['rgb(0, 128, 0)', 'rgb(255, 0, 0)'], [0.4, 0.4]);

            done();
        });
    });

    it('Plotly.extendTraces should work', function(done) {
        var data = Lib.extendDeep([], mockData0);

        var gd = createGraphDiv();

        function assert(len) {
            expect(d3.selectAll('.trace').size()).toEqual(2);

            d3.selectAll('.trace').each(function(_, i) {
                var trace = d3.select(this);

                expect(trace.selectAll('.point').size()).toEqual(len[i]);
            });
        }

        Plotly.plot(gd, data).then(function() {
            expect(gd.data[0].x.length).toEqual(7);
            expect(gd._fullData[0].x.length).toEqual(4);
            expect(gd._fullData[1].x.length).toEqual(3);

            assert([4, 3]);

            return Plotly.extendTraces(gd, {
                x: [ [-3,4,5] ],
                y: [ [1,-2,3] ],
                'transforms[0].groups': [ ['b', 'a', 'b'] ]
            }, [0]);
        }).then(function() {
            expect(gd.data[0].x.length).toEqual(10);
            expect(gd._fullData[0].x.length).toEqual(5);
            expect(gd._fullData[1].x.length).toEqual(5);

            assert([5, 5]);

            done();
        });
    });

    it('Plotly.deleteTraces should work', function(done) {
        var data = Lib.extendDeep([], mockData1);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(4);
            expect(d3.selectAll('.point').size()).toEqual(14);

            return Plotly.deleteTraces(gd, [1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            return Plotly.deleteTraces(gd, [0]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(0);
            expect(d3.selectAll('.point').size()).toEqual(0);

            done();
        });
    });

    it('toggling trace visibility should work', function(done) {
        var data = Lib.extendDeep([], mockData1);

        var gd = createGraphDiv();

        Plotly.plot(gd, data).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(4);
            expect(d3.selectAll('.point').size()).toEqual(14);

            return Plotly.restyle(gd, 'visible', 'legendonly', [1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(2);
            expect(d3.selectAll('.point').size()).toEqual(7);

            return Plotly.restyle(gd, 'visible', false, [0]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(0);
            expect(d3.selectAll('.point').size()).toEqual(0);

            return Plotly.restyle(gd, 'visible', [true, true], [0, 1]);
        }).then(function() {
            expect(d3.selectAll('.trace').size()).toEqual(4);
            expect(d3.selectAll('.point').size()).toEqual(14);

            done();
        });
    });
});
