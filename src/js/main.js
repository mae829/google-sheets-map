/* global google */
import MarkerClusterer from '@google/markerclusterer';
import Papa from 'papaparse';

( function( w, d ) {
	const sheetID = '{GOOGLE_SHEET_ID}';
	const apiKey = '{GOOGLE_API_KEY}';
	const cacheTime = new URLSearchParams( w.location.search ).get( 'cache' ) || 30 * 24 * 60 * 60 * 1000;
	let useLocalData = true;

	const body = d.querySelector( 'body' );
	const sidebar = d.querySelector( '.sidebar' );
	const mapCanvas = d.querySelector( '.map-canvas' );
	let resizeTimeout = null;

	// our main global object that holds all our info
	const diningMap = {
		map: {},
		bounds: null,
		geoLatLng: null,
		browserLoc: null,
		markers: [],
		clusterer: null,
		infoBox: null,

		// Cluster options
		clusterOptions: {
			gridSize: 50,
			minimumClusterSize: 5,
			enableRetinaIcons: true,
			maxZoom: 13,
			// averageCenter: true,
			styles: [
				{
					url: 'images/m1.png',
					width: 53,
					height: 52,
					textColor: '#fff',
				},
			],
		},

		// Map Settings
		mapStyle: {
			zoom: 12,
			minZoom: 10,
			// center: new google.maps.LatLng( 32.8157, -117.1611 ), // 'san diego'
			// center: new google.maps.LatLng( 32.8093502, -117.2035795 ), // 'clairemont high school'
			center: new google.maps.LatLng( 40.7731282, -74.027772 ), // calculated for manhattan
			mapTypeControl: false,
			fullscreenControl: false,
			rotateControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			streetViewControl: false,
		},
	};

	// Initialize
	diningMap.map = new google.maps.Map( mapCanvas, diningMap.mapStyle );
	diningMap.clusterer = new MarkerClusterer( diningMap.map, null, diningMap.clusterOptions );
	diningMap.bounds = new google.maps.LatLngBounds();
	diningMap.infoBox = new google.maps.InfoWindow();

	w.addEventListener( 'resize', windowResize );

	mobileBodyClass();

	// Add a call to fade in all our markers once the map itself has loaded
	// google.maps.event.addListenerOnce( diningMap.map, 'idle', fadeInMarkers );

	async function getLocalFile() {
		const response = await fetch( './inc/sheetdata.json' );

		if ( ! response.ok ) {
			throw new Error( `HTTP error! status: ${ response.status }` );
		}

		/**
		 * Check if the data is old (more than 30 days or cachebuster)
		 * If it is, make request for new data with Tabletop and save the result into file,
		 * else use the old data
		 */
		let nowTime = new Date();
		const fileTime = new Date( response.headers.get( 'Last-Modified' ) );

		nowTime = nowTime.getTime();
		const fileCachetime = fileTime.getTime() + parseInt( cacheTime );

		useLocalData = nowTime > fileCachetime ? false : true;

		return response.json();
	}

	async function getNewSheets() {
		const googlesheetsResponse = await fetch( `https://sheets.googleapis.com/v4/spreadsheets/${ sheetID }/?key=${ apiKey }` );

		if ( ! googlesheetsResponse.ok ) {
			throw new Error( `HTTP error! status: ${ googlesheetsResponse.status }` );
		}

		const sheetsData = await googlesheetsResponse.json();
		let sheetsTitles = {};
		sheetsData.sheets.forEach( sheetObject => {
			sheetsTitles[ sheetObject.properties.title ] = [];
		} );

		sheetsTitles = { ...sheetsTitles };

		saveSheetsTitles( sheetsTitles );

		return sheetsTitles;
	}

	function saveSheetsTitles( titles ) {
		fetch( './inc/savedata.php', {
			method: 'POST',
			mode: 'same-origin',
			credentials: 'same-origin',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify( {
				type: 'titles',
				dataToSave: titles,
			} ),
		} )
			.then( response => response.json() )
			.then( data => {
				// Since the response will have been JSON but with errors, check that.
				if ( ! data.success ) {
					throw new Error( data.message );
				}
			} )
			.catch( error => {
				console.error( error.message );
			} );
	}

	getLocalFile()
		.then( fileData => {
			if ( useLocalData ) {
				selectSheet( fileData );
			} else {
				getNewSheets()
					.then( data => {
						selectSheet( data );
					} );
			}
		} )
		.catch( error => {
			console.warn( 'Error fetching local file. Fetching new data. Error data:', error );

			getNewSheets()
				.then( data => {
					selectSheet( data );
				} );
		} );

	/**
	 * IF our data only holds one city/sheet, then it will just jump into displaying the markers for that city
	 * or else it will update the UI for city/sheet selection
	 *
	 * @param {Object} data Holds all the data returned by our sheet
	 */
	function selectSheet( data = null ) {
		const cities = Object.keys( data );

		if ( cities.length > 1 ) {
			initOverlay( cities, data );
		} else {
			initMarkers( data[ cities[ 0 ] ] );
		}
	}

	d.querySelector( '.location__close' ).addEventListener( 'click', event => {
		event.preventDefault();

		if ( sidebar.classList.contains( 'open' ) ) {
			sidebar.classList.remove( 'open' );
		}

		return false;
	} );

	/**
	 * Attempt to save our data for cache purposes
	 *
	 * @param {Object} dataToSave JSON data to save to our file.
	 */
	function saveData( dataToSave ) {
		// $.ajax( {
		// 	type: 'POST',
		// 	dataType: 'json',
		// 	data: {
		// 		dataToSave: JSON.stringify( dataToSave ),
		// 	},
		// 	url: 'inc/savedata.php',
		// } );
	}

	function initOverlay( cities, data ) {
		const citiesOverlay = d.querySelector( '.cities__overlay' );
		const selectCities = d.querySelector( '.cities__selection' );

		// Populate div with cities
		for ( const key in cities ) {
			const option = d.createElement( 'option' );
			option.setAttribute( 'value', cities[ key ] );
			option.innerText = cities[ key ];

			selectCities.appendChild( option );
		}

		fadeIn( citiesOverlay );

		selectCities.addEventListener( 'change', () => {
			const city = selectCities.value;

			if ( useLocalData ) {
				initMarkers( data[ city ] );
			} else {
				getNewSheetData( data[ city ] )
					.then( singleSheetData => {
						initMarkers( singleSheetData );
					} )
					.catch( error => {
						throw new Error( `Error fetching single sheet data! response: ${ error }` );
					} );
			}

			fadeOut( citiesOverlay );
		} );
	}

	async function getNewSheetData( sheetName ) {
		const response = await fetch( `https://docs.google.com/spreadsheets/d/${ sheetID }/gviz/tq?tqx=out:csv&sheet=${ sheetName }&tq=SELECT *` );

		if ( ! response.ok ) {
			throw new Error( `Error fetching single sheet data! status: ${ response.status }` );
		}

		let sheetData = await response.text();

		sheetData = Papa.parse( sheetData, { header: true } );

		return sheetData.data;
	}

	/**
	 * Initialize all the markers
	 *
	 * @param {Object} data Holds all the data from our sheet
	 */
	function initMarkers( data ) {
		for ( let i = 0; i < data.length; i++ ) {
			const result = data[ i ];

			// Make sure the data returned had lat/long
			if ( result.Latitude !== '' && result.Longitude !== '' && result.Status === '' ) {
				const latLng = new google.maps.LatLng( result.Latitude, result.Longitude );
				// const title = result.Name;
				const pinColor = result[ 'Been?' ] !== '' ? '#1392db' : '#ee1c24';

				const marker = new google.maps.Marker( {
					position: latLng,
					map: diningMap.map,
					title: result.Name,
					data: result,
					keyId: i,
					// icon: pinSymbol( pinColor )
					icon: circleSymbol( pinColor ),
				} );

				// Extend the bounds to include each marker's position
				diningMap.bounds.extend( marker.position );

				// Set opacity since we will be triggering a fade in effect for the markers onLoad
				// marker.setOpacity(0);

				// Add marker to our main object
				diningMap.markers.push( marker );

				google.maps.event.addListener( marker, 'click', function() {
					openDetails( this );
				} );

				google.maps.event.addListener( marker, 'mouseover', function() {
					closeInfoWindow();

					diningMap.infoBox.setContent( this.title );
					diningMap.infoBox.open( diningMap.map, this );
				} );

				google.maps.event.addListener( marker, 'mouseout', closeInfoWindow );
			}
		}

		// Add clusters
		diningMap.clusterer.addMarkers( diningMap.markers );

		// Set zoom of map based on the markers
		// google.maps.event.addListenerOnce( diningMap.map, 'bounds_changed', function() {
		// console.log(diningMap.map.getZoom() );
		// diningMap.map.setZoom( diningMap.map.getZoom() - 1 );
		// console.log( diningMap.map.getZoom() - 1 );
		// } );

		diningMap.map.fitBounds( diningMap.bounds );

		// Center the map based on the markers
		diningMap.map.setCenter( diningMap.bounds.getCenter() );

		// Populate sidebar with results and open drawer once done
		// (don't want to display a blank sidebar)
	}

	function windowResize() {
		clearTimeout( resizeTimeout );

		resizeTimeout = setTimeout( function() {
			diningMap.map.setCenter( diningMap.mapStyle.center );

			mobileBodyClass();
		}, 100 );
	}

	// Add class to body tag for smaller screens
	function mobileBodyClass() {
		const hasClass = body.classList.contains( 'minimal' );

		if ( w.innerWidth < 768 && ! hasClass ) {
			body.classList.add( 'minimal' );
		} else if ( w.innerWidth >= 768 && hasClass ) {
			body.classList.remove( 'minimal' );
		}
	}

	/*function fadeInMarkers(){

		for ( var i = 0; i < diningMap.markers.length; i++ ) {

			fadeIn(i);

		}

	}

	function fadeIn( i ) {
		var markerOpacity = 0;
		var timer = setInterval( function () {
			if (markerOpacity >= 1){
				clearInterval(timer);
			}
			diningMap.markers[i].setOpacity = markerOpacity;
			markerOpacity += 0.1;
		}, 10 );
	}*/

	/* function fadeInMarker( marker, markerOpacity, fadeInTimer ) {
		console.log(marker);

		if ( markerOpacity == 1 ) {
			clearInterval(fadeInTimer);
			markerOpacity = 0;
		} else {
			markerOpacity += 0.5;
			marker.setOpacity(markerOpacity);
		}

		return markerOpacity;

	}*/

	function openDetails( marker ) {
		const locationDetails = d.querySelector( '.location__details' );
		let singleDetail = '';
		let value = '';
		let website = marker.data.Website || '';
		const excludedDetails = [
			'Instagram',
			'Website',
			'Latitude',
			'Longitude',
			'Name',
			'Been?',
		];

		locationDetails.innerHTML = '';

		openMenu();

		addWebsiteLink( marker );

		const been = marker.data[ 'Been?' ] !== '' ? 'Yes' : 'No';
		locationDetails.appendChild( buildSingleDetail( 'Been?', been ) );

		// Add our marker's info to the pane
		for ( const key in marker.data ) {
			if ( ! excludedDetails.includes( key ) ) {
				value = marker.data[ key ];
				if ( value !== '' ) {
					singleDetail = buildSingleDetail( key, value );

					locationDetails.appendChild( singleDetail );
				}
			}
		}

		// Add the website button at the end.
		if ( website !== '' ) {
			const button = buildSiteButton( 'Website', website );

			locationDetails.appendChild( button );
		}
	}

	function openMenu() {
		// Open our info pane if on mobile (determined by window width)
		if ( body.classList.contains( 'minimal' ) ) {
			sidebar.classList.add( 'open' );
		}
	}

	function addWebsiteLink( marker ) {
		const website = marker.data.Website !== '' ? marker.data.Website : '';

		// NOTE: add note and class to pane if 'PERMANENTLY CLOSED' in status
		// v0.1: PERMANENTLY CLOSED not included

		// Add the title of the location to the proper spot
		// If we have a website, add it
		if ( website !== '' ) {
			d.querySelector( '.location__name' ).innerHTML = `<a href="${ website }" target="_blank" rel="noopener">${ marker.title }</a>`;
		} else {
			d.querySelector( '.location__name' ).innerText = marker.title;
		}
	}

	function buildSingleDetail( key, value ) {
		const cleanKey = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
		const singleDetail = d.createElement( 'p' );
		singleDetail.classList.add( `location__${ cleanKey }` );

		singleDetail.innerHTML = '<span class="highlight">' + key + ':</span> ' + value;

		return singleDetail;
	}

	function buildSiteButton( key, url ) {
		const cleanKey = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
		const button = d.createElement( 'a' );
		button.classList.add( 'button', `location__${ cleanKey }` );
		button.innerText = key;
		button.href = url;
		button.target = '_blank';
		button.rel = 'noopener';

		return button;
	}

	/**
	 * Helper function to close the infoBox
	 */
	function closeInfoWindow() {
		if ( diningMap.infoBox ) {
			diningMap.infoBox.close();
		}
	}

	/**
	 * Creates Google Maps style Pin
	 *
	 * @param {string} color Hex value for the color of the pin
	 * @return {Object} Object for Google Map SVG icon
	 */
	function pinSymbol( color ) {
		// check there was a value passed to 'color' and set default in case
		if ( color == null || color === '' ) {
			color = '#fff';
		}

		return {
			path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
			fillColor: color,
			fillOpacity: 1,
			strokeColor: '#000',
			strokeWeight: 1,
			scale: 1,
		};
	}

	/**
	 * Creates a circle icon
	 *
	 * @param {string} color Hex value color the circle should be
	 * @return {Object} Object for Google Map SVG icon
	 */
	function circleSymbol( color ) {
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: color,
			fillOpacity: 1,
			strokeColor: '#000',
			strokeWeight: 2,
			scale: 10,
		};
	}

	function fadeOut( element ) {
		element.style.opacity = 1;
		( function fade() {
			if ( ( element.style.opacity -= .1 ) < 0 ) {
				element.style.display = 'none';
			} else {
				requestAnimationFrame( fade );
			}
		} )();
	}

	function fadeIn( element, display ) {
		element.style.opacity = 0;
		element.style.display = display || 'block';
		( function fade() {
			let val = parseFloat( element.style.opacity );
			if ( ! ( ( val += .1 ) >= 1 ) ) {
				element.style.opacity = val;
				requestAnimationFrame( fade );
			}
		} )();
	}
} )( window, document );
