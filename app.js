var percentiles;
var donut, arcs, svg, label, percentileLabel, maxArc;
var p = 0.015;
var r, arc, arc2, arc3;
var pointerColor = d3.scale.linear().range(['green', 'green', 'red']);
var cubeServer;
var candidates =  [ 'http://zenv.nym.se:1081', 'http://ext.nym.se:1081' ];

function probe(cb) {
    var found = false;
    candidates.forEach(function (cand) {
        d3.json(cand + '/1.0/metric?expression=sum(reading(impulses))&step=3e5&limit=1', function(data) {
            if (!found && data && data[0] && data[0].value) {
                found = true;
                cb(cand);
            }
        });
    });
}

var instantDps = 6; // Ten seconds each, so 12 is a two minute rolling average
var lineStep = '6e4'; // ms
var lineDps = 144; // times lineStep

function load() {
    d3.json(cubeServer + '/1.0/metric?expression=sum(reading(impulses))*3600%2f300&step=3e5&limit=288',
            function(data) {
                var vals = data.map(function (d) { return d.value; });
                vals = vals.filter(function (v) { return !!v; });
                vals.sort(function (a, b) { return a - b; });

                percentiles = {
                    p10: vals[~~(vals.length * 0.1)],
                    p50: vals[~~(vals.length * 0.5)],
                    p90: vals[~~(vals.length * 0.9)],
                    all: vals,
                };

                updateInstant();
            });
}

function instant(dps, callback) {
    d3.json(cubeServer + '/1.0/metric?expression=sum(reading(impulses))&step=1e4&limit=' + dps,
            function(data) {
                var vals = data.map(function (d) { return d.value; });
                var sum = vals.reduce(function (a, b) { return a + b; }, 0);
                sum = sum * 3600 / (vals.length * 10);
                var pct = '>100';

                if (percentiles) {
                    for (var i = 0; i < percentiles.all.length; i++) {
                        if (percentiles.all[i] >= sum) {
                            pct = Math.round(i / percentiles.all.length * 100);
                            break;
                        }
                    }
                }

                callback(sum, pct);
            });
}

function updateInstant(dps) {
    instant(dps, function (val, pct) {
        if (!percentiles) {
            return;
        }

        label = label.data([val]).text(function (v) { return Math.round(v) + 'W'; });
        percentileLabel = percentileLabel.data([pct]).text(function (v) { return v + '%'; });

        // Instant

        var pointer = p * 100;
        var cval = val / percentiles.p90 * 100;
        cval = Math.min(cval, 100 - pointer);
        var rem = 100 - cval - pointer;
        arcs = arcs.data(donut([ cval, pointer, rem ]));

        pointerColor = pointerColor.domain([percentiles.p10, percentiles.p50, percentiles.p90]);
        arcs.transition()
        .ease('bounce')
        .duration(500)
        .attrTween('d', tween)
        .attr('fill', function (d, i) { return ['#eee', pointerColor(val), '#eee'][i]; });

        // 50th and 95th percentile

        pointer = 2 * p * 100;
        var avg = percentiles.p50 / percentiles.p90 * 100;
        rem = 100 - avg - pointer;

        maxArc = maxArc
        .data(donut([avg, pointer, rem]))
        .attr('d', arc2);
    });
}

var prevVals = {
    0:{startAngle: -0.5 * Math.PI, endAngle: -0.5 * Math.PI},
    1:{startAngle: -0.5 * Math.PI, endAngle: (p - 0.5) * Math.PI},
    2:{startAngle: (p - 0.5) * Math.PI, endAngle: 0.5 * Math.PI},
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

function lines(url, tag, float) {
    var w = $('#' + tag).width();
    var h = $('#' + tag).height();
    var rightMargin = 30;

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

    var format = d3.time.format('%H:%M');
    var xAxis = d3.svg.axis().scale(x).orient('bottom');
    var yAxis = d3.svg.axis().scale(y).orient('right').tickFormat(d3.format('.3s'));

    d3.json(url, function (data) {
        var maxVal = data[0].value, minVal = data[0].value;
        for (var i = 0; i < data.length; i++) {
            data[i].value = data[i].value || 0;
            data[i].time = new Date(data[i].time).getTime();
            maxVal = Math.max(maxVal, data[i].value);
            minVal = Math.min(minVal, data[i].value);
        }
        x.domain([data[0].time, data[data.length - 1].time]);
        if (float) {
            y.domain([minVal, maxVal]).nice();
        } else {
            y.domain([0, maxVal]).nice();
        }

        d3.select('#' + tag + '-svg').remove();

        var svg = d3.select('#' + tag).append('svg:svg')
        .attr('id', tag + '-svg')
        .attr('width', w)
        .attr('height', h);

        if (!float) {
            svg
            .append('svg:path')
            .attr('class', 'area')
            .attr('d', function (d) { return area(data); });
        }

        svg.append('svg:g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, 10)')
        .call(xAxis.tickSubdivide(2).tickSize(h-20).tickFormat(format));

        svg.append('svg:g')
        .attr('class', 'y axis')
        //.attr('transform', 'translate(' + w + ', 0)')
        .call(yAxis.tickSubdivide(0).tickSize(w - rightMargin));

        svg
        .append('svg:path')
        .attr('class', 'line')
        .attr('d', function (d) { return line(data); });
    });
}

function updateLines() {
    lines(cubeServer + '/1.0/metric?expression=sum(reading(impulses))*3600000%2f' + lineStep + '&step=' + lineStep + '&limit=' + lineDps, 'power');
    lines(cubeServer + '/1.0/metric?expression=median(reading(temperature))&step=' + lineStep + '&limit=' + lineDps, 'temp', true);
}

$(document).ready(function () {
    probe(function (server) {
        cubeServer = server;
        r = Math.round($('div#gauge').width() / 2);
        arc = d3.svg.arc().innerRadius(Math.round(r * 0.5)).outerRadius(Math.round(r * 0.95));
        arc2 = d3.svg.arc().innerRadius(Math.round(r * 0.45)).outerRadius(Math.round(r * 0.52));
        arc3 = d3.svg.arc().innerRadius(Math.round(r * 0.95)).outerRadius(Math.round(r * 1.00));

        load();
        setInterval(load, 600 * 1000);

        donut = d3.layout.pie().sort(null).startAngle(-Math.PI * 0.55).endAngle(Math.PI * 0.55);

        svg = d3.select('div#gauge').append('svg:svg')
        .attr('width', r * 2)
        .attr('height', r * 1.15)
        .append('svg:g')
        .attr('transform', 'translate(' + r + ',' + r + ')');

        arcs = svg.selectAll('path.meter')
        .data(donut([0, p, 1-p]))
        .enter().append('svg:path').attr('class', 'meter')
        .attr('fill', function (d, i) { return [ '#eee', '#000', '#eee', ][i]; })
        .attr('d', arc);

        label = svg.selectAll('text.centerLabel')
        .data(['0W'])
        .enter()
        .append('svg:text')
        .attr('class', 'centerLabel')
        .attr('font-size', Math.round(r * 0.2))
        .attr('dy', Math.round(r * -0.04))
        .text(String);

        percentileLabel = svg.selectAll('text.percentile')
        .data(['0%'])
        .enter()
        .append('svg:text')
        .attr('class', 'percentile')
        .attr('font-size', Math.round(r * 0.1))
        .attr('dy', Math.round(r * 0.1))
        .text(String);

        maxArc = svg.selectAll('path.max').data(donut([0, 0, 99]))
        .enter().append('svg:path').attr('class', 'max')
        .attr('fill', function (d, i) { return ['#ddd', '#333', '#ddd'][i]; })
        .attr('d', arc2);

        setInterval(function () {
            updateInstant(instantDps);
        }, 5000);

        updateLines();
        setInterval(updateLines, 30000);
    });
});
