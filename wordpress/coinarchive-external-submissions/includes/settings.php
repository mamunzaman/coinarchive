<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_valid_default_image_attachment_id')) {
    function caes_get_valid_default_image_attachment_id($option_name) {
        $attachment_id = absint(get_option($option_name, 0));

        if ($attachment_id <= 0) {
            return 0;
        }

        $attachment = get_post($attachment_id);

        if (
            empty($attachment)
            || $attachment->post_type !== 'attachment'
            || !function_exists('wp_attachment_is_image')
            || !wp_attachment_is_image($attachment_id)
        ) {
            return 0;
        }

        return $attachment_id;
    }
}

if (!function_exists('caes_get_default_obverse_image_id')) {
    function caes_get_default_obverse_image_id() {
        return caes_get_valid_default_image_attachment_id('caes_default_obverse_image_id');
    }
}

if (!function_exists('caes_get_default_reverse_image_id')) {
    function caes_get_default_reverse_image_id() {
        return caes_get_valid_default_image_attachment_id('caes_default_reverse_image_id');
    }
}

if (!function_exists('caes_is_protected_default_image_attachment')) {
    function caes_is_protected_default_image_attachment($attachment_id) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0) {
            return false;
        }

        $protected_ids = array(
            absint(get_option('caes_default_obverse_image_id', 0)),
            absint(get_option('caes_default_reverse_image_id', 0)),
        );

        return in_array($attachment_id, $protected_ids, true);
    }
}

if (!function_exists('caes_format_default_image_for_api')) {
    function caes_format_default_image_for_api($attachment_id) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0) {
            return null;
        }

        $url = wp_get_attachment_image_url($attachment_id, 'full');

        if (empty($url)) {
            return null;
        }

        $formatted = array(
            'id'  => $attachment_id,
            'url' => $url,
        );

        $thumb_url = wp_get_attachment_image_url($attachment_id, 'medium');

        if (!empty($thumb_url)) {
            $formatted['thumb_url'] = $thumb_url;
        }

        return $formatted;
    }
}

if (!function_exists('caes_get_default_images_for_api')) {
    function caes_get_default_images_for_api() {
        return array(
            'obverse' => caes_format_default_image_for_api(caes_get_default_obverse_image_id()),
            'reverse' => caes_format_default_image_for_api(caes_get_default_reverse_image_id()),
        );
    }
}

if (!function_exists('caes_register_settings_admin_menu')) {
    function caes_register_settings_admin_menu() {
        add_submenu_page(
            'caes-contributors',
            'CoinArchive Settings',
            'Settings',
            'manage_options',
            'caes-settings',
            'caes_render_settings_admin_page'
        );
    }
}

if (!function_exists('caes_register_plugin_settings')) {
    function caes_register_plugin_settings() {
        register_setting('caes_settings', 'caes_default_obverse_image_id', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 0,
        ));

        register_setting('caes_settings', 'caes_default_reverse_image_id', array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'default'           => 0,
        ));
    }
}

if (!function_exists('caes_is_settings_admin_screen')) {
    function caes_is_settings_admin_screen($hook_suffix) {
        return $hook_suffix === 'caes-contributors_page_caes-settings'
            || strpos((string) $hook_suffix, 'page_caes-settings') !== false;
    }
}

if (!function_exists('caes_enqueue_settings_admin_assets')) {
    function caes_enqueue_settings_admin_assets($hook_suffix) {
        if (!caes_is_settings_admin_screen($hook_suffix)) {
            return;
        }

        wp_enqueue_media();
        wp_enqueue_script(
            'caes-settings-admin',
            plugins_url('assets/js/caes-settings-admin.js', CAES_PLUGIN_FILE),
            array('jquery', 'media-upload', 'media-views', 'media-editor'),
            CAES_VERSION,
            true
        );
        wp_localize_script('caes-settings-admin', 'caesSettingsAdmin', array(
            'selectTitle'  => __('Select Default Image', 'coinarchive-external-submissions'),
            'selectButton' => __('Use this image', 'coinarchive-external-submissions'),
            'noImage'      => __('No image selected.', 'coinarchive-external-submissions'),
        ));
    }
}

if (!function_exists('caes_render_default_image_setting_field')) {
    function caes_render_default_image_setting_field($field_id, $label, $option_name) {
        $attachment_id = caes_get_valid_default_image_attachment_id($option_name);
        $preview_url   = $attachment_id > 0 ? wp_get_attachment_image_url($attachment_id, 'medium') : '';
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($field_id); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <input
                    type="hidden"
                    id="<?php echo esc_attr($field_id); ?>"
                    name="<?php echo esc_attr($option_name); ?>"
                    value="<?php echo esc_attr((string) $attachment_id); ?>"
                    class="caes-default-image-id"
                />
                <div class="caes-default-image-preview" style="margin-bottom:12px;">
                    <?php if ($preview_url) : ?>
                        <img src="<?php echo esc_url($preview_url); ?>" alt="" style="max-width:240px;height:auto;display:block;" />
                    <?php else : ?>
                        <em><?php esc_html_e('No image selected.', 'coinarchive-external-submissions'); ?></em>
                    <?php endif; ?>
                </div>
                <p>
                    <strong><?php esc_html_e('Attachment ID:', 'coinarchive-external-submissions'); ?></strong>
                    <span class="caes-default-image-id-display"><?php echo esc_html($attachment_id > 0 ? (string) $attachment_id : '0'); ?></span>
                </p>
                <p>
                    <button type="button" class="button caes-select-default-image" data-target="<?php echo esc_attr($field_id); ?>">
                        <?php esc_html_e('Select Image', 'coinarchive-external-submissions'); ?>
                    </button>
                    <button type="button" class="button caes-remove-default-image" data-target="<?php echo esc_attr($field_id); ?>">
                        <?php esc_html_e('Remove', 'coinarchive-external-submissions'); ?>
                    </button>
                </p>
                <p class="description">
                    <?php esc_html_e('Optional. Used when contributors or imports do not provide this image.', 'coinarchive-external-submissions'); ?>
                </p>
            </td>
        </tr>
        <?php
    }
}

if (!function_exists('caes_render_settings_admin_page')) {
    function caes_render_settings_admin_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('Sorry, you are not allowed to access this page.'));
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('CoinArchive Settings', 'coinarchive-external-submissions'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('caes_settings');
                ?>
                <table class="form-table" role="presentation">
                    <?php
                    caes_render_default_image_setting_field(
                        'caes_default_obverse_image_id',
                        __('Default Obverse Image', 'coinarchive-external-submissions'),
                        'caes_default_obverse_image_id'
                    );
                    caes_render_default_image_setting_field(
                        'caes_default_reverse_image_id',
                        __('Default Reverse Image', 'coinarchive-external-submissions'),
                        'caes_default_reverse_image_id'
                    );
                    ?>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

add_action('admin_menu', 'caes_register_settings_admin_menu', 20);
add_action('admin_init', 'caes_register_plugin_settings');
add_action('admin_enqueue_scripts', 'caes_enqueue_settings_admin_assets');
