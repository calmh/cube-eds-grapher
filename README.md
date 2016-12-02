# This project is not actively maintained

Issues and pull requests on this repository may not be acted on in a timely
manner, or at all.  You are of course welcome to use it anyway. You are even
more welcome to fork it and maintain the results.

![Unmaintained](https://nym.se/img/unmaintained.jpg)

cube-eds-grapher
================

Graphs environmental data (temperature and power consumption) as extracted from
a [Cube][cube] instance. It is expected that Cube is populated with data by
[cube-eds-poller][poller] or something with a compatible schema.

[cube]: http://square.github.com/cube/
[poller]: https://github.com/calmh/cube-eds-poller

Screenshot & Demo
-----------------

A [live demo](http://power.nym.se/) (my home installation) is available for public consumption.

![Screenshot](https://raw.github.com/calmh/cube-eds-grapher/master/screenshot.png)

Installation
------------

 - Clone, run `make`. You'll need to have `node` and `npm` available.
 - Edit `public/config.json` to point at your Cube installation.
 - Let your favorite web server serve the files from the `public` directory.

License
-------

MIT


