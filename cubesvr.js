var aggregate = require('filters').aggregate;
var average = require('filters').average;
var http = require('http');
var median = require('filters').median;
var sprintf = require('sprint');

module.exports = exports = function CubeSvr(candidates) {
    var self = {};
    self.host = undefined;
    self.probe = probe;
    self.getData = getData;
    self.getPower = getPower;
    self.getTemperature = getTemperature;
    self.getWeeklyTemperature = getWeeklyTemperature;
    self.getWeeklyPower = getWeeklyPower;
    self.analyze = analyze;

    if (typeof window !== 'undefined') {
        // Browser
        self.get = browserHttpGet;
    } else {
        // Node
        self.get = nodeHttpGet;
    }

    return self;
};

// ---

function getWeek(date) {
    dowOffset = 1;
    var newYear = new Date(date.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((date.getTime() - newYear.getTime() - (date.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            nYear = new Date(date.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
};

// ---

function nodeHttpGet(url, cb) {
    var req = http.get(url, function (res) {
        var data = '';

        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {
            var obj = JSON.parse(data);
            cb(obj);
        });

        res.on('error', function () {
            // Ignore
        });
    });

    req.on('error', function () {
        // Ignore
    });
}

function browserHttpGet(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            cb(JSON.parse(xhr.responseText));
        }
    }
    xhr.open('GET', url, true);
    xhr.send();
}

function probe(candidates, cb) {
    var self = this;
    candidates.forEach(function (cand) {
        self.get(cand + '/1.0/metric?expression=sum(reading(impulses))&step=3e5&limit=1', function(data) {
            if (!self.host && data && data[0] && data[0].time) {
                self.host = cand;
                if (cb && typeof cb === 'function') {
                    cb();
                }
            }
        });
    });
}

// ---

function getData(path, cb) {
    var self = this;
    self.get(self.host + path, function (data) {
        //data = data.filter(function (o) { return !!o.value; });
        data = data.map(function (o) { return [(new Date(o.time)).getTime(), o.value]; });
        cb(data);
    });
}

function getPower(step, count, cb) {
    this.getData('/1.0/metric?expression=sum(reading(impulses))*3600000%2f' + step + '&step=' + step + '&limit=' + count, cb);
}

function getTemperature(step, count, cb) {
    this.getData('/1.0/metric?expression=median(reading(temperature))&step=' + step + '&limit=' + count, function (data) {
        data = data.filter(function (x) { return !!x[1]; });
        cb(data);
    });
}

function byWeek(k) {
    var d = new Date(k);
    var y = d.getFullYear();
    var w = getWeek(d);
    return sprintf('%d-%02d', y, w);
    //return Math.floor(k / (1000 * 86400 * 3));
}

function getWeeklyTemperature(cb) {
    this.getTemperature('36e5', 8760, function (data) {
        data = aggregate(data, byWeek); 
        cb(data);
    });
}

function getWeeklyPower(cb) {
    this.getData('/1.0/metric?expression=sum(reading(impulses))&step=864e5&limit=365', function (data) {
        data = aggregate(data, byWeek);
        cb(data);
    });
}

/*
 * [[t0, v0], [t1, v1], ...] => { t: { min, max, ... }, v: { min, max, ... }, data: [{time: ..., value: ...}, ...] }
*/
function analyze(data, aggf) {
    var ta = aggregate(data.map(function (i) { return [i[1], i[0]]; }), function (x) { return 'aggr'; })[0][1];
    var va = aggregate(data, function (x) { return 'aggr'; })[0][1];
    var d = data.map(function (i) { return { time: i[0], value: i[1] }; });
    var res = { t: ta, v: va, data: d };

    if (aggf && typeof aggf === 'function') {
        res.aggr = aggregate(data, aggf);
    }

    return res;
}

