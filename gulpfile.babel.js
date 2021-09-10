/**
 * Load Plugins.
 *
 * Load gulp plugins and passing them semantic names.
 */
import { dest, parallel, src, series, watch } from 'gulp';

// CSS related plugins.
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';
import nodeSass from 'node-sass';
import gulpSass from 'gulp-sass';
import sourcemaps from 'gulp-sourcemaps';
import styleLint from 'gulp-stylelint';

// JS related plugins.
import eslint from 'gulp-eslint';
import named from 'vinyl-named';
import webpack from 'webpack';
import webpackStream from 'webpack-stream';
import webpackConfig from './webpack.config.js';

// Utility related plugins.
import browserSync from 'browser-sync';
import del from 'del';
import notify from 'gulp-notify';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';

const sass = gulpSass( nodeSass );
const server = browserSync.create();

/**
 * Custom Error Handler.
 *
 * @param {Object} error
 */
const errorHandler = error => {
	notify.onError( {
		title: 'Gulp error in ' + error.plugin,
		message: error.toString(),
		sound: false,
	} )( error );
};

/**
 * Task: `browsersync`.
 *
 * Live Reloads, CSS injections, Localhost tunneling.
 *
 * {@link} http://www.browsersync.io/docs/options/
 *
 * BrowserSync options can be overwritten by gulp.config.local.js file.
 *
 * @param {*} done Done.
 */
const browsersync = done => {
	server.init( {
		open: false, // For when testing locally only
		injectChanges: true,
		watchEvents: [ 'change', 'add', 'unlink', 'addDir', 'unlinkDir' ],
		proxy: 'testingenv.loc/', // Your local environment site from XAMPP, VVV, or the like
		// tunnel: 'restmap', // For use if not on same wifi
	} );
	done();
};
browsersync.description = 'Load browser sync for local development.';

// Helper function to allow browser reload with Gulp 4.
const reload = done => {
	server.reload();
	done();
};

/**
 * Task: `sassLinter`.
 * This task does the following:
 *    1. Gets all our scss files
 *    2. Lints theme files to keep code up to standards and consistent
 */
export const sassLinter = () => {
	return src( './src/sass/**/*.scss' )
		.pipe( plumber( errorHandler ) )
		.pipe( styleLint( {
			syntax: 'scss',
			reporters: [ {
				formatter: 'string',
				console: true,
			} ],
		} ) );
};
sassLinter.description = 'Lint through all our SASS/SCSS files so our code is consistent across files.';

/**
 * Task: `css`.
 *
 * This task does the following:
 *    1. Gets the source scss file
 *    2. Compiles Sass to CSS
 *    3. Writes Sourcemaps for it
 *    4. Autoprefixes it
 *    5. Renames the CSS file with suffix .min.css
 *    6. Minifies the CSS file and generates *.min.css
 *    7. Injects CSS or reloads the browser via server
 *
 * @param {Function} done Callback function for async purposes.
 */
export const css = done => {
	del( './assets/css/*' );

	src( './src/sass/main.scss' )
		.pipe( sourcemaps.init() )
		.pipe( plumber( errorHandler ) )
		.pipe( sass( { outputStyle: 'expanded' } ).on( 'error', sass.logError ) )
		.pipe( dest( './assets/css' ) )
		.pipe( autoprefixer( {
			cascade: false,
		} ) )
		.pipe( cleanCSS( {
			level: {
				2: {
					all: false,
					mergeIntoShorthands: true,
					mergeMedia: true,
				},
			},
		} ) )
		.pipe( rename( { suffix: '.min' } ) )
		.pipe( sourcemaps.write( '.', {
			includeContent: false,
			sourceRoot: '../../src/sass',
		} ) )
		.pipe( dest( './assets/css' ) )
		.pipe( server.stream( {
			match: '**/*.css', // Sourcemap is in stream so match for actual CSS files
		} ) );

	done();
};
css.description = 'Compiles Sass, Autoprefixes it and Minifies CSS.';

/**
 * Task: `jsLinter`.
 * This task does the following:
 *    1. Gets all our theme files
 *    2. Lints theme files to keep code up to standards and consistent
 */
export const jsLinter = () => {
	return src( [
		'./src/js/**/*.js',
		'!src/js/vendor/**',
		'!src/js/**/*.min.js',
	] )
		.pipe( eslint() )
		.pipe( eslint.format() );
};
jsLinter.description = 'Linter for JavaScript';

/**
 * Task: `js`.
 *
 * This task does the following:
 *     1. Gets the source folder for JS files
 *     2. Concatenates all the files and generates *.js
 *     3. Renames the JS file with suffix .min.js
 *     4. Uglifies/Minifies the JS file and generates *.min.js
 */
export const js = () => {
	// Clean up old files.
	del( './assets/js/*' );

	return src( './src/js/*.js' )
		.pipe( plumber( errorHandler ) )
		.pipe( named() )
		.pipe( webpackStream( webpackConfig, webpack ) )
		.pipe( dest( './assets/js/' ) )
		.pipe( server.reload( {
			match: '**/*.js', // Sourcemap is in stream so match for actual JS files
			stream: true,
		} ) );
};
js.description = 'Run all JS compression and sourcemap work.';

export const styles  = series( sassLinter, css );
export const scripts = series( jsLinter, js );
export const lint    = parallel( sassLinter, jsLinter );
export const build   = parallel( css, js );

/**
 * Watch Tasks.
 */
export const dev = series( lint, build, browsersync, () => {
	watch( './**/*.php', reload ); // Reload on PHP file changes.
	watch( './src/sass/**/*.scss', styles ); // Reload on SCSS file changes.
	watch( './src/js/**/*.js', scripts ); // Reload on JS file changes.
} );
dev.description = 'Start up our full dev workflow.';

export default dev;
