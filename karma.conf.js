// Karma configuration
// Generated on Mon Feb 19 2018 09:16:45 GMT+0100 (W. Europe Standard Time)

module.exports = function (config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ["jasmine", "karma-typescript"],

    karmaTypescriptConfig: {
      tsconfig: "./tsconfig.test.json",
      reports: {
        html: {
          combineBrowserReports: true,
        },
      },
      coverageOptions: {
        exclude: [/\.(d|spec|test)\.ts$/i, /^src\/worker\.ts$/i],
      },
    },

    // list of files / patterns to load in the browser
    files: [
      "spec/**/*.ts",
      "src/**/*.ts",
      { pattern: "spec/js/*.js", included: false, served: true },
    ],

    // list of files / patterns to exclude
    exclude: [],

    proxies: {
      "/js/": "/base/spec/js/",
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      "**/*.ts": ["karma-typescript"],
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["progress", "karma-typescript"],

    coverageReporter: {
      type: "lcov", // lcov or lcovonly are required for generating lcov.info files
      dir: "coverage/",
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ["Chrome"],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
  });
};
