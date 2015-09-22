module.exports = function(grunt) {

    var checkFiles = [
        'config/**/*.js',
        '*.js'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jscs: {
            default: {
                src: checkFiles,
                options: {
                    config: '.jscs.json',
                    disallowImplicitTypeConversion: []
                }
            }
        },
        jshint: {
            default: {
                src: checkFiles,
                options: {
                    jshintrc: '.jshintrc'
                }
            }
        },
        mochaTest: {
            unit: {
                options: {
                    timeout: 5000,
                    globals: ['basePath'],
                    reporter: 'spec'
                },
                src: ['test/spechelper.js', 'test/**/*.spec.js']
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        }
    });

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-jscs-checker');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('check', ['jshint:default', 'jscs:default']);
    grunt.registerTask('test', ['mochaTest:unit']);
};
