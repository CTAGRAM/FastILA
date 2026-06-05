<?php
/**
 * Fast-ILA Booking plugin core.
 *
 * @package Fast_ILA_Booking
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin class — wires shortcode, block, admin settings.
 */
final class Fast_ILA_Booking {

	const OPTION_KEY = 'fast_ila_booking_settings';

	/** Hook everything up. */
	public function boot(): void {
		add_shortcode( 'fast_ila_booking', [ $this, 'render_shortcode' ] );
		add_action( 'init', [ $this, 'register_block' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend' ] );

		if ( is_admin() ) {
			add_action( 'admin_menu',  [ $this, 'register_settings_page' ] );
			add_action( 'admin_init',  [ $this, 'register_settings' ] );
			add_filter( 'plugin_action_links_' . plugin_basename( FAST_ILA_BOOKING_FILE ), [ $this, 'add_settings_link' ] );
		}
	}

	/**
	 * Public default options.
	 *
	 * @return array{embed_url:string,height:int,theme:string,layout:string,default_service:string,enable_block:bool}
	 */
	public function defaults(): array {
		return [
			'embed_url'       => 'https://app.fast-ila.co.uk/embed',
			'height'          => 1100,
			'theme'           => 'light',
			'layout'          => 'stacked',
			'default_service' => '',
			'enable_block'    => true,
		];
	}

	/** Merge stored options with defaults. */
	public function options(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		return wp_parse_args( is_array( $stored ) ? $stored : [], $this->defaults() );
	}

	// -----------------------------------------------------------------------
	// Frontend rendering
	// -----------------------------------------------------------------------

	public function enqueue_frontend(): void {
		wp_register_style(
			'fast-ila-booking',
			FAST_ILA_BOOKING_URL . 'assets/css/booking.css',
			[],
			FAST_ILA_BOOKING_VERSION
		);
		wp_register_script(
			'fast-ila-booking',
			FAST_ILA_BOOKING_URL . 'assets/js/booking.js',
			[],
			FAST_ILA_BOOKING_VERSION,
			true
		);
	}

	/**
	 * Render the shortcode.
	 *
	 * @param array<string,string|int|bool>|string $atts Shortcode attributes.
	 */
	public function render_shortcode( $atts ): string {
		$opts = $this->options();

		$atts = shortcode_atts(
			[
				'height'  => $opts['height'],
				'theme'   => $opts['theme'],
				'layout'  => $opts['layout'],
				'service' => $opts['default_service'],
				'embed_url' => $opts['embed_url'],
				'id'      => '',
			],
			is_array( $atts ) ? $atts : [],
			'fast_ila_booking'
		);

		wp_enqueue_style( 'fast-ila-booking' );
		wp_enqueue_script( 'fast-ila-booking' );

		$src = $this->build_embed_url(
			$atts['embed_url'],
			[
				'theme'   => $atts['theme'],
				'layout'  => $atts['layout'],
				'service' => $atts['service'],
			]
		);

		$auto_height = ( 'auto' === strtolower( (string) $atts['height'] ) );
		$height_px   = $auto_height ? 1100 : max( 400, (int) $atts['height'] );
		$frame_id    = $atts['id'] !== '' ? sanitize_html_class( (string) $atts['id'] ) : 'fast-ila-booking-' . wp_unique_id();

		ob_start();
		?>
		<div class="fast-ila-booking-wrap" data-auto-height="<?php echo esc_attr( $auto_height ? '1' : '0' ); ?>">
			<iframe
				id="<?php echo esc_attr( $frame_id ); ?>"
				class="fast-ila-booking-frame"
				src="<?php echo esc_url( $src ); ?>"
				title="<?php esc_attr_e( 'Fast-ILA booking', 'fast-ila-booking' ); ?>"
				loading="lazy"
				style="width:100%;height:<?php echo esc_attr( $height_px ); ?>px;border:0;display:block;"
				allow="payment; clipboard-write"
				referrerpolicy="strict-origin-when-cross-origin"
			></iframe>
			<noscript>
				<p>
					<?php
					echo wp_kses_post(
						sprintf(
							/* translators: %s: link to the booking site */
							__( 'JavaScript is required for the Fast-ILA booking form. <a href="%s" target="_blank" rel="noopener">Book directly on fast-ila.co.uk</a>.', 'fast-ila-booking' ),
							esc_url( $src )
						)
					);
					?>
				</p>
			</noscript>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	/** Build the iframe URL with chrome-off and any query parameters. */
	private function build_embed_url( string $base, array $params ): string {
		$base   = esc_url_raw( trim( $base ) );
		$qs     = [ 'mode' => 'booking', 'chrome' => 'off' ];
		foreach ( $params as $k => $v ) {
			if ( $v !== '' && $v !== null ) {
				$qs[ $k ] = $v;
			}
		}
		$glue = ( false === strpos( $base, '?' ) ) ? '?' : '&';
		return $base . $glue . http_build_query( $qs );
	}

	// -----------------------------------------------------------------------
	// Gutenberg block
	// -----------------------------------------------------------------------

	public function register_block(): void {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}
		register_block_type(
			FAST_ILA_BOOKING_DIR . 'blocks/booking',
			[
				'render_callback' => [ $this, 'render_block' ],
			]
		);
	}

	/**
	 * Render the block (server-side).
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 */
	public function render_block( array $attributes ): string {
		$atts = [
			'height'  => $attributes['height']  ?? $this->options()['height'],
			'theme'   => $attributes['theme']   ?? $this->options()['theme'],
			'layout'  => $attributes['layout']  ?? $this->options()['layout'],
			'service' => $attributes['service'] ?? $this->options()['default_service'],
		];
		return $this->render_shortcode( $atts );
	}

	// -----------------------------------------------------------------------
	// Admin settings
	// -----------------------------------------------------------------------

	public function register_settings_page(): void {
		add_options_page(
			__( 'Fast-ILA Booking', 'fast-ila-booking' ),
			__( 'Fast-ILA Booking', 'fast-ila-booking' ),
			'manage_options',
			'fast-ila-booking',
			[ $this, 'render_settings_page' ]
		);
	}

	public function register_settings(): void {
		register_setting(
			'fast_ila_booking',
			self::OPTION_KEY,
			[
				'type'              => 'array',
				'sanitize_callback' => [ $this, 'sanitize_settings' ],
				'default'           => $this->defaults(),
			]
		);
	}

	/**
	 * @param array<string,mixed> $input Raw form input.
	 */
	public function sanitize_settings( $input ): array {
		$defaults = $this->defaults();
		$valid_themes   = [ 'light', 'dark' ];
		$valid_layouts  = [ 'stacked', 'grid' ];
		$valid_services = [ '', 'urgent', 'standard', 'couples', 'wet' ];

		return [
			'embed_url'       => esc_url_raw( $input['embed_url']       ?? $defaults['embed_url'] ),
			'height'          => max( 400, (int) ( $input['height']     ?? $defaults['height'] ) ),
			'theme'           => in_array( $input['theme']  ?? '', $valid_themes,  true ) ? $input['theme']  : $defaults['theme'],
			'layout'          => in_array( $input['layout'] ?? '', $valid_layouts, true ) ? $input['layout'] : $defaults['layout'],
			'default_service' => in_array( $input['default_service'] ?? '', $valid_services, true ) ? $input['default_service'] : '',
			'enable_block'    => ! empty( $input['enable_block'] ),
		];
	}

	public function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$o = $this->options();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Fast-ILA Booking', 'fast-ila-booking' ); ?></h1>
			<p>
				<?php esc_html_e( 'Embed the Fast-ILA Independent Legal Advice booking form on any page using the shortcode below or the “Fast-ILA Booking” block.', 'fast-ila-booking' ); ?>
			</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'fast_ila_booking' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="fib_embed_url"><?php esc_html_e( 'Booking embed URL', 'fast-ila-booking' ); ?></label></th>
						<td>
							<input id="fib_embed_url" type="url" class="regular-text code" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[embed_url]" value="<?php echo esc_attr( $o['embed_url'] ); ?>" required/>
							<p class="description"><?php esc_html_e( 'Public URL of your deployed Fast-ILA site, ending in /embed. Example: https://app.fast-ila.co.uk/embed', 'fast-ila-booking' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fib_height"><?php esc_html_e( 'Default height (px)', 'fast-ila-booking' ); ?></label></th>
						<td>
							<input id="fib_height" type="number" min="400" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[height]" value="<?php echo esc_attr( (string) $o['height'] ); ?>"/>
							<p class="description"><?php esc_html_e( 'Use 1100 for the standard 3-step flow. Set per-shortcode with height="..." or "auto".', 'fast-ila-booking' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fib_theme"><?php esc_html_e( 'Theme', 'fast-ila-booking' ); ?></label></th>
						<td>
							<select id="fib_theme" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[theme]">
								<option value="light" <?php selected( $o['theme'], 'light' ); ?>><?php esc_html_e( 'Light', 'fast-ila-booking' ); ?></option>
								<option value="dark"  <?php selected( $o['theme'], 'dark' );  ?>><?php esc_html_e( 'Dark',  'fast-ila-booking' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fib_layout"><?php esc_html_e( 'Service card layout', 'fast-ila-booking' ); ?></label></th>
						<td>
							<select id="fib_layout" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[layout]">
								<option value="stacked" <?php selected( $o['layout'], 'stacked' ); ?>><?php esc_html_e( 'Stacked', 'fast-ila-booking' ); ?></option>
								<option value="grid"    <?php selected( $o['layout'], 'grid' );    ?>><?php esc_html_e( 'Grid (2×2)', 'fast-ila-booking' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="fib_service"><?php esc_html_e( 'Pre-selected service', 'fast-ila-booking' ); ?></label></th>
						<td>
							<select id="fib_service" name="<?php echo esc_attr( self::OPTION_KEY ); ?>[default_service]">
								<option value="">— <?php esc_html_e( 'None — start at service picker', 'fast-ila-booking' ); ?> —</option>
								<option value="urgent"   <?php selected( $o['default_service'], 'urgent'   ); ?>><?php esc_html_e( 'Urgent / Same-Day', 'fast-ila-booking' ); ?></option>
								<option value="standard" <?php selected( $o['default_service'], 'standard' ); ?>><?php esc_html_e( 'ILA Standard',      'fast-ila-booking' ); ?></option>
								<option value="couples"  <?php selected( $o['default_service'], 'couples'  ); ?>><?php esc_html_e( 'ILA for Couples',   'fast-ila-booking' ); ?></option>
								<option value="wet"      <?php selected( $o['default_service'], 'wet'      ); ?>><?php esc_html_e( 'Wet Signature / Weekend', 'fast-ila-booking' ); ?></option>
							</select>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>

			<hr/>

			<h2><?php esc_html_e( 'How to use', 'fast-ila-booking' ); ?></h2>
			<p><?php esc_html_e( 'Add this shortcode to any page or post:', 'fast-ila-booking' ); ?></p>
			<p><code>[fast_ila_booking]</code></p>
			<p><?php esc_html_e( 'Override settings inline:', 'fast-ila-booking' ); ?></p>
			<p>
				<code>[fast_ila_booking height="900" service="urgent" layout="grid"]</code>
			</p>
			<p>
				<?php esc_html_e( 'Or use the “Fast-ILA Booking” block from the block picker.', 'fast-ila-booking' ); ?>
			</p>
		</div>
		<?php
	}

	/** Add a Settings link on the plugins page. */
	public function add_settings_link( array $links ): array {
		$url = admin_url( 'options-general.php?page=fast-ila-booking' );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'fast-ila-booking' ) . '</a>' );
		return $links;
	}
}
