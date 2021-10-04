<?php
/**
 * Save our data received from Google Sheets
 */

/**
 * Parse all the data that is being sent as JSON.
 * `json_decode` turns our JSON-object into a PHP Associative array
 */
$data = (array) json_decode( file_get_contents( 'php://input', true ) );

$save_data_type = ! empty( $data['type'] ) ? $data['type'] : null;
$data_to_save   = ! empty( $data['dataToSave'] ) ? (array) $data['dataToSave'] : null;

if ( null === $save_data_type || null === $data_to_save ) {
	header( 'Content-Type: application/json; charset=utf-8' );
	http_response_code( 400 );

	echo json_encode( [
		'success' => false,
		'errorno' => 400,
		'message' => 'Bad Request: Missing data on request.',
	] );

	die();
}

$my_file       = './sheetdata.json';
$file_contents = (array) json_decode( file_get_contents( $my_file ) );
$fh            = fopen( $my_file, 'w' );

// If file is not empty
	// If saving titles
	// If saving sheet data
if ( 'titles' === $save_data_type ) {
	foreach ( $data_to_save as $sheet_name => $sheet_data ) {
		// Get any existing sheet data and add it to our new sheet names,
		// in case at any point fetching new sheet data fails.
		if ( in_array( $sheet_name, array_keys( $file_contents ), true ) ) {
			$data_to_save[ $sheet_name ] = $file_contents[ $sheet_name ];
		}
	}

	fwrite( $fh, json_encode( $data_to_save, JSON_PRETTY_PRINT ) );
}

fclose( $fh );
