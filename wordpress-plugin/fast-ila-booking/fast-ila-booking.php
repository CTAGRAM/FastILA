<?php
/**
 * Plugin Name: Fast-ILA Booking
 * Plugin URI:  https://fast-ila.co.uk
 * Description: Embed the Fast-ILA Independent Legal Advice booking form on any page or post via the [fast_ila_booking] shortcode or a Gutenberg block. Bookings flow into the Fast-ILA Supabase backend; this plugin is a thin secure iframe wrapper.
 * Version:     1.0.0
 * Author:      Nexa Law Ltd · Fast-ILA
 * Author URI:  https://fast-ila.co.uk
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: fast-ila-booking
 * Requires at least: 5.8
 * Requires PHP: 7.4
 *
 * @package Fast_ILA_Booking
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FAST_ILA_BOOKING_VERSION', '1.0.0' );
define( 'FAST_ILA_BOOKING_FILE', __FILE__ );
define( 'FAST_ILA_BOOKING_DIR',  plugin_dir_path( __FILE__ ) );
define( 'FAST_ILA_BOOKING_URL',  plugin_dir_url( __FILE__ ) );

require_once FAST_ILA_BOOKING_DIR . 'includes/class-fast-ila-booking.php';

add_action( 'plugins_loaded', static function () {
	( new Fast_ILA_Booking() )->boot();
} );
