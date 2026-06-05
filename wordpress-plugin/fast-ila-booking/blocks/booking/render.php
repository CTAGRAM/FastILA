<?php
/**
 * Server-side render for the Fast-ILA Booking block.
 *
 * Vars exposed by block.json `render`: $attributes, $content, $block.
 *
 * @package Fast_ILA_Booking
 *
 * @var array<string,mixed> $attributes
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( class_exists( 'Fast_ILA_Booking' ) ) {
	$plugin = new Fast_ILA_Booking();
	echo $plugin->render_block( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — escaped within render_shortcode.
}
