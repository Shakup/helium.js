module.exports = function(grunt){

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		banner: '/*\n' +
			' * <%= pkg.name %> - version <%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
			' * <%= pkg.description %>\n' +
			' * Author: <%= pkg.author %>\n' +
			' * Homepage: <%= pkg.homepage %>\n' +
			' */\n',
		
		usebanner: {
			dist: {
				options: {
					position: 'top',
					banner: '<%= banner %>'
				},
				files: {
					src: ['dist/helium.js', 'dist/helium.min.js']
				}
			}
		},

		replace: {
			dist: {
				src: ['dist/helium.js'],
				overwrite: true,
				replacements: [
					{
						from: '{{version}}',
						to: '<%= pkg.version %>'
					}
				]
			}
		},

		uglify: {
			options: {
				mangle: true,
				sourceMap: true
			},
			dist: {
				files: {
					'dist/helium.min.js': ['dist/helium.js']
				}
			}
		},

		includes: {
			files: {
				src: ['src/helium.js'],
				dest: 'dist/helium.js',
				flatten: true,
				cwd: '.',
			}
		},

		copy: {
			test: {
				files: [
					{
						src: 'dist/helium.js',
						dest: 'test/assets/js/libs/helium.js',
					}
				]
			}
		},

		watch: {
			scripts: {
				files: ['src/*.js'],
				tasks: ['includes', 'uglify', 'replace', 'usebanner', 'copy:test']
			}
		},

		notify_hooks: {
			options: {
				enabled: true,
				max_jshint_notifications: 2,
				title: "helium.js",
				success: true,
				duration: 1
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-banner');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-includes');

	grunt.task.run('notify_hooks');
	
	grunt.registerTask('default', ['includes', 'uglify', 'replace', 'usebanner', 'copy:test']);
}