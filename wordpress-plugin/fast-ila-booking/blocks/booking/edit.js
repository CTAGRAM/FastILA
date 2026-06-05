/**
 * Gutenberg editor preview for the Fast-ILA Booking block.
 * Shows a placeholder card with controls; iframe renders on the frontend only.
 */
(function (wp) {
  if (!wp || !wp.blocks) return;
  var el = wp.element.createElement;
  var Fragment = wp.element.Fragment;
  var InspectorControls = wp.blockEditor ? wp.blockEditor.InspectorControls : wp.editor.InspectorControls;
  var Panel = wp.components.PanelBody;
  var TextControl = wp.components.TextControl;
  var SelectControl = wp.components.SelectControl;
  var __ = wp.i18n.__;

  wp.blocks.registerBlockType('fast-ila/booking', {
    edit: function (props) {
      var a = props.attributes;
      var setA = props.setAttributes;

      return el(Fragment, null,
        el(InspectorControls, null,
          el(Panel, { title: __('Booking settings', 'fast-ila-booking'), initialOpen: true },
            el(TextControl, {
              label: __('Height (px)', 'fast-ila-booking'),
              type: 'number',
              value: a.height,
              onChange: function (v) { setA({ height: parseInt(v, 10) || 1100 }); }
            }),
            el(SelectControl, {
              label: __('Theme', 'fast-ila-booking'),
              value: a.theme,
              options: [
                { label: __('Light', 'fast-ila-booking'), value: 'light' },
                { label: __('Dark',  'fast-ila-booking'), value: 'dark'  }
              ],
              onChange: function (v) { setA({ theme: v }); }
            }),
            el(SelectControl, {
              label: __('Layout', 'fast-ila-booking'),
              value: a.layout,
              options: [
                { label: __('Stacked',     'fast-ila-booking'), value: 'stacked' },
                { label: __('Grid (2×2)', 'fast-ila-booking'), value: 'grid'    }
              ],
              onChange: function (v) { setA({ layout: v }); }
            }),
            el(SelectControl, {
              label: __('Pre-selected service', 'fast-ila-booking'),
              value: a.service,
              options: [
                { label: __('— None —',                  'fast-ila-booking'), value: ''         },
                { label: __('Urgent / Same-Day',         'fast-ila-booking'), value: 'urgent'   },
                { label: __('ILA Standard',              'fast-ila-booking'), value: 'standard' },
                { label: __('ILA for Couples',           'fast-ila-booking'), value: 'couples'  },
                { label: __('Wet Signature / Weekend',   'fast-ila-booking'), value: 'wet'      }
              ],
              onChange: function (v) { setA({ service: v }); }
            })
          )
        ),
        el('div', { className: 'fast-ila-booking-edit-placeholder', style: {
          padding: '40px 20px',
          background: '#f7f5ee',
          border: '1px dashed #c8d4dc',
          borderRadius: 14,
          textAlign: 'center',
          color: '#063952',
          fontFamily: 'Inter, sans-serif'
        } },
          el('div', { style: { fontWeight: 700, fontSize: 18, marginBottom: 6 } }, '📅 Fast-ILA Booking'),
          el('div', { style: { fontSize: 13, opacity: 0.75 } },
            __('The booking form will render here on the published page.', 'fast-ila-booking')),
          el('div', { style: { fontSize: 12, opacity: 0.55, marginTop: 10 } },
            __('Height', 'fast-ila-booking') + ': ' + a.height + 'px · ' +
            __('Theme', 'fast-ila-booking') + ': ' + a.theme + ' · ' +
            __('Layout', 'fast-ila-booking') + ': ' + a.layout +
            (a.service ? ' · ' + __('Service', 'fast-ila-booking') + ': ' + a.service : '')
          )
        )
      );
    },
    save: function () { return null; } // server-rendered
  });
})(window.wp);
