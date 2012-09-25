var domready = require('domready');
var Cube = require('./cubesvr');

// --- "Instant" meter ---

var p = 0.015;
var donut, arcs, svg, label, percentileLabel, maxArc;
var r, arc, arc2, arc3;
var pointerColor = d3.scale.linear().range(['green', 'green', 'red']);

function setupInstant() {
    var gauge = d3.select('div#gauge');

    r = Math.round(gauge.style('width').replace('px', '') / 2);
    arc = d3.svg.arc().innerRadius(Math.round(r * 0.5)).outerRadius(Math.round(r * 0.95));
    arc2 = d3.svg.arc().innerRadius(Math.round(r * 0.45)).outerRadius(Math.round(r * 0.52));
    arc3 = d3.svg.arc().innerRadius(Math.round(r * 0.95)).outerRadius(Math.round(r * 1.00));

    donut = d3.layout.pie().sort(null).startAngle(-Math.PI * 0.55).endAngle(Math.PI * 0.55);

    svg = gauge.append('svg:svg')
    .attr('width', r * 2)
    .attr('height', r * 1.15)
    .append('svg:g')
    .attr('transform', 'translate(' + r + ',' + r + ')');

    arcs = svg.selectAll('path.instant')
    .data(donut([0, p, 1-p]))
    .enter().append('svg:path')
    .attr('class', function (d, i) { return 'instant segment-' + i; })
    .attr('d', arc);

    label = svg.selectAll('text.centerLabel')
    .data(['0W'])
    .enter()
    .append('svg:text')
    .attr('class', 'centerLabel')
    .text(String);

    maxArc = svg.selectAll('path.median').data(donut([0, 0, 99]))
    .enter().append('svg:path')
    .attr('class', function (d, i) { return 'median segment-' + i; })
    .attr('d', arc2);
}

function instant(data) {
    var val = data.data[data.data.length - 1].value;

    label = label.data([val]).text(function (v) { return Math.round(v) + 'W'; });

    var pointer = p * 100;
    var cval = val / data.v.max * 100;
    cval = Math.min(cval, 100 - pointer);
    var rem = 100 - cval - pointer;
    arcs = arcs.data(donut([ cval, pointer, rem ]));

    pointerColor = pointerColor.domain([data.v.min, data.v.med, data.v.max]);
    arcs.transition()
    .ease('bounce')
    .duration(500)
    .attrTween('d', tween)

    pointer = 2 * p * 100;
    var avg = data.v.med / data.v.max * 100;
    rem = 100 - avg - pointer;

    maxArc = maxArc
    .data(donut([avg, pointer, rem]))
    .attr('d', arc2);
}

var prevVals = {
    0:{startAngle: -0.55 * Math.PI, endAngle: -0.55 * Math.PI},
    1:{startAngle: -0.55 * Math.PI, endAngle: (p - 0.55) * Math.PI},
    2:{startAngle: (p - 0.55) * Math.PI, endAngle: 0.55 * Math.PI},
};

function tween(d, i, a) {
    var ip = d3.interpolate({startAngle: 0, endAngle: 0}, d);
    if (prevVals[i]) {
        ip = d3.interpolate({startAngle: prevVals[i].startAngle, endAngle: prevVals[i].endAngle}, d);
    }
    prevVals[i] = d;
    return function(t) {
        return arc(ip(t));
    };
}

// ---

function lines(data, opts) {
    var container = d3.select('#' + opts.tag);
    var w = container.style('width').replace('px', '');
    var h = container.style('height').replace('px', '');
    var rightMargin = 40;

    // Scales. Note the inverted domain for the y-scale: bigger is up!
    var x = d3.time.scale().range([0, w - rightMargin]),
    y = d3.scale.linear().range([h-13, 10]);

    // An area generator, for the light fill.
    var area = d3.svg.area()
    .interpolate('monotone')
    .x(function(d) { return x(d.time); })
    .y0(h-13)
    .y1(function(d) { return y(d.value); });

    var line = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.value); });

    var xFormat = d3.time.format('%H:%M');
    var yFormat = d3.format('.3s');
    var xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(xFormat);
    var yAxis = d3.svg.axis().scale(y).orient('right').tickFormat(yFormat);

    x.domain([data.t.min, data.t.max]);
    if (opts.float) {
        y.domain([data.v.min, data.v.max]).nice();
    } else {
        y.domain([0, data.v.max]).nice();
    }

    d3.select('#' + opts.tag + '-svg').remove();

    var svg = container.append('svg:svg')
    .attr('id', opts.tag + '-svg')
    .attr('width', w)
    .attr('height', h);

    if (!opts.float) {
        svg
        .append('svg:path')
        .attr('class', 'area')
        .attr('d', function (d) { return area(data.data); });
    }

    svg.append('svg:g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, 10)')
    .call(xAxis.ticks(6).tickSubdivide(2).tickSize(h-20));

    svg.append('svg:g')
    .attr('class', 'y axis')
    //.attr('transform', 'translate(' + w + ', 0)')
    .call(yAxis.ticks(6).tickSubdivide(0).tickSize(w - rightMargin));

    svg
    .append('svg:path')
    .attr('class', 'line')
    .attr('d', function (d) { return line(data.data); });
}

function weekbar(data)
{
    var container = d3.select('div#week');
    var w = container.style('width').replace('px', '');
    var h = container.style('height').replace('px', '');
    var p = [20, 5, 20, 5];
    var x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]], 0.15);
    var y = d3.scale.linear().range([0, h - p[0] - p[2]]);
    var format = function (d) { var d = new Date(d.time); return d.getDate() + '/' + (d.getMonth() + 1); };
    var yFormat = d3.format('.3s');

    var svg = container.append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");

    var times = data.data.map(function (x) { return x.time; });
        x.domain(times);
        y.domain([0, data.v.max]).nice();

        var cause = svg.selectAll("g.cause")
        .data([data.data])
        .enter().append("svg:g")
        .attr("class", "bars");

        cause.selectAll("rect")
        .data(Object)
        .enter().append("svg:rect")
        .attr("x", function(d) { return x(d.time); })
        .attr("y", function (d) { return -y(d.value); })
        .attr("height", function(d) { return y(d.value); })
        .attr("width", x.rangeBand());

        svg.selectAll("text.bar-amount")
        .data(data.data)
        .enter().append("svg:text")
        .attr("class", "bar-amount")
        .attr("x", function (d) { return x(d.time) + x.rangeBand() / 2; })
        .attr("y", function (d) { return  -y(d.value); })
        .attr("text-anchor", "middle")
        .attr("dy", "-.4em")
        .text(function (d) { return yFormat(d.value); });

        svg.selectAll("text.bar-label")
        .data(data.data)
        .enter().append("svg:text")
        .attr("class", "bar-label")
        .attr("x", function(d) { return x(d.time) + x.rangeBand() / 2; })
        .attr("y", 6)
        .attr("text-anchor", "middle")
        .attr("dy", ".71em")
        .text(format);
}

function mmarea(data, opts) {
    var container = d3.select('#' + opts.tag);
    var w = container.style('width').replace('px', '');
    var h = container.style('height').replace('px', '');
    var rightMargin = 40;

    // Scales. Note the inverted domain for the y-scale: bigger is up!
    var x = d3.time.scale().range([0, w - rightMargin]),
    y = d3.scale.linear().range([h-13, 10]);

    var area1 = d3.svg.area()
    .interpolate('monotone')
    .x(function(d) { return x(d[0]); })
    .y0(function(d) { return y(d[1].min); })
    .y1(function(d) { return y(d[1].med); });

    var area2 = d3.svg.area()
    .interpolate('monotone')
    .x(function(d) { return x(d[0]); })
    .y0(function(d) { return y(d[1].med); })
    .y1(function(d) { return y(d[1].max); });

    var line1 = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return x(d[0]); })
    .y(function(d) { return y(d[1].min); });

    var line2 = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return x(d[0]); })
    .y(function(d) { return y(d[1].max); });

    var xFormat = function (d) { var d = new Date(d); return d.getDate() + '/' + (d.getMonth() + 1); };
    var yFormat = d3.format('.3s');
    var xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(xFormat);
    var yAxis = d3.svg.axis().scale(y).orient('right').tickFormat(yFormat);

    x.domain([data.t.min, data.t.max]);
    y.domain([data.v.min - 2, data.v.max + 2]).nice();

    d3.select('#' + opts.tag + '-svg').remove();

    var svg = container.append('svg:svg')
    .attr('id', opts.tag + '-svg')
    .attr('width', w)
    .attr('height', h);

    svg.append('svg:path')
    .attr('class', 'area1')
    .attr('d', function (d) { return area1(data.aggr); });

    svg.append('svg:path')
    .attr('class', 'area2')
    .attr('d', function (d) { return area2(data.aggr); });

    svg.append('svg:g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, 10)')
    .call(xAxis.ticks(6).tickSubdivide(2).tickSize(h-20));

    svg.append('svg:g')
    .attr('class', 'y axis')
    .call(yAxis.ticks(6).tickSubdivide(0).tickSize(w - rightMargin));

    svg.append('svg:path')
    .attr('class', 'line')
    .attr('d', function (d) { return line1(data.aggr); });

    svg.append('svg:path')
    .attr('class', 'line')
    .attr('d', function (d) { return line2(data.aggr); });
}

function objKeys(obj)
{
    var keys = [];
    for(var i in obj) {
        if (this.hasOwnProperty(i)) {
            keys.push(i);
        }
    }
    return keys;
}

function monthly(data)
{
    var container = d3.select('div#monthly');
    var w = container.style('width').replace('px', '');
    var h = container.style('height').replace('px', '');
    var p = [20, 5, 20, 5];
    var x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]], 0.15);
    var y = d3.scale.linear().range([0, h - p[0] - p[2]]);
    var monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
    var format = function (d) { var d = new Date(d.time); return monthNames[d.getMonth()]; };
    var yFormat = d3.format('.3s');

    var svg = container.append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");

    var monthDates = data.data.map(function (x) { return x.time; });
    x.domain(monthDates);
    y.domain([0, data.v.max]).nice(); // FIXME

    var cause = svg.selectAll("g.cause")
    .data([data.data])
    .enter().append("svg:g")
    .attr("class", "bars");

    cause.selectAll("rect")
    .data(Object)
    .enter().append("svg:rect")
    .attr("x", function(d) { return x(d.time); })
    .attr("y", function (d) { return -y(d.value); })
    .attr("height", function(d) { return y(d.value); })
    .attr("width", x.rangeBand());

    svg.selectAll("text.bar-amount")
    .data(data.data)
    .enter().append("svg:text")
    .attr("class", "bar-amount")
    .attr("x", function (d) { return x(d.time) + x.rangeBand() / 2; })
    .attr("y", function (d) { return  -y(d.value); })
    .attr("text-anchor", "middle")
    .attr("dy", "-.4em")
    .text(function (d) { return yFormat(d.value); });

    svg.selectAll("text.bar-label")
    .data(data.data)
    .enter().append("svg:text")
    .attr("class", "bar-label")
    .attr("x", function(d) { return x(d.time) + x.rangeBand() / 2; })
    .attr("y", 6)
    .attr("text-anchor", "middle")
    .attr("dy", ".71em")
    .text(format);
}

function next(intv) {
    var now = Date.now();
    return Math.ceil(now / intv) * intv - now;
}

domready(function () {
    setupInstant();
    var cube = new Cube();

    function updateLines() {
        cube.getPower('6e4', 180, function (data) {
            data = cube.analyze(data);
            lines(data, {tag: 'power'});
        });

        cube.getPower('3e5', 432, function (data) {
            data = cube.analyze(data);
            lines(data, {tag: 'lpower'});
        });

        cube.getTemperature('6e4', 180, function (data) {
            data = cube.analyze(data);
            lines(data, {tag: 'temp', float: true});
        });

        cube.getTemperature('3e5', 432, function (data) {
            data = cube.analyze(data);
            lines(data, {tag: 'ltemp', float: true});
        });

        setTimeout(updateLines, next(60000) + 5000);
    }

    function updateTemperatureTrend() {
        cube.getTemperature('36e5', 24*30*12, function (data) {
            var step = 7 * 86400 * 1000; // ms
            data = cube.analyze(data, function (t) { return Math.ceil(t / step) * step; });
            mmarea(data, {tag: 'temptrend'});
        });
    }

    function updateInstant() {
        cube.getPower('6e4', 60, function (data) {
            data = cube.analyze(data);
            instant(data);
        });

        setTimeout(updateInstant, next(60000) + 2500);
    }

    function updateMonthlyPower() {
        cube.getPower('864e5', 365, function (data) {
            data = cube.analyze(data, function (t) {
                var d = new Date(t);
                var m = d.getMonth() + 1;
                if (m < 10) {
                    m = '0' + m;
                }
                return (new Date('' + d.getFullYear() + '-' + m + '-01')).getTime();
            });
            data = data.aggr.map(function (x) { return [x[0], x[1].sum]; });
            data = cube.analyze(data);
            monthly(data);
        });
    }

    function updateDailyPower() {
        cube.getPower('864e5', 14, function (data) {
            data = cube.analyze(data);
            weekbar(data);
        });
    }

    cube.probe(['http://zcube.nym.se:1081', 'http://ext.nym.se:1081'], function () {
        updateInstant();
        updateDailyPower();
        updateLines();
        updateTemperatureTrend();
        updateMonthlyPower();
    });
});
