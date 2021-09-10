/**
 * Load Plugins.
 *
 * Load gulp plugins and passing them semantic names.
 */
import { dest, src, series, watch } from 'gulp';

// CSS related plugins.
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';
import nodeSass from 'node-sass';
import gulpSass from 'gulp-sass';

// JS related plugins.
import jshint from 'gulp-jshint';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';

// Utility related plugins.
import browserSync from 'browser-sync';
import notify from 'gulp-notify';
import plumber from 'gulp-plumber';
import rename from 'gulp-rename';

const sass = gulpSass( nodeSass );
const server = browserSync.create();

/**
 * Custom Error Handler.
 *
 * @param Mixed error
 */
const errorHandler = error => {
	notify.onError( {
		title: 'Gulp error in ' + error.plugin,
		message: error.toString(),
		sound: false
	} )( error );
};

/**
 * Task: `browsersync`.
 *
 * Live Reloads, CSS injections, Localhost tunneling.
 * @link http://www.browsersync.io/docs/options/
 *
 * BrowserSync options can be overwritten by gulp.config.local.js file.
 *
 * @param {Mixed} done Done.
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
 */
export const styles = done => {
	src( 'css/sass/main.scss' )
		.pipe( sass() )
		.pipe( autoprefixer() )
		.pipe( cleanCSS() )
		.pipe( rename( {
			basename: 'style',
			suffix: '.min'
		} ) )
		.pipe( dest('css') )
		.pipe( server.stream( {
			match: '**/*.css' // Sourcemap is in stream so match for actual CSS files
		} ) );

	done();
};
styles.description = 'Compiles Sass, Autoprefixes it and Minifies CSS.';

/**
 * Handle JS build.
 */
export const scripts = () => {
	return src( [
			'js/vendor/tabletop.min.js',
			'js/vendor/markerclusterer.js',
			'js/main.js'
		] )
		.pipe( plumber( errorHandler ) )
		.pipe( jshint() )
		.pipe( jshint.reporter('default') )
		.pipe( concat('init.js') )
		.pipe( uglify() )
		.pipe( rename( {
			suffix: '.min'
		} ) )
		.pipe( dest('js') )
		.pipe( server.reload( {
			match: '**/*.js', // Sourcemap is in stream so match for actual JS files
			stream: true
		} ) );
};
scripts.description = 'Run all JS compression and sourcemap work.';

/**
 * Watch Tasks.
 */
export const dev = series( styles, scripts, browsersync, () => {
	watch( '**/*.php', reload ); // Reload on PHP file changes.
	watch( 'css/**/*.scss', styles ); // Reload on SCSS file changes.
	watch( ['js/*.js', '!js/*.min.js'], scripts ); // Reload on JS file changes.
} );
dev.description = 'Start up our full dev workflow.';

export default dev;
