<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<title>Google Sheets Map</title>
		<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
		<link rel="stylesheet" href="./assets/css/style.min.css">

		<script>
			WebFontConfig = {
				classes: false,
				events: false,
				google: {
					families: ['Raleway:400,700', 'Open+Sans:400,600,700']
				}
			};

			(function(d) {
				var wf = d.createElement('script'),
					s = d.scripts[0];
				wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
				wf.async = true;
				s.parentNode.insertBefore(wf, s);
			})(document);
		</script>
	</head>
	<body>

		<div class="wrapper">

			<div class="map-container">
				<div class="map-canvas"></div>
				<!-- <div class="zoom-control">
					<a class="zoom out" href="#"><i class="icon-minus"></i></a>
					<a class="zoom in" href="#"><i class="icon-plus"></i></a>
				</div>
				<div class="map-overlay">
					<div id="off-map-direction-infobox">
						 <span class="arrow"></span><span class="info-container"></span>
					</div>
				</div> -->
			</div>

			<aside class="sidebar">

				<div class="locations">

					<div class="locations__header">
						<!-- <div class="tab-toggle refine active">REFINE</div> -->
						<!-- <div class="tab-toggle all-filters"><i class="icon-filter"></i>ALL FILTERS</div> -->
					</div>

					<!-- <div class="refine-filter-group filter-group clearfix active">
						<div class="list-filter">
							<input type="text" class="filter-establishment form-control" placeholder="Filter by Establishment&hellip;" />
							<i class="icon-search"></i>
						</div>
						<div class="list-filter mobile-toggle-filter">
							<select class="brand-type form-control" name="brand">
								<option value="all">Filter by Stone beer</option>
							</select>
						</div>
					</div> -->

					<!-- <div class="all-filters-filter-group filter-group mobile-toggle-filter clearfix">

						<div class="location-type filter-subgroup clearfix">
							<p class="filter-label">LOCATION TYPE</p>
							<div class="radio-group">
								<input type="checkbox" name="premise-type" value="on" id="type-on-premise" checked="checked" /><label for="type-on-premise"><i class="icon-ok"></i><i class="icon-tulip label-icon"></i>Stay and Enjoy</label>
							</div>
							<div class="radio-group">
								<input type="checkbox" name="premise-type" value="off" id="type-off-premise" checked="checked" /><label for="type-off-premise"><i class="icon-ok"></i><i class="icon-cart label-icon"></i>Take it to go</label>
							</div>
						</div>

						<div class="format filter-subgroup clearfix">
							<p class="filter-label">FORMAT</p>
							<div class="radio-group">
								<input type="checkbox" name="format" value="draft" id="format-draft" checked="checked" /><label for="format-draft"><i class="icon-ok"></i><i class="icon-tap label-icon"></i>Draft</label>
							</div>
							<div class="radio-group">
								<input type="checkbox" name="format" value="bottles" id="format-bottles" checked="checked" /><label for="format-bottles"><i class="icon-ok"></i><i class="icon-bottle label-icon"></i>Bottles</label>
							</div>
							<div class="radio-group">
								<input type="checkbox" name="format" value="cans" id="format-cans" checked="checked" /><label for="format-cans"><i class="icon-ok"></i><i class="icon-pulltab label-icon"></i>Cans</label>
							</div>
						</div>

					</div> -->

					<!-- <p class="count text-center clearfix">Showing <span class="number-in-bounds-wrapper"><span class="number-in-bounds">0</span> <span class="search-type"></span>Results</span><br></p> -->
					<div class="locations__list"></div>
					<!-- <div class="pagination hidden">
						<div class="page-count text-center">Viewing Page <span class="current-page">1</span> of <span class="total-pages">2</span></div>
						<div class="pagers clearfix">
							<div class="pager"><a href="#" class="page prev disabled" data-page="0">PREVIOUS</a></div>
							<div class="pager"><a href="#" class="page next disabled" data-page="2">NEXT</a></div>
						</div>
					</div> -->
				</div>

				<div class="location">

					<div class="location__header">

						<a href="#" class="location__close"><i class="icon-left-open"></i> Back</a>

						<h3 class="location__name">Select Location</h3>

					</div>

					<div class="location__details">
					</div>

				</div>
			</aside>

			<div class="cities__overlay">

				<div class="cities__wrapper">

					<select name="cities" id="cities" class="cities__selection">
						<option value="" disabled selected>Select Sheet</option>
					</select>

				</div>

			</div>

		</div>

		<script src="https://maps.googleapis.com/maps/api/js?key=PLACEAPIKEYHERE"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
		<script src="./assets/js/main.min.js" defer></script>
	</body>
</html>
