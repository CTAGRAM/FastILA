<?php
/**
 * Fast-ILA Booking — uninstall.
 * Drops the plugin's option row when WordPress uninstalls the plugin.
 *
 * @package Fast_ILA_Booking
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'fast_ila_booking_settings' );
