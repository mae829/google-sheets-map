(function ($) {

    var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/pubhtml';
    var map;

    // our main global object that holds all our info
    diningMap = {

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
            styles: [{
                url: 'images/m1.png',
                width: 53,
                height: 52,
                textColor: '#fff'
            }],
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

    $(function(){

        var $window         = $(window),
            $body           = $('body'),
            $sidebar        = $('.sidebar'),
            windowHeight    = $window.height(),
            $mapCanvas      = $('.map-canvas'),
            resizeTimeout   = null;

        $mapCanvas.height(windowHeight);

        // Initialize Map
        diningMap.map = new google.maps.Map( $mapCanvas[0], diningMap.mapStyle);

        // Initialize Clusterer
        diningMap.clusterer = new MarkerClusterer( diningMap.map, null, diningMap.clusterOptions );

        // Initialize map bounds
        diningMap.bounds    = new google.maps.LatLngBounds();

        // Initialize Custom InfoBox
        diningMap.infoBox = new google.maps.InfoWindow();

        // Handle events when resizing window
        $window.resize( windowResize );

        // Handle body tag class for smaller screens
        mobileBodyClass();

        // Add a call to fade in all our markers once the map itself has loaded
        // google.maps.event.addListenerOnce( diningMap.map, 'idle', fadeInMarkers );

        // Request our saved data file
        $.ajax({
            url: 'inc/sheetdata.json',
            success: function ( data, textStatus, jqXHR ) {
                /**
                 * Check if the data is old (more than 30 minutes)
                 * If it is, make request for new data with Tabletop and save the result into file,
                 * else use the old data
                 */
                var nowTime     = new Date();
                var fileTime    = new Date( jqXHR.getResponseHeader('Last-Modified') );
                var cacheTime    = 0;

                nowTime         = nowTime.getTime();
                // cacheTime       = fileTime.getTime() + ( 30 * 60000 );
                // cacheTime       = fileTime.getTime() + ( 300 * 60000 ); // for long development
                cacheTime       = fileTime.getTime() + ( 60 ); // for quick refresh of results

                if ( nowTime > cacheTime ) {
                    getNewData();
                } else {
                    sheetSelection( data );
                }

            },
            error: function ( error ) {
                // File was empty or something went wrong, get new data and save
                getNewData();
            }
        });

        $('.location__close').on( 'click', function(e) {
            e.preventDefault();

            if ( $sidebar.hasClass('open') ) $sidebar.removeClass('open');

            return false;
        });

        /**
         * Request new data from our Google sheet using Tabletop
         */
        function getNewData() {
            // console.log('fetching new data');

            Tabletop.init( {
                key: publicSpreadsheetUrl,
                callback: function ( newData, tabletop ) {

                    // Manipulate our data so we can save and use later
                    var dataToUse   = {};

                    for ( var key in newData ) {
                        dataToUse[key]  = tabletop.sheets( key ).all();
                    }

                    // jQuery method (which technically is compatible with even IE)
                    /*$.each( newData, function( key, value ) {
                        dataToUse[key]  = tabletop.sheets(key).all();
                    } );*/

                    // Save our data
                    saveData( dataToUse );

                    // Next step is to select sheet (city)
                    sheetSelection( dataToUse );

                }
            } );

        }

        /**
         * Attempt to save our data for cache purposes
         */
        function saveData( dataToSave ) {

            $.ajax({
                type: 'POST',
                dataType : 'json',
                data: {
                    dataToSave: JSON.stringify( dataToSave )
                },
                url: 'inc/savedata.php',
            });

        }

        /**
         * IF our data only holds one city/sheet, then it will just jump into displaying the markers for that city
         * or else it will update the UI for city/sheet selection
         *
         * @param   {object} data   Holds all the data returned by our sheet
         */
        function sheetSelection( data ) {

            var cities      = Object.keys( data );
            var cityData    = '';

            if ( cities.length > 1 ) {
                initOverlay( cities, data );
            } else {
                initMarkers( data[cities[0]] );
            }

        }

        function initOverlay( cities, data ){

            var $citiesOverlay  = $('.cities__overlay'),
                $selectCities   = $('.cities__selection');

            // populate div with cities
            for ( var key in cities  ) {

                $selectCities.append( $('<option>', {
                    value: cities[key],
                    text : cities[key]
                }) );

            }

            $citiesOverlay.fadeIn();

            $selectCities.on( 'change', function() {

                var city    = $(this).val();

                initMarkers( data[city] );

                $citiesOverlay.fadeOut();

            });

        }

        /**
         * Initialize all the markers
         *
         * @param  {object} data    Holds all the data from our sheet
         */
        function initMarkers( data ) {

            for ( var i = 0; i < data.length; i++ ) {
                var result  = data[i];

                // make sure the data returned had lat/long
                if ( result.Latitude != '' && result.Longitude != '' && result.Status == '' ) {

                    var latLng      = new google.maps.LatLng( result.Latitude, result.Longitude );
                    var title       = result.Name;
                    var pinColor    = result['Been?'] != '' ? '#1392db' : '#ee1c24';

                    var marker  = new google.maps.Marker({
                        position: latLng,
                        map: diningMap.map,
                        title: result.Name,
                        data: result,
                        keyId: i,
                        // icon: pinSymbol( pinColor )
                        icon: circleSymbol( pinColor )
                    });

                    // Extend the bounds to include each marker's position
                    diningMap.bounds.extend( marker.position );

                    // Set opacity since we will be triggering a fade in effect for the markers onLoad
                    // marker.setOpacity(0);

                    // Add marker to our main object
                    diningMap.markers.push( marker );

                    google.maps.event.addListener( marker, 'click', function() {
                        openDetails( this );
                    });

                    google.maps.event.addListener( marker, 'mouseover', function() {
                        closeInfoWindow();

                        diningMap.infoBox.setContent( this.title );
                        diningMap.infoBox.open( diningMap.map, this );
                    });

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
                var h = $window.height();
                var w = $window.width();

                $mapCanvas.height( h );

                diningMap.map.setCenter( diningMap.mapStyle.center );

                mobileBodyClass();

            }, 100 );

        }

        // Add class to body tag for smaller screens
        function mobileBodyClass() {

            var w = $window.width();
            var hasClass    = $body.hasClass('minimal');

            if ( w < 768 && !hasClass ) {
                $body.addClass('minimal');
            } else if ( w >= 768 && hasClass ) {
                $body.removeClass('minimal');
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

            var $locationDetails    = $('.location__details').html('');
            var website             = marker.data.Website != '' ? marker.data.Website : '';

            // Open our info pane if on mobile (determined by window width)
            if ( $body.hasClass('minimal') ) {
                $sidebar.addClass('open');
            }

            // NOTE: add note and class to pane if 'PERMANENTLY CLOSED' in status
            // v0.1: PERMANENTLY CLOSED not included

            // Add the title of the location to the proper spot
            // If we have a website, add it
            if ( website != '' ) {
                $('.location__name').html( '<a href="'+ website +'" target="_blank" rel="noopener">'+ marker.title +'</a>' );
            } else {
                $('.location__name').text( marker.title );
            }

            // Add our marker's info to the pane
            for ( var key in marker.data ) {

                switch ( key ) {
                    case 'Been?':

                        var value   = marker.data[key] != '' ? 'Yes' : 'No';

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
                        if ( marker.data[key] != '' ) {
                            $singleDetail = buildSingleDetail( key, marker.data[key] );

                            $locationDetails.append( $singleDetail );
                        }

                }

            }

            // Add the website at the end
            if ( website != '' ) {
                $button = buildSiteButton( 'Website', marker.data.Website );

                $locationDetails.append( $button );
            }

        }

        function buildSingleDetail( key, value ) {

            var cleanKey        = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
            var $singleDetail   = $('<p class="location__'+ cleanKey +'"></p>');

            $singleDetail.append('<span class="highlight">'+ key +':</span> '+ value );

            return $singleDetail;

        }

        function buildSiteButton( key, url ) {

            var cleanKey    = key.toLowerCase().replace( /[^a-zA-Z0-9]+/g, '' );
            var $button     = $('<a href="'+ url +'" target="_blank" rel="noopener" class="button location__'+ cleanKey +'"></a>');

            $button.text(key);

            return $button;

        }

        /**
         * Helper function to close the infoBox
         */
        function closeInfoWindow() {
            if ( diningMap.infoBox ) diningMap.infoBox.close();
        }

        /**
         * Creates Google Maps style Pin
         *
         * @param  {string} color   Hex value for the color of the pin
         * @return {object}         Object for Google Map SVG icon
         */
        function pinSymbol( color ) {
            // check there was a value passed to 'color' and set default in case
            if ( color == null || color == '' ) color = '#fff';

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
         * @param  {string} color   Hex value color the circle should be
         * @return {object}         Object for Google Map SVG icon
         */
        function circleSymbol( color ) {
            return {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#000',
                strokeWeight: 2,
                scale: 10
            };
        }

    });

})(jQuery);
