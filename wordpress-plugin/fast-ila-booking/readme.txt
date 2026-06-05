=== Fast-ILA Booking ===
Contributors: nexalaw
Tags: booking, legal, appointment, ila, iframe, embed
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed the Fast-ILA Independent Legal Advice booking form on any WordPress page or post.

== Description ==

Fast-ILA is a fixed-fee booking platform for Independent Legal Advice (ILA) — used by guarantors, occupiers, JBSP co-borrowers, and other individuals needing SRA-regulated sign-off on lending documents. This plugin embeds the booking form (a 3-step service-picker / calendar / details flow) on any WordPress page.

The booking itself is processed by your Fast-ILA Supabase backend — this plugin is a thin, secure iframe wrapper. No data flows through WordPress.

= Features =

*   `[fast_ila_booking]` shortcode with per-instance overrides
*   Gutenberg block (server-rendered, alignment-aware)
*   Settings page for default embed URL, height, theme, layout, and pre-selected service
*   Auto-resizing iframe (opt-in via `height="auto"`)
*   Mobile-friendly responsive wrapper
*   Sandboxed iframe — no third-party scripts touch your WordPress install

= Usage =

After activating, visit **Settings → Fast-ILA Booking** and set your embed URL to the public deployment of your Fast-ILA app (e.g. `https://app.fast-ila.co.uk/embed`).

Then add the shortcode to any page:

`[fast_ila_booking]`

Or override defaults inline:

`[fast_ila_booking height="900" service="urgent" layout="grid" theme="light"]`

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/` — or upload the zip via *Plugins → Add new → Upload*.
2. Activate it.
3. Go to **Settings → Fast-ILA Booking** and paste your booking embed URL.
4. Place the shortcode `[fast_ila_booking]` on any page.

== Frequently Asked Questions ==

= Where do bookings go? =

To your Fast-ILA Supabase backend, via the `create-booking` edge function. Nothing is stored in WordPress.

= Can I use this without WordPress? =

Yes — the embed URL works standalone. WordPress is one of several places you can host the form.

= Does it work with page builders (Elementor, Divi, Bricks)? =

Yes. Drop the shortcode in any text/HTML widget.

== Changelog ==

= 1.0.0 =
* Initial release. Shortcode, Gutenberg block, settings page, auto-resize.
