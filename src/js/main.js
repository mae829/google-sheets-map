/* global google, MarkerClusterer, Tabletop */
( function( $ ) {
	const publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/pubhtml';
	// var map;

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

	$( function() {
		const $window = $( window );
		const $body = $( 'body' );
		const $sidebar = $( '.sidebar' );
		const windowHeight = $window.height();
		const $mapCanvas = $( '.map-canvas' );
		let resizeTimeout = null;

		$mapCanvas.height( windowHeight );

		// Initialize Map
		diningMap.map = new google.maps.Map( $mapCanvas[ 0 ], diningMap.mapStyle );

		// Initialize Clusterer
		diningMap.clusterer = new MarkerClusterer( diningMap.map, null, diningMap.clusterOptions );

		// Initialize map bounds
		diningMap.bounds = new google.maps.LatLngBounds();

		// Initialize Custom InfoBox
		diningMap.infoBox = new google.maps.InfoWindow();

		// Handle events when resizing window
		$window.resize( windowResize );

		// Handle body tag class for smaller screens
		mobileBodyClass();

		// Add a call to fade in all our markers once the map itself has loaded
		// google.maps.event.addListenerOnce( diningMap.map, 'idle', fadeInMarkers );

		// Request our saved data file
		$.ajax( {
			url: 'inc/sheetdata.json',
			success( data, textStatus, jqXHR ) {
				/**
				 * Check if the data is old (more than 30 minutes)
				 * If it is, make request for new data with Tabletop and save the result into file,
				 * else use the old data
				 */
				let nowTime = new Date();
				const fileTime = new Date( jqXHR.getResponseHeader( 'Last-Modified' ) );
				let cacheTime = 0;

				nowTime = nowTime.getTime();
				// cacheTime       = fileTime.getTime() + ( 30 * 60000 );
				// cacheTime       = fileTime.getTime() + ( 300 * 60000 ); // for long development
				cacheTime = fileTime.getTime() + 60; // for quick refresh of results

				if ( nowTime > cacheTime ) {
					getNewData();
				} else {
					sheetSelection( data );
				}
			},
			error() {
				// File was empty or something went wrong, get new data and save
				getNewData();
			},
		} );

		$( '.location__close' ).on( 'click', function( e ) {
			e.preventDefault();

			if ( $sidebar.hasClass( 'open' ) ) {
				$sidebar.removeClass( 'open' );
			}

			return false;
		} );

		/**
		 * Request new data from our Google sheet using Tabletop
		 */
		function getNewData() {
			// console.log('fetching new data');

			Tabletop.init( {
				key: publicSpreadsheetUrl,
				callback( newData, tabletop ) {
					// Manipulate our data so we can save and use later
					const dataToUse = {};

					for ( const key in newData ) {
						dataToUse[ key ] = tabletop.sheets( key ).all();
					}

					// jQuery method (which technically is compatible with even IE)
					/*$.each( newData, function( key, value ) {
                        dataToUse[key]  = tabletop.sheets(key).all();
                    } );*/

					// Save our data
					saveData( dataToUse );

					// Next step is to select sheet (city)
					sheetSelection( dataToUse );
				},
			} );
		}

		/**
		 * Attempt to save our data for cache purposes
		 *
		 * @param {Object} dataToSave JSON data to save to our file.
		 */
		function saveData( dataToSave ) {
			$.ajax( {
				type: 'POST',
				dataType: 'json',
				data: {
					dataToSave: JSON.stringify( dataToSave ),
				},
				url: 'inc/savedata.php',
			} );
		}

		/**
		 * IF our data only holds one city/sheet, then it will just jump into displaying the markers for that city
		 * or else it will update the UI for city/sheet selection
		 *
		 * @param {Object} data Holds all the data returned by our sheet
		 */
		function sheetSelection( data ) {
			const cities = Object.keys( data );
			// const cityData = '';

			if ( cities.length > 1 ) {
				initOverlay( cities, data );
			} else {
				initMarkers( data[ cities[ 0 ] ] );
			}
		}

		function initOverlay( cities, data ) {
			const $citiesOverlay = $( '.cities__overlay' );
			const $selectCities = $( '.cities__selection' );

			// populate div with cities
			for ( const key in cities ) {
				$selectCities.append(
					$( '<option>', {
						value: cities[ key ],
						text: cities[ key ],
					} ),
				);
			}

			$citiesOverlay.fadeIn();

			$selectCities.on( 'change', function() {
				const city = $( this ).val();

				initMarkers( data[ city ] );

				$citiesOverlay.fadeOut();
			} );
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
				// Set the map's center and dimensions
				// var w = $window.width();

				$mapCanvas.height( $window.height() );

				diningMap.map.setCenter( diningMap.mapStyle.center );

				mobileBodyClass();
			}, 100 );
		}

		// Add class to body tag for smaller screens
		function mobileBodyClass() {
			const w = $window.width();
			const hasClass = $body.hasClass( 'minimal' );

			if ( w < 768 && ! hasClass ) {
				$body.addClass( 'minimal' );
			} else if ( w >= 768 && hasClass ) {
				$body.removeClass( 'minimal' );
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
			const $locationDetails = $( '.location__details' ).html( '' );
			let $singleDetail = '';
			let value = '';

			openMenu();

			addWebsiteLink( marker );

			// Add our marker's info to the pane
			for ( let key in marker.data ) {
				switch ( key ) {
					case 'Been?':
						value = marker.data[ key ] !== '' ? 'Yes' : 'No';

						$singleDetail = buildSingleDetail( key, value );

						$locationDetails.append( $singleDetail );

						break;
					case 'Instagram':
						// Make call to pull instagram images
						// try to lazy load them
						break;
					case 'Website': // Do nothing...for now
					case 'Latitude':
					case 'Longitude':
					case 'Name':
						// Do nothing for these, don't need to display them
						break;
					default:
						if ( marker.data[ key ] !== '' ) {
							$singleDetail = buildSingleDetail( key, marker.data[ key ] );

							$locationDetails.append( $singleDetail );
						}
				}
			}

			// Add the website at the end
			if ( website !== '' ) {
				const $button = buildSiteButton( 'Website', marker.data.Website );

				$locationDetails.append( $button );
			}
		}

		function openMenu() {
			// Open our info pane if on mobile (determined by window width)
			if ( $body.hasClass( 'minimal' ) ) {
				$sidebar.addClass( 'open' );
			}
		}

		function addWebsiteLink( marker ) {
			const website = marker.data.Website !== '' ? marker.data.Website : '';

			// NOTE: add note and class to pane if 'PERMANENTLY CLOSED' in status
			// v0.1: PERMANENTLY CLOSED not included

			// Add the title of the location to the proper spot
			// If we have a website, add it
			if ( website !== '' ) {
				$( '.location__name' ).html( '<a href="' + website + '" target="_blank" rel="noopener">' + marker.title + '</a>' );
			} else {
				$( '.location__name' ).text( marker.title );
			}
		}

		function buildSingleDetail( key, value ) {
			const cleanKey = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
			const $singleDetail = $( '<p class="location__' + cleanKey + '"></p>' );

			$singleDetail.append( '<span class="highlight">' + key + ':</span> ' + value );

			return $singleDetail;
		}

		function buildSiteButton( key, url ) {
			const cleanKey = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
			const $button = $( '<a href="' + url + '" target="_blank" rel="noopener" class="button location__' + cleanKey + '"></a>' );

			$button.text( key );

			return $button;
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
	} );
} )( jQuery );
