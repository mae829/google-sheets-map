<?php
	/**
	 * Simple file to save our data received from Google Sheets
	 */
	$myFile	= 'sheetdata.json';
	$fh		= fopen( $myFile, 'w' ) or die( "Can't open file" );
	$stringData = $_POST['dataToSave'];
	fwrite( $fh, $stringData );
	fclose( $fh );
?>
