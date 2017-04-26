/**
*  PNG\JPEG exporter for C3.js, version 0.2
*  (c) 2014 Yuval Bar-On
*
* usage: path/to/phantomjs phantom-exporter.js output options [WxH]
*
*/

// useful python-styled string formatting, "hello {0}! Javascript is {1}".format("world", "awesome");
if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== 'undefined'
        ? args[number]
        : match
    })
  }
}

// required polyfill, and see dicussion https://github.com/masayuki0812/c3/issues/552#issuecomment-55269072
Function.prototype.bind = Function.prototype.bind || function (thisp) {
  var fn = this
  return function () {
    return fn.apply(thisp, arguments)
  }
}

// defaults
var page = require('webpage').create(),
  fs = require('fs'),
  system = require('system'),
  config = {
    'js': [
      phantom.libraryPath + '/../d3/build/d3.min.js',
      phantom.libraryPath + '/../c3/c3.min.js'
    ],
    'css': [
      phantom.libraryPath + '/../c3/c3.min.css'
    ],

    'template': '<html><head><meta charset="utf-8"><style>{0}</style></head><body><div id="chart"></div></body></html>'
  }

if (system.args.length < 3) {
  console.log('Usage: phantasm.js filename html [WxH]')
  phantom.exit(1)
} else {
  out = system.args[1]
  opts = JSON.parse(system.args[2])

  if (system.args[3]) {
    var dimensions = system.args[3].split('x'),
      width = dimensions[0],
      height = dimensions[1]

    function checkNum (check) {
      check = parseInt(check)
      if (!isNaN(check)) { return check }
      return false
    }

    width = checkNum(width)
    height = checkNum(height)

    if (width && height) {
      page.viewportSize = {
        height: height,
        width: width
      }
    }

        // fit chart size to img size, if undefined
    if (!opts.size) {
      opts.size = {
        'height': height,
        'width': width
      }
    }
  } else {
        // check if size is defined in chart,
        // else apply defaults
    page.viewportSize = {
      height: (opts.size && opts.size.height) ? opts.size.height : 320,
      width: (opts.size && opts.size.width) ? opts.size.width : 710
    }
  }
}

page.onResourceRequested = function (requestData) {
  console.log('::loading resource ', requestData['url'])
}

// helpful debug functions
page.onConsoleMessage = function (msg) {
  console.log(msg)
}

page.onError = function (msg, trace) {
  var msgStack = ['ERROR: ' + msg]

  if (trace && trace.length) {
    msgStack.push('TRACE:')
    trace.forEach(function (t) {
      msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''))
    })
  }

  console.error(msgStack.join('\n'))
}

// render page
function injectVerify (script) {
  var req = page.injectJs(script)
  if (!req) {
    console.log('\nError!\n' + script + ' not found!\n')
    phantom.exit(1)
  }
}

page.onLoadFinished = function () {
  console.log('::rendering')

  for (var j in config.js) {
    injectVerify(config.js[j])
  }

  page.evaluate(function (chartoptions) {
        // phantomjs doesn't know how to handle .bind, so we override
    Function.prototype.bind = Function.prototype.bind || function (thisp) {
      var fn = this
      return function () {
        return fn.apply(thisp, arguments)
      }
    }

        // generate chart
    c3.generate(chartoptions)
  }, opts)

// setting transition to 0 has proven not to work thus far, but 300ms isn't much
// so this is acceptable for now
  setTimeout(function () {
    page.render(out)
    phantom.exit()
  }, 300)
}

//  apply css inline because that usually renders better
var css = ''
for (var i in config.css) {
  css += fs.read(config.css[i])
}
page.content = config.template.format(css)
