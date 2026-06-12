<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_request_merged_params')) {
    function caes_get_request_merged_params(WP_REST_Request $request) {
        $body = $request->get_body_params();
        $json = $request->get_json_params();

        if (!is_array($body)) {
            $body = array();
        }

        if (!is_array($json)) {
            $json = array();
        }

        return array_merge($body, $json);
    }
}

if (!function_exists('caes_get_submission_acf_defaults')) {
    function caes_get_submission_acf_defaults() {
        return array(
            'coin_is_published_catalogue' => 0,
            'coin_is_featured'            => 0,
            'coin_is_app_enabled'         => 1,
            'coin_record_status'          => 'active',
        );
    }
}

if (!function_exists('caes_can_set_status_fields')) {
    function caes_can_set_status_fields($contributor) {
        if (empty($contributor)) {
            return true;
        }

        return caes_is_admin($contributor);
    }
}

if (!function_exists('caes_sanitize_bool_acf_field')) {
    function caes_sanitize_bool_acf_field($value) {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (is_numeric($value)) {
            return (int) $value ? 1 : 0;
        }

        $value = strtolower(sanitize_text_field((string) $value));

        return in_array($value, array('1', 'true', 'yes', 'on'), true) ? 1 : 0;
    }
}

if (!function_exists('caes_get_status_fields_from_request')) {
    function caes_get_status_fields_from_request(WP_REST_Request $request, $contributor) {
        if (!caes_can_set_status_fields($contributor)) {
            return array();
        }

        $params = caes_get_request_merged_params($request);
        $fields = array();
        $bool_keys = array(
            'coin_is_published_catalogue',
            'coin_is_featured',
            'coin_is_app_enabled',
        );

        foreach ($bool_keys as $key) {
            if (!array_key_exists($key, $params)) {
                continue;
            }

            $fields[$key] = caes_sanitize_bool_acf_field($params[$key]);
        }

        if (array_key_exists('coin_record_status', $params)) {
            $status  = sanitize_text_field((string) $params['coin_record_status']);
            $allowed = array('active', 'hidden', 'deprecated');

            if (in_array($status, $allowed, true)) {
                $fields['coin_record_status'] = $status;
            }
        }

        return $fields;
    }
}

if (!function_exists('caes_get_coin_gallery_field_key')) {
    function caes_get_coin_gallery_field_key() {
        return 'field_69e396ed6d437';
    }
}

if (!function_exists('caes_get_coin_obverse_field_key')) {
    function caes_get_coin_obverse_field_key() {
        return 'field_69e396ae6d436';
    }
}

if (!function_exists('caes_get_coin_reverse_field_key')) {
    function caes_get_coin_reverse_field_key() {
        return 'field_69e39bfe2dfda';
    }
}

if (!function_exists('caes_get_coin_code_field_key')) {
    function caes_get_coin_code_field_key() {
        return 'field_69e395d79bfd9';
    }
}

if (!function_exists('caes_coin_code_exists_on_other_post')) {
    function caes_coin_code_exists_on_other_post($coin_code, $exclude_post_id = 0) {
        global $wpdb;

        $coin_code       = sanitize_text_field(trim((string) $coin_code));
        $exclude_post_id = absint($exclude_post_id);

        if ($coin_code === '') {
            return false;
        }

        $post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT pm.post_id
                 FROM {$wpdb->postmeta} pm
                 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key IN ('coin_code', '_caes_coin_code', 'unique_code', '_caes_unique_code')
                 AND pm.meta_value = %s
                 AND pm.post_id != %d",
                $coin_code,
                $exclude_post_id
            )
        );

        if (empty($post_ids)) {
            return false;
        }

        foreach ($post_ids as $post_id) {
            $post_id = absint($post_id);

            foreach (caes_get_coin_unique_code_meta_keys() as $meta_key) {
                if (sanitize_text_field((string) get_post_meta($post_id, $meta_key, true)) === $coin_code) {
                    return $post_id;
                }
            }
        }

        return false;
    }
}

if (!function_exists('caes_get_coin_unique_code_meta_keys')) {
    function caes_get_coin_unique_code_meta_keys() {
        return array(
            'unique_code',
            '_caes_unique_code',
            'coin_code',
            '_caes_coin_code',
        );
    }
}

if (!function_exists('caes_is_final_unique_code_value')) {
    function caes_is_final_unique_code_value($code) {
        return (bool) preg_match('/-\d{3}$/', sanitize_text_field((string) $code));
    }
}

if (!function_exists('caes_unique_code_matches_base')) {
    function caes_unique_code_matches_base($unique_code, $base_coin_code) {
        $unique_code    = sanitize_text_field(trim((string) $unique_code));
        $base_coin_code = sanitize_text_field(trim((string) $base_coin_code));

        if ($unique_code === '' || $base_coin_code === '') {
            return false;
        }

        return strpos($unique_code, $base_coin_code . '-') === 0 && caes_is_final_unique_code_value($unique_code);
    }
}

if (!function_exists('caes_extract_unique_suffix_from_code')) {
    function caes_extract_unique_suffix_from_code($code, $base_coin_code) {
        $code           = sanitize_text_field(trim((string) $code));
        $base_coin_code = sanitize_text_field(trim((string) $base_coin_code));
        $prefix         = $base_coin_code . '-';

        if ($code === '' || $base_coin_code === '' || strpos($code, $prefix) !== 0) {
            return 0;
        }

        $suffix = substr($code, strlen($prefix));

        if (!preg_match('/^\d{3}$/', $suffix)) {
            return 0;
        }

        return (int) $suffix;
    }
}

if (!function_exists('caes_unique_code_exists_on_other_post')) {
    function caes_unique_code_exists_on_other_post($unique_code, $exclude_post_id = 0) {
        global $wpdb;

        $unique_code     = sanitize_text_field(trim((string) $unique_code));
        $exclude_post_id = absint($exclude_post_id);

        if ($unique_code === '') {
            return false;
        }

        $post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT pm.post_id
                 FROM {$wpdb->postmeta} pm
                 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key IN ('unique_code', '_caes_unique_code', 'coin_code', '_caes_coin_code')
                 AND pm.meta_value = %s
                 AND pm.post_id != %d",
                $unique_code,
                $exclude_post_id
            )
        );

        if (empty($post_ids)) {
            return false;
        }

        foreach ($post_ids as $post_id) {
            $post_id      = absint($post_id);
            $canonical    = sanitize_text_field((string) get_post_meta($post_id, 'unique_code', true));
            $audit_unique = sanitize_text_field((string) get_post_meta($post_id, '_caes_unique_code', true));
            $legacy_coin  = sanitize_text_field((string) get_post_meta($post_id, 'coin_code', true));
            $audit_coin   = sanitize_text_field((string) get_post_meta($post_id, '_caes_coin_code', true));

            if ($canonical === $unique_code || $audit_unique === $unique_code) {
                return $post_id;
            }

            if ($legacy_coin === $unique_code || $audit_coin === $unique_code) {
                return $post_id;
            }
        }

        return false;
    }
}

if (!function_exists('caes_duplicate_unique_code_error')) {
    function caes_duplicate_unique_code_error($unique_code) {
        if (function_exists('caes_duplicate_unique_code_match_error')) {
            return caes_duplicate_unique_code_match_error($unique_code);
        }

        return new WP_Error(
            'caes_duplicate_unique_code',
            'This coin already exists (matching unique code).',
            array(
                'unique_code' => sanitize_text_field((string) $unique_code),
                'status'      => 409,
            )
        );
    }
}

if (!function_exists('caes_duplicate_coin_code_error')) {
    function caes_duplicate_coin_code_error($coin_code) {
        if (function_exists('caes_duplicate_coin_code_match_error')) {
            return caes_duplicate_coin_code_match_error($coin_code);
        }

        return new WP_Error(
            'caes_duplicate_coin_code',
            'This coin already exists (matching coin code).',
            array(
                'coin_code' => sanitize_text_field((string) $coin_code),
                'status'    => 409,
            )
        );
    }
}

if (!function_exists('caes_validate_unique_code_for_post')) {
    function caes_validate_unique_code_for_post($unique_code, $post_id = 0) {
        if (function_exists('caes_validate_coin_duplicate_codes')) {
            return caes_validate_coin_duplicate_codes($unique_code, '', $post_id);
        }

        $unique_code = sanitize_text_field(trim((string) $unique_code));
        $post_id     = absint($post_id);

        if ($unique_code === '') {
            return true;
        }

        if (caes_unique_code_exists_on_other_post($unique_code, $post_id) !== false) {
            return caes_duplicate_unique_code_error($unique_code);
        }

        return true;
    }
}

if (!function_exists('caes_validate_unique_coin_code_for_post')) {
    function caes_validate_unique_coin_code_for_post($coin_code, $post_id = 0) {
        if (function_exists('caes_validate_coin_duplicate_codes')) {
            return caes_validate_coin_duplicate_codes('', $coin_code, $post_id);
        }

        $coin_code = sanitize_text_field(trim((string) $coin_code));
        $post_id   = absint($post_id);

        if ($coin_code === '') {
            return true;
        }

        if (caes_coin_code_exists_on_other_post($coin_code, $post_id) !== false) {
            return caes_duplicate_coin_code_error($coin_code);
        }

        return true;
    }
}

if (!function_exists('caes_resolve_coin_acf_post_id')) {
    function caes_resolve_coin_acf_post_id($input = null) {
        if (!empty($_POST['post_ID'])) {
            return absint($_POST['post_ID']);
        }

        if (!empty($_POST['_acf_post_id'])) {
            return absint($_POST['_acf_post_id']);
        }

        if (function_exists('acf_get_form_data')) {
            $form_post_id = acf_get_form_data('post_id');

            if (!empty($form_post_id) && is_numeric($form_post_id)) {
                return absint($form_post_id);
            }
        }

        if (is_numeric($input)) {
            return absint($input);
        }

        return 0;
    }
}

if (!function_exists('caes_validate_unique_coin_code_acf')) {
    function caes_validate_unique_coin_code_acf($valid, $value, $field, $input) {
        if ($valid !== true) {
            return $valid;
        }

        $post_id = caes_resolve_coin_acf_post_id($input);

        if ($post_id <= 0 || get_post_type($post_id) !== 'coin') {
            return $valid;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return $valid;
        }

        if (wp_is_post_revision($post_id)) {
            return $valid;
        }

        $coin_code = sanitize_text_field(trim((string) $value));

        if ($coin_code === '') {
            return $valid;
        }

        if (!caes_is_final_unique_code_value($coin_code)) {
            return 'Coin code must include a 3-digit suffix (for example -001).';
        }

        $unique_check = caes_validate_unique_coin_code_for_post($coin_code, $post_id);

        if (is_wp_error($unique_check)) {
            return $unique_check->get_error_message();
        }

        return $valid;
    }
}

if (!function_exists('caes_sync_coin_code_audit_meta')) {
    function caes_sync_coin_code_audit_meta($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0 || get_post_type($post_id) !== 'coin') {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($post_id)) {
            return;
        }

        if (function_exists('get_field')) {
            $coin_code = get_field('coin_code', $post_id);
        } else {
            $coin_code = get_post_meta($post_id, 'coin_code', true);
        }

        $coin_code = sanitize_text_field(trim((string) $coin_code));

        if ($coin_code === '') {
            delete_post_meta($post_id, '_caes_coin_code');
            return;
        }

        update_post_meta($post_id, '_caes_coin_code', $coin_code);
    }
}

if (!function_exists('caes_sync_coin_code_audit_meta_on_acf_save')) {
    function caes_sync_coin_code_audit_meta_on_acf_save($post_id) {
        if (!is_numeric($post_id)) {
            return;
        }

        caes_sync_coin_code_audit_meta(absint($post_id));
    }
}

if (!function_exists('caes_sync_coin_code_compatibility_meta')) {
    function caes_sync_coin_code_compatibility_meta($post_id, $final_coin_code = '') {
        $post_id = absint($post_id);

        if ($post_id <= 0 || get_post_type($post_id) !== 'coin') {
            return;
        }

        if ($final_coin_code === '') {
            $final_coin_code = sanitize_text_field(trim((string) caes_read_coin_acf_value($post_id, 'coin_code')));
        } else {
            $final_coin_code = sanitize_text_field(trim((string) $final_coin_code));
        }

        if ($final_coin_code === '') {
            delete_post_meta($post_id, '_caes_unique_code');
            delete_post_meta($post_id, 'unique_code');
            return;
        }

        update_post_meta($post_id, '_caes_unique_code', $final_coin_code);
        update_post_meta($post_id, 'unique_code', $final_coin_code);
    }
}

if (!function_exists('caes_sync_coin_codes_audit_meta_on_acf_save')) {
    function caes_sync_coin_codes_audit_meta_on_acf_save($post_id) {
        if (!is_numeric($post_id)) {
            return;
        }

        $post_id = absint($post_id);

        caes_sync_coin_code_audit_meta($post_id);
        caes_sync_coin_code_compatibility_meta($post_id);
    }
}

if (!function_exists('caes_save_final_coin_code')) {
    function caes_save_final_coin_code($post_id, $final_coin_code) {
        $post_id         = absint($post_id);
        $final_coin_code = sanitize_text_field(trim((string) $final_coin_code));

        if ($post_id <= 0 || $final_coin_code === '') {
            return false;
        }

        caes_save_coin_acf_fields($post_id, array(
            'coin_code' => $final_coin_code,
        ));
        caes_sync_coin_code_compatibility_meta($post_id, $final_coin_code);

        return true;
    }
}

if (!function_exists('caes_register_coin_code_acf_hooks')) {
    function caes_register_coin_code_acf_hooks() {
        add_filter('acf/validate_value/name=coin_code', 'caes_validate_unique_coin_code_acf', 10, 4);
    }
}

add_action('acf/init', 'caes_register_coin_code_acf_hooks');
add_action('acf/save_post', 'caes_sync_coin_codes_audit_meta_on_acf_save', 20);

if (!function_exists('caes_normalize_gallery_ids')) {
    function caes_normalize_gallery_ids($ids) {
        if (!is_array($ids)) {
            if ($ids === '' || $ids === null || $ids === false) {
                return array();
            }

            $ids = array($ids);
        }

        $normalized = array();

        foreach ($ids as $id) {
            if (is_array($id) && isset($id['id'])) {
                $id = $id['id'];
            } elseif (is_array($id) && isset($id['ID'])) {
                $id = $id['ID'];
            } elseif (is_object($id) && isset($id->ID)) {
                $id = $id->ID;
            }

            $id = absint($id);

            if ($id > 0) {
                $normalized[] = $id;
            }
        }

        return array_values(array_unique($normalized));
    }
}

if (!function_exists('caes_parse_photo_gallery_value')) {
    function caes_parse_photo_gallery_value($value) {
        if ($value === '' || $value === null || $value === false) {
            return array();
        }

        if (is_array($value)) {
            return caes_normalize_gallery_ids($value);
        }

        return caes_normalize_gallery_ids(explode(',', (string) $value));
    }
}

if (!function_exists('caes_format_photo_gallery_storage_value')) {
    function caes_format_photo_gallery_storage_value($gallery_ids) {
        $gallery_ids = caes_normalize_gallery_ids($gallery_ids);

        if (empty($gallery_ids)) {
            return '';
        }

        return implode(',', $gallery_ids);
    }
}

if (!function_exists('caes_get_coin_gallery_ids')) {
    function caes_get_coin_gallery_ids($post_id) {
        $value = null;

        if (function_exists('get_field')) {
            $value = get_field('coin_gallery_ids', $post_id);
        }

        if ($value === '' || $value === null || $value === false) {
            $value = get_post_meta($post_id, 'coin_gallery_ids', true);
        }

        if ($value === '' || $value === null || $value === false) {
            $value = get_post_meta($post_id, '_caes_coin_gallery_ids', true);
        }

        return caes_parse_photo_gallery_value($value);
    }
}

if (!function_exists('caes_save_coin_gallery_ids')) {
    function caes_save_coin_gallery_ids($post_id, $gallery_ids) {
        $gallery_ids = caes_normalize_gallery_ids($gallery_ids);
        $field_name  = 'coin_gallery_ids';
        $field_key   = caes_get_coin_gallery_field_key();

        if (empty($gallery_ids)) {
            delete_post_meta($post_id, '_caes_coin_gallery_ids');
            delete_post_meta($post_id, $field_name);

            if (function_exists('acf_delete_metadata')) {
                acf_delete_metadata($post_id, $field_name, true);
            } else {
                delete_post_meta($post_id, '_' . $field_name);
            }

            return;
        }

        update_post_meta($post_id, '_caes_coin_gallery_ids', $gallery_ids);

        $ids_string = caes_format_photo_gallery_storage_value($gallery_ids);

        update_post_meta($post_id, $field_name, $ids_string);

        if (function_exists('acf_update_metadata')) {
            acf_update_metadata($post_id, $field_name, $field_key, true);
        } else {
            update_post_meta($post_id, '_' . $field_name, $field_key);
        }

        if (function_exists('update_field')) {
            update_field($field_key, $ids_string, $post_id);
        }
    }
}

if (!function_exists('caes_save_coin_obverse_image_id')) {
    function caes_save_coin_obverse_image_id($post_id, $attachment_id) {
        $post_id       = absint($post_id);
        $attachment_id = absint($attachment_id);
        $field_name    = 'coin_image_obverse_id';
        $field_key     = caes_get_coin_obverse_field_key();

        if ($post_id <= 0 || $attachment_id <= 0) {
            return false;
        }

        update_post_meta($post_id, '_caes_obverse_image_id', $attachment_id);
        update_post_meta($post_id, $field_name, $attachment_id);

        if (function_exists('acf_update_metadata')) {
            acf_update_metadata($post_id, $field_name, $field_key, true);
        } else {
            update_post_meta($post_id, '_' . $field_name, $field_key);
        }

        if (function_exists('update_field')) {
            update_field($field_key, $attachment_id, $post_id);
        }

        return true;
    }
}

if (!function_exists('caes_save_coin_reverse_image_id')) {
    function caes_save_coin_reverse_image_id($post_id, $attachment_id) {
        $post_id       = absint($post_id);
        $attachment_id = absint($attachment_id);
        $field_name    = 'coin_image_reverse_id';
        $field_key     = caes_get_coin_reverse_field_key();

        if ($post_id <= 0 || $attachment_id <= 0) {
            return false;
        }

        update_post_meta($post_id, '_caes_reverse_image_id', $attachment_id);
        update_post_meta($post_id, $field_name, $attachment_id);

        if (function_exists('acf_update_metadata')) {
            acf_update_metadata($post_id, $field_name, $field_key, true);
        } else {
            update_post_meta($post_id, '_' . $field_name, $field_key);
        }

        if (function_exists('update_field')) {
            update_field($field_key, $attachment_id, $post_id);
        }

        return true;
    }
}

if (!function_exists('caes_get_request_gallery_id_list')) {
    function caes_get_request_gallery_id_list(WP_REST_Request $request, $key) {
        $params = caes_get_request_merged_params($request);

        if (!array_key_exists($key, $params)) {
            return array();
        }

        $raw = $params[$key];

        if ($raw === '' || $raw === null) {
            return array();
        }

        if (!is_array($raw)) {
            $raw = array($raw);
        }

        return caes_normalize_gallery_ids($raw);
    }
}

if (!function_exists('caes_get_remove_gallery_image_ids_from_request')) {
    function caes_get_remove_gallery_image_ids_from_request(WP_REST_Request $request) {
        return caes_get_request_gallery_id_list($request, 'remove_gallery_image_ids');
    }
}

if (!function_exists('caes_get_delete_gallery_attachment_ids_from_request')) {
    function caes_get_delete_gallery_attachment_ids_from_request(WP_REST_Request $request) {
        return caes_get_request_gallery_id_list($request, 'delete_gallery_attachment_ids');
    }
}

if (!function_exists('caes_replace_gallery_id_in_place')) {
    function caes_replace_gallery_id_in_place($gallery_ids, $old_id, $new_id) {
        $gallery_ids = caes_normalize_gallery_ids($gallery_ids);
        $old_id      = absint($old_id);
        $new_id      = absint($new_id);
        $replaced    = false;

        foreach ($gallery_ids as $index => $id) {
            if ($id === $old_id) {
                $gallery_ids[$index] = $new_id;
                $replaced            = true;
                break;
            }
        }

        if (!$replaced) {
            return null;
        }

        $result = array();

        foreach ($gallery_ids as $id) {
            if (!in_array($id, $result, true)) {
                $result[] = $id;
            }
        }

        return $result;
    }
}

if (!function_exists('caes_get_coin_gallery_api_payload')) {
    function caes_get_coin_gallery_api_payload($post_id) {
        $gallery = array();

        foreach (caes_get_coin_gallery_ids($post_id) as $attachment_id) {
            $url = wp_get_attachment_url($attachment_id);

            if (empty($url)) {
                continue;
            }

            $gallery[] = array(
                'id'  => (int) $attachment_id,
                'url' => $url,
            );
        }

        return array(
            'gallery'       => $gallery,
            'gallery_count' => count($gallery),
        );
    }
}

if (!function_exists('caes_build_gallery_update_response')) {
    function caes_build_gallery_update_response($post_id, $warnings = array()) {
        $payload = caes_get_coin_gallery_api_payload($post_id);

        $payload['warnings'] = is_array($warnings) ? array_values($warnings) : array();

        return $payload;
    }
}

if (!function_exists('caes_merge_coin_gallery_ids')) {
    function caes_merge_coin_gallery_ids($existing_ids, $remove_ids, $append_ids) {
        $existing      = caes_normalize_gallery_ids($existing_ids);
        $remove_lookup = array_flip(caes_normalize_gallery_ids($remove_ids));
        $append        = caes_normalize_gallery_ids($append_ids);
        $result        = array();

        foreach ($existing as $id) {
            if (!isset($remove_lookup[$id])) {
                $result[] = $id;
            }
        }

        $seen = array_flip($result);

        foreach ($append as $id) {
            if (!isset($seen[$id])) {
                $result[] = $id;
                $seen[$id] = true;
            }
        }

        return $result;
    }
}

if (!function_exists('caes_update_coin_gallery_from_request')) {
    function caes_update_coin_gallery_from_request($post_id, WP_REST_Request $request, $contributor = null) {
        $post_id         = absint($post_id);
        $params          = caes_get_request_merged_params($request);
        $initial_gallery = caes_get_coin_gallery_ids($post_id);
        $gallery         = $initial_gallery;
        $gallery_changed = false;
        $replace_old_id  = 0;
        $warnings        = array();

        if (array_key_exists('replace_gallery_image_id', $params)) {
            $replace_old_id = absint($params['replace_gallery_image_id']);
        }

        if ($replace_old_id > 0) {
            if (!in_array($replace_old_id, $gallery, true)) {
                return new WP_Error(
                    'rest_gallery_image_not_found',
                    'Gallery image to replace was not found on this coin.',
                    array('status' => 400)
                );
            }

            if (!caes_can_manage_coin_gallery_attachment($replace_old_id, $post_id, $contributor, $gallery)) {
                return new WP_Error(
                    'rest_gallery_replace_forbidden',
                    'Not allowed to replace this gallery image.',
                    array('status' => 403)
                );
            }

            $replacement_id = caes_handle_image_upload('replace_gallery_image', $post_id);

            if (is_wp_error($replacement_id)) {
                return $replacement_id;
            }

            if (empty($replacement_id)) {
                return new WP_Error(
                    'rest_missing_file',
                    'replace_gallery_image is required when replace_gallery_image_id is provided.',
                    array('status' => 400)
                );
            }

            caes_stamp_attachment_contributor($replacement_id, $contributor);

            $replaced_gallery = caes_replace_gallery_id_in_place($gallery, $replace_old_id, $replacement_id);

            if ($replaced_gallery === null) {
                return new WP_Error(
                    'rest_gallery_replace_failed',
                    'Failed to replace gallery image.',
                    array('status' => 400)
                );
            }

            $gallery         = $replaced_gallery;
            $gallery_changed = true;
        }

        $remove_ids = caes_get_remove_gallery_image_ids_from_request($request);

        foreach ($remove_ids as $attachment_id) {
            if (!in_array($attachment_id, $gallery, true)) {
                return new WP_Error(
                    'rest_gallery_image_not_found',
                    'Gallery image to remove was not found on this coin.',
                    array('status' => 400)
                );
            }

            if (!caes_can_manage_coin_gallery_attachment($attachment_id, $post_id, $contributor, $gallery)) {
                return new WP_Error(
                    'rest_gallery_remove_forbidden',
                    'Not allowed to remove this gallery image.',
                    array('status' => 403)
                );
            }
        }

        if (!empty($remove_ids)) {
            $gallery         = caes_merge_coin_gallery_ids($gallery, $remove_ids, array());
            $gallery_changed = true;
        }

        $new_ids = caes_handle_gallery_uploads('gallery_images', $post_id);

        if (is_wp_error($new_ids)) {
            return $new_ids;
        }

        if (!empty($new_ids)) {
            caes_stamp_attachment_contributors($new_ids, $contributor);
            $gallery         = caes_merge_coin_gallery_ids($gallery, array(), $new_ids);
            $gallery_changed = true;
        }

        if ($gallery_changed) {
            caes_save_coin_gallery_ids($post_id, $gallery);
        }

        if ($replace_old_id > 0) {
            caes_log_submission_event(
                $post_id,
                'image_replaced',
                'Gallery image replaced',
                'A gallery image was replaced.',
                array(
                    'field'  => 'coin_gallery_ids',
                    'old_id' => $replace_old_id,
                    'new_id' => isset($replacement_id) ? absint($replacement_id) : 0,
                ),
                $contributor
            );
            caes_delete_replaced_attachment_if_safe($replace_old_id, $post_id);
        }

        if (!empty($remove_ids)) {
            foreach ($remove_ids as $removed_id) {
                caes_log_submission_event(
                    $post_id,
                    'gallery_image_removed',
                    'Gallery image removed',
                    sprintf('Gallery image %d was removed from the submission.', $removed_id),
                    array('attachment_id' => $removed_id),
                    $contributor
                );
            }
        }

        if (!empty($new_ids)) {
            foreach ($new_ids as $added_id) {
                caes_log_submission_event(
                    $post_id,
                    'gallery_image_added',
                    'Gallery image added',
                    sprintf('Gallery image %d was added to the submission.', $added_id),
                    array('attachment_id' => $added_id),
                    $contributor
                );
            }
        }

        if ($gallery_changed) {
            caes_log_submission_event(
                $post_id,
                'gallery_updated',
                'Gallery updated',
                'Coin gallery images were updated.',
                array(
                    'gallery_count' => count($gallery),
                    'gallery_ids'   => $gallery,
                ),
                $contributor
            );
        }

        $delete_ids = caes_get_delete_gallery_attachment_ids_from_request($request);

        if (!empty($delete_ids)) {
            $delete_allowed_ids = caes_normalize_gallery_ids(array_merge($initial_gallery, $remove_ids));

            $delete_result = caes_delete_coin_gallery_attachments(
                $post_id,
                $delete_ids,
                $contributor,
                $delete_allowed_ids
            );

            if (!empty($delete_result['warnings'])) {
                $warnings = array_merge($warnings, $delete_result['warnings']);
            }
        }

        return caes_build_gallery_update_response($post_id, $warnings);
    }
}

if (!function_exists('caes_resolve_taxonomy_term_by_name')) {
    function caes_resolve_taxonomy_term_by_name($taxonomy, $value) {
        $taxonomy = sanitize_key($taxonomy);
        $value    = sanitize_text_field(trim((string) $value));

        if ($value === '') {
            return new WP_Error(
                'rest_invalid_taxonomy',
                'Taxonomy value is required.',
                array('status' => 400)
            );
        }

        if (!taxonomy_exists($taxonomy)) {
            return new WP_Error(
                'rest_invalid_taxonomy',
                sprintf('Taxonomy %s is not registered.', $taxonomy),
                array('status' => 500)
            );
        }

        $term = get_term_by('name', $value, $taxonomy);

        if ($term && !is_wp_error($term)) {
            return $term;
        }

        $terms = get_terms(array(
            'taxonomy'   => $taxonomy,
            'hide_empty' => false,
        ));

        if (is_wp_error($terms)) {
            return $terms;
        }

        $needle = strtolower($value);

        foreach ($terms as $candidate) {
            if (strtolower($candidate->name) === $needle) {
                return $candidate;
            }
        }

        return new WP_Error(
            'rest_invalid_taxonomy',
            sprintf('Unknown %s value: %s', $taxonomy, $value),
            array(
                'status'   => 400,
                'taxonomy' => $taxonomy,
                'value'    => $value,
            )
        );
    }
}

if (!function_exists('caes_get_coin_series_canonical_terms')) {
    function caes_get_coin_series_canonical_terms() {
        return array(
            'en' => array(
                'name' => 'Unity and Justice and Freedom',
                'slug' => 'unity-and-justice-and-freedom',
            ),
            'de' => array(
                'name' => 'Einigkeit und Recht und Freiheit',
                'slug' => 'einigkeit-und-recht-und-freiheit',
            ),
        );
    }
}

if (!function_exists('caes_get_coin_series_legacy_term_ids')) {
    function caes_get_coin_series_legacy_term_ids() {
        return array(197, 199);
    }
}

if (!function_exists('caes_get_coin_series_legacy_aliases')) {
    function caes_get_coin_series_legacy_aliases() {
        $canonical = caes_get_coin_series_canonical_terms();

        return array(
            'unity'                              => $canonical['en']['slug'],
            'justice and freedom'                => $canonical['en']['slug'],
            'unity, justice and freedom'         => $canonical['en']['slug'],
            'unity-justice-and-freedom'          => $canonical['en']['slug'],
            'unity-justice-freedom'              => $canonical['en']['slug'],
            'einigkeit, recht und freiheit'      => $canonical['de']['slug'],
        );
    }
}

if (!function_exists('caes_map_coin_series_legacy_input')) {
    function caes_map_coin_series_legacy_input($value) {
        if (is_int($value) || (is_string($value) && preg_match('/^\d+$/', trim((string) $value)))) {
            $term_id = absint($value);

            if (in_array($term_id, caes_get_coin_series_legacy_term_ids(), true)) {
                return caes_get_coin_series_canonical_terms()['en']['slug'];
            }

            return $term_id;
        }

        $value = trim(wp_unslash((string) $value));

        if ($value === '') {
            return $value;
        }

        $aliases = caes_get_coin_series_legacy_aliases();
        $needles = array(
            strtolower($value),
            strtolower(sanitize_title($value)),
        );

        foreach ($aliases as $legacy => $canonical_slug) {
            if (in_array(strtolower($legacy), $needles, true)) {
                return $canonical_slug;
            }
        }

        return $value;
    }
}

if (!function_exists('caes_format_coin_series_name_for_api')) {
    function caes_format_coin_series_name_for_api($name, $language = 'de') {
        $name = trim((string) $name);

        if ($name === '') {
            return '';
        }

        $resolved = caes_resolve_coin_series_term(caes_map_coin_series_legacy_input($name));

        if (!is_wp_error($resolved)) {
            return (string) $resolved->name;
        }

        $language   = function_exists('caes_normalize_taxonomy_options_language')
            ? caes_normalize_taxonomy_options_language($language)
            : 'de';
        $canonical  = caes_get_coin_series_canonical_terms();
        $legacy_key = strtolower($name);

        foreach (caes_get_coin_series_legacy_aliases() as $legacy => $slug) {
            if (strtolower($legacy) === $legacy_key) {
                if ($slug === $canonical['de']['slug']) {
                    return $canonical['de']['name'];
                }

                return $canonical['en']['name'];
            }
        }

        return $name;
    }
}

if (!function_exists('caes_normalize_coin_series_request_value')) {
    function caes_normalize_coin_series_request_value($value) {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            if (count($value) === 0) {
                return '';
            }

            if (count($value) === 1) {
                return caes_normalize_coin_series_request_value(reset($value));
            }

            return new WP_Error(
                'rest_invalid_taxonomy',
                'coin_series must be a single term value.',
                array(
                    'status' => 400,
                    'field'  => 'coin_series',
                )
            );
        }

        return caes_map_coin_series_legacy_input($value);
    }
}

if (!function_exists('caes_resolve_coin_series_term')) {
    function caes_resolve_coin_series_term($value) {
        $value = caes_map_coin_series_legacy_input($value);
        if (!taxonomy_exists('coin_series')) {
            return new WP_Error(
                'rest_invalid_taxonomy',
                'Taxonomy coin_series is not registered.',
                array('status' => 500)
            );
        }

        if (is_int($value) || (is_string($value) && preg_match('/^\d+$/', trim((string) $value)))) {
            $term_id = absint($value);

            if ($term_id <= 0) {
                return new WP_Error(
                    'rest_invalid_taxonomy',
                    'Coin series term ID is invalid.',
                    array(
                        'status' => 400,
                        'field'  => 'coin_series',
                    )
                );
            }

            $term = get_term($term_id, 'coin_series');

            if ($term && !is_wp_error($term)) {
                return $term;
            }

            return new WP_Error(
                'rest_invalid_taxonomy',
                'Coin series term ID was not found.',
                array(
                    'status' => 400,
                    'field'  => 'coin_series',
                )
            );
        }

        $value = trim(wp_unslash((string) $value));

        if ($value === '') {
            return new WP_Error(
                'rest_invalid_taxonomy',
                'Coin series value is required.',
                array(
                    'status' => 400,
                    'field'  => 'coin_series',
                )
            );
        }

        $term = get_term_by('slug', $value, 'coin_series');

        if ($term && !is_wp_error($term)) {
            return $term;
        }

        $term = get_term_by('name', $value, 'coin_series');

        if ($term && !is_wp_error($term)) {
            return $term;
        }

        $series_term_args = array(
            'taxonomy'         => 'coin_series',
            'hide_empty'       => false,
            'suppress_filters' => true,
        );

        if (function_exists('pll_languages_list')) {
            $series_term_args['lang'] = '';
        }

        $terms = get_terms($series_term_args);

        if (is_wp_error($terms)) {
            return $terms;
        }

        $needle      = strtolower($value);
        $needle_slug = strtolower(sanitize_title($value));

        foreach ($terms as $candidate) {
            if (strtolower($candidate->name) === $needle) {
                return $candidate;
            }

            if (strtolower($candidate->slug) === $needle || strtolower($candidate->slug) === $needle_slug) {
                return $candidate;
            }
        }

        return new WP_Error(
            'rest_invalid_taxonomy',
            'Coin series is not a valid existing option.',
            array(
                'status' => 400,
                'field'  => 'coin_series',
                'value'  => $value,
            )
        );
    }
}

if (!function_exists('caes_assign_coin_series_term')) {
    function caes_assign_coin_series_term($post_id, $series_resolution) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return new WP_Error(
                'rest_taxonomy_assign_failed',
                'Failed to assign coin_series.',
                array(
                    'status' => 500,
                    'field'  => 'coin_series',
                )
            );
        }

        if ($series_resolution === false) {
            $result = wp_set_object_terms($post_id, array(), 'coin_series', false);
        } else {
            $term_id = absint($series_resolution['term_id'] ?? 0);

            if ($term_id <= 0) {
                return new WP_Error(
                    'rest_taxonomy_assign_failed',
                    'Failed to assign coin_series.',
                    array(
                        'status' => 500,
                        'field'  => 'coin_series',
                    )
                );
            }

            $result = wp_set_object_terms($post_id, array($term_id), 'coin_series', false);
        }

        if (is_wp_error($result)) {
            return new WP_Error(
                'rest_taxonomy_assign_failed',
                'Failed to assign coin_series.',
                array(
                    'status' => 500,
                    'field'  => 'coin_series',
                )
            );
        }

        return true;
    }
}

if (!function_exists('caes_get_allowed_coin_issue_statuses')) {
    function caes_get_allowed_coin_issue_statuses() {
        return array('scheduled', 'released', 'withdrawn', 'cancelled');
    }
}

if (!function_exists('caes_validate_submission_taxonomies')) {
    function caes_validate_submission_taxonomies($country, $denomination, $coin_type, $coin_series = null) {
        $fields = array(
            'country'      => array(
                'value'    => $country,
                'taxonomy' => 'coin_country',
                'label'    => 'Country',
            ),
            'denomination' => array(
                'value'    => $denomination,
                'taxonomy' => 'coin_value',
                'label'    => 'Denomination',
            ),
            'coin_type'    => array(
                'value'    => $coin_type,
                'taxonomy' => 'coin_type',
                'label'    => 'Coin type',
            ),
        );

        $resolved = array();

        foreach ($fields as $field_key => $field) {
            $term = caes_resolve_taxonomy_term_by_name($field['taxonomy'], $field['value']);

            if (is_wp_error($term)) {
                return new WP_Error(
                    'rest_invalid_taxonomy',
                    sprintf('%s is not a valid existing option.', $field['label']),
                    array(
                        'status' => 400,
                        'field'  => $field_key,
                    )
                );
            }

            $resolved[$field_key] = array(
                'term_id'  => (int) $term->term_id,
                'name'     => (string) $term->name,
                'slug'     => (string) $term->slug,
                'taxonomy' => (string) $field['taxonomy'],
            );
        }

        if ($coin_series !== null) {
            if ($coin_series === '' || $coin_series === 0) {
                $resolved['coin_series'] = false;
            } else {
                $series_term = caes_resolve_coin_series_term($coin_series);

                if (is_wp_error($series_term)) {
                    return $series_term;
                }

                $resolved['coin_series'] = array(
                    'term_id'  => (int) $series_term->term_id,
                    'name'     => (string) $series_term->name,
                    'slug'     => (string) $series_term->slug,
                    'taxonomy' => 'coin_series',
                );
            }
        }

        return $resolved;
    }
}

if (!function_exists('caes_assign_submission_taxonomies')) {
    function caes_assign_submission_taxonomies($post_id, $resolved_taxonomies) {
        $post_id = absint($post_id);

        if ($post_id <= 0 || !is_array($resolved_taxonomies)) {
            return new WP_Error(
                'rest_taxonomy_assign_failed',
                'Failed to assign taxonomy terms.',
                array('status' => 500)
            );
        }

        $assignments = array(
            'country'      => 'coin_country',
            'denomination' => 'coin_value',
            'coin_type'    => 'coin_type',
        );

        foreach ($assignments as $field_key => $taxonomy) {
            if (empty($resolved_taxonomies[$field_key]['term_id'])) {
                return new WP_Error(
                    'rest_taxonomy_assign_failed',
                    sprintf('Failed to assign %s.', $field_key),
                    array(
                        'status' => 500,
                        'field'  => $field_key,
                    )
                );
            }

            $result = wp_set_object_terms(
                $post_id,
                array((int) $resolved_taxonomies[$field_key]['term_id']),
                $taxonomy,
                false
            );

            if (is_wp_error($result)) {
                return new WP_Error(
                    'rest_taxonomy_assign_failed',
                    sprintf('Failed to assign %s.', $field_key),
                    array(
                        'status' => 500,
                        'field'  => $field_key,
                    )
                );
            }
        }

        if (array_key_exists('coin_series', $resolved_taxonomies)) {
            $series_assign = caes_assign_coin_series_term(
                $post_id,
                $resolved_taxonomies['coin_series'] === false
                    ? false
                    : (array) $resolved_taxonomies['coin_series']
            );

            if (is_wp_error($series_assign)) {
                return $series_assign;
            }
        }

        return true;
    }
}

if (!function_exists('caes_is_valid_country_iso_code')) {
    function caes_is_valid_country_iso_code($code) {
        $code = strtoupper(sanitize_text_field((string) $code));

        return (bool) preg_match('/^[A-Z]{2}$/', $code);
    }
}

if (!function_exists('caes_get_country_iso_fallback_map')) {
    function caes_get_country_iso_fallback_map() {
        return array(
            'germany'       => 'DE',
            'france'        => 'FR',
            'italy'         => 'IT',
            'spain'         => 'ES',
            'belgium'       => 'BE',
            'netherlands'   => 'NL',
            'austria'       => 'AT',
            'finland'       => 'FI',
            'ireland'       => 'IE',
            'portugal'      => 'PT',
            'greece'        => 'GR',
            'luxembourg'    => 'LU',
            'malta'         => 'MT',
            'slovenia'      => 'SI',
            'slovakia'      => 'SK',
            'estonia'       => 'EE',
            'latvia'        => 'LV',
            'lithuania'     => 'LT',
            'cyprus'        => 'CY',
            'monaco'        => 'MC',
            'san-marino'    => 'SM',
            'vatican-city'  => 'VA',
            'andorra'       => 'AD',
            'croatia'       => 'HR',
        );
    }
}

if (!function_exists('caes_normalize_country_lookup_key')) {
    function caes_normalize_country_lookup_key($value) {
        $value = strtolower(remove_accents(sanitize_text_field((string) $value)));
        $value = str_replace('_', '-', $value);
        $value = preg_replace('/\s+/', '-', $value);

        return trim($value, '-');
    }
}

if (!function_exists('caes_get_country_iso_code_from_fallback')) {
    function caes_get_country_iso_code_from_fallback($country_name, $term = null) {
        $map  = caes_get_country_iso_fallback_map();
        $keys = array();

        if ($country_name !== '') {
            $keys[] = caes_normalize_country_lookup_key($country_name);
        }

        if (!empty($term) && !is_wp_error($term)) {
            $keys[] = caes_normalize_country_lookup_key($term->name);
            $keys[] = caes_normalize_country_lookup_key($term->slug);
        }

        foreach (array_unique(array_filter($keys)) as $key) {
            if (!empty($map[$key]) && caes_is_valid_country_iso_code($map[$key])) {
                return $map[$key];
            }
        }

        return '';
    }
}

if (!function_exists('caes_maybe_persist_country_term_iso_code')) {
    function caes_maybe_persist_country_term_iso_code($term, $iso_code) {
        if (empty($term) || is_wp_error($term) || !caes_is_valid_country_iso_code($iso_code)) {
            return;
        }

        $existing = get_term_meta($term->term_id, 'country_code', true);

        if ($existing !== '' && caes_is_valid_country_iso_code($existing)) {
            return;
        }

        update_term_meta($term->term_id, 'country_code', $iso_code);

        if (function_exists('update_field')) {
            update_field('country_code', $iso_code, 'coin_country_' . $term->term_id);
        }
    }
}

if (!function_exists('caes_get_country_code_from_term_name')) {
    function caes_get_country_code_from_term_name($country_name) {
        $country_name = sanitize_text_field($country_name);

        if ($country_name === '') {
            return '';
        }

        $term = get_term_by('name', $country_name, 'coin_country');

        if (!$term || is_wp_error($term)) {
            return caes_get_country_iso_code_from_fallback($country_name);
        }

        $meta_keys = array('country_code', 'coin_country_code', 'code');

        foreach ($meta_keys as $meta_key) {
            $code = '';

            if (function_exists('get_field')) {
                $acf_code = get_field($meta_key, 'coin_country_' . $term->term_id);

                if ($acf_code !== '' && $acf_code !== null && $acf_code !== false) {
                    $code = $acf_code;
                }
            }

            if ($code === '') {
                $code = get_term_meta($term->term_id, $meta_key, true);
            }

            if ($code !== '' && $code !== null && $code !== false) {
                $code = strtoupper(sanitize_text_field((string) $code));

                if (caes_is_valid_country_iso_code($code)) {
                    return $code;
                }
            }
        }

        $slug = strtoupper(sanitize_text_field($term->slug));

        if (caes_is_valid_country_iso_code($slug)) {
            return $slug;
        }

        $fallback = caes_get_country_iso_code_from_fallback($country_name, $term);

        if ($fallback !== '') {
            caes_maybe_persist_country_term_iso_code($term, $fallback);
            return $fallback;
        }

        return '';
    }
}

if (!function_exists('caes_validate_country_code_for_coin_generation')) {
    function caes_validate_country_code_for_coin_generation($country_name) {
        $country_code = caes_get_country_code_from_term_name($country_name);

        if ($country_code === '') {
            return new WP_Error(
                'caes_missing_country_code',
                'Country code could not be resolved for the selected country.',
                array('status' => 400)
            );
        }

        return $country_code;
    }
}

if (!function_exists('caes_save_coin_country_code_from_country')) {
    function caes_save_coin_country_code_from_country($post_id, $country_name) {
        $country_name = sanitize_text_field($country_name);

        if ($country_name === '') {
            return;
        }

        $country_code = caes_get_country_code_from_term_name($country_name);

        if ($country_code === '') {
            return;
        }

        caes_save_coin_acf_fields($post_id, array(
            'coin_country_code' => $country_code,
        ));
    }
}

if (!function_exists('caes_normalize_coin_code_part')) {
    function caes_normalize_coin_code_part($value) {
        $value = sanitize_text_field((string) $value);
        $value = remove_accents($value);
        $value = strtoupper($value);
        $value = preg_replace('/[^A-Z0-9]/', '', $value);

        return $value;
    }
}

if (!function_exists('caes_normalize_release_date_for_coin_code')) {
    function caes_normalize_release_date_for_coin_code($value) {
        $value = trim(sanitize_text_field((string) $value));

        if ($value === '') {
            return '';
        }

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $matches)) {
            return $matches[1] . $matches[2] . $matches[3];
        }

        if (preg_match('/^\d{8}$/', $value)) {
            return $value;
        }

        if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $value, $matches)) {
            return $matches[3] . $matches[2] . $matches[1];
        }

        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $value, $matches)) {
            return $matches[3] . $matches[2] . $matches[1];
        }

        return '';
    }
}

if (!function_exists('caes_coin_code_has_release_date_suffix')) {
    function caes_coin_code_has_release_date_suffix($coin_code) {
        return (bool) preg_match('/-\d{8}$/', sanitize_text_field((string) $coin_code));
    }
}

if (!function_exists('caes_generate_coin_code')) {
    function caes_generate_coin_code($country, $year, $denomination, $coin_type, $released_date = '') {
        $country_code = caes_get_country_code_from_term_name($country);
        $year_part    = (string) absint($year);
        $value_part   = caes_normalize_coin_code_part($denomination);
        $type_part    = caes_normalize_coin_code_part($coin_type);
        $released_date = caes_normalize_release_date_for_coin_code($released_date);

        if ($country_code === '' || $year_part === '0' || $value_part === '' || $type_part === '') {
            return '';
        }

        $base = $country_code . '-' . $year_part . '-' . $value_part . '-' . $type_part;

        if ($released_date === '') {
            return $base;
        }

        return $base . '-' . $released_date;
    }
}

if (!function_exists('caes_collect_unique_code_suffixes_for_base')) {
    function caes_collect_unique_code_suffixes_for_base($base_coin_code, $exclude_post_id = 0, $reserved_codes = array()) {
        global $wpdb;

        $base_coin_code  = sanitize_text_field(trim((string) $base_coin_code));
        $exclude_post_id = absint($exclude_post_id);
        $suffixes        = array();

        if ($base_coin_code === '') {
            return $suffixes;
        }

        $post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT pm.post_id
                 FROM {$wpdb->postmeta} pm
                 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key IN ('unique_code', '_caes_unique_code', 'coin_code', '_caes_coin_code')
                 AND pm.meta_value LIKE %s
                 AND pm.post_id != %d",
                $wpdb->esc_like($base_coin_code) . '-%',
                $exclude_post_id
            )
        );

        foreach ($post_ids as $post_id) {
            $post_id = absint($post_id);

            foreach (caes_get_coin_unique_code_meta_keys() as $meta_key) {
                $value   = sanitize_text_field((string) get_post_meta($post_id, $meta_key, true));
                $suffix  = caes_extract_unique_suffix_from_code($value, $base_coin_code);

                if ($suffix > 0) {
                    $suffixes[] = $suffix;
                }
            }
        }

        foreach ((array) $reserved_codes as $reserved_code) {
            $suffix = caes_extract_unique_suffix_from_code($reserved_code, $base_coin_code);

            if ($suffix > 0) {
                $suffixes[] = $suffix;
            }
        }

        return array_values(array_unique(array_map('intval', $suffixes)));
    }
}

if (!function_exists('caes_get_highest_unique_code_suffix_for_base')) {
    function caes_get_highest_unique_code_suffix_for_base($base_coin_code, $exclude_post_id = 0, $reserved_codes = array()) {
        $suffixes = caes_collect_unique_code_suffixes_for_base($base_coin_code, $exclude_post_id, $reserved_codes);

        if (empty($suffixes)) {
            return 0;
        }

        return max($suffixes);
    }
}

if (!function_exists('caes_is_unique_code_reserved')) {
    function caes_is_unique_code_reserved($unique_code, $reserved_codes = array()) {
        $unique_code = strtolower(sanitize_text_field(trim((string) $unique_code)));

        if ($unique_code === '') {
            return false;
        }

        foreach ((array) $reserved_codes as $reserved_code) {
            if (strtolower(sanitize_text_field((string) $reserved_code)) === $unique_code) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('caes_generate_unique_code')) {
    function caes_generate_unique_code($base_coin_code, $exclude_post_id = 0, $reserved_codes = array()) {
        $base_coin_code = sanitize_text_field(trim((string) $base_coin_code));

        if ($base_coin_code === '' || !caes_coin_code_has_release_date_suffix($base_coin_code)) {
            return '';
        }

        $start_suffix = caes_get_highest_unique_code_suffix_for_base($base_coin_code, $exclude_post_id, $reserved_codes) + 1;

        for ($suffix = $start_suffix; $suffix <= 999; $suffix++) {
            $candidate = $base_coin_code . '-' . str_pad((string) $suffix, 3, '0', STR_PAD_LEFT);

            if (caes_is_unique_code_reserved($candidate, $reserved_codes)) {
                continue;
            }

            if (caes_coin_code_exists_on_other_post($candidate, $exclude_post_id) === false) {
                return $candidate;
            }
        }

        return '';
    }
}

if (!function_exists('caes_resolve_unique_code_for_post')) {
    function caes_resolve_unique_code_for_post($base_coin_code, $post_id = 0, $force_new_suffix = false, $reserved_codes = array()) {
        $base_coin_code = sanitize_text_field(trim((string) $base_coin_code));
        $post_id        = absint($post_id);

        if ($base_coin_code === '' || !caes_coin_code_has_release_date_suffix($base_coin_code)) {
            return '';
        }

        if (!$force_new_suffix && $post_id > 0) {
            $existing = sanitize_text_field((string) caes_read_coin_acf_value($post_id, 'coin_code'));

            if ($existing !== '' && caes_unique_code_matches_base($existing, $base_coin_code)) {
                if (caes_coin_code_exists_on_other_post($existing, $post_id) !== false) {
                    return caes_duplicate_unique_code_error($existing);
                }

                if (!caes_is_unique_code_reserved($existing, $reserved_codes)) {
                    return $existing;
                }
            }
        }

        return caes_generate_unique_code($base_coin_code, $post_id, $reserved_codes);
    }
}

if (!function_exists('caes_get_coin_released_date_for_codes')) {
    function caes_get_coin_released_date_for_codes($post_id) {
        return caes_normalize_release_date_for_coin_code(caes_read_coin_acf_value($post_id, 'released_date'));
    }
}

if (!function_exists('caes_get_coin_code_taxonomy_context')) {
    function caes_get_coin_code_taxonomy_context($post_id) {
        $type_terms = wp_get_post_terms($post_id, 'coin_type', array('fields' => 'names'));

        return array(
            'country'      => (string) get_post_meta($post_id, '_caes_country', true),
            'year'         => absint(get_post_meta($post_id, '_caes_year', true)),
            'denomination' => (string) get_post_meta($post_id, '_caes_denomination', true),
            'coin_type'    => (!is_wp_error($type_terms) && !empty($type_terms)) ? (string) $type_terms[0] : '',
        );
    }
}

if (!function_exists('caes_save_generated_coin_codes')) {
    function caes_save_generated_coin_codes($post_id, $country, $year, $denomination, $coin_type, $released_date = '', $options = array()) {
        $post_id              = absint($post_id);
        $require_release_date = !empty($options['require_release_date']);
        $require_unique_code  = !empty($options['require_unique_code']);
        $force_new_suffix     = !empty($options['force_new_suffix']);
        $final_coin_code_override = sanitize_text_field((string) ($options['coin_code_override'] ?? ($options['unique_code_override'] ?? '')));
        $reserved_codes           = array_map('strval', (array) ($options['reserved_unique_codes'] ?? array()));
        $released_date            = caes_normalize_release_date_for_coin_code($released_date);

        if ($require_release_date && $released_date === '') {
            return new WP_Error(
                'caes_missing_release_date',
                'Release date is required to generate the unique coin code.',
                array('status' => 400)
            );
        }

        if ($require_unique_code) {
            $country_code_check = caes_validate_country_code_for_coin_generation($country);

            if (is_wp_error($country_code_check)) {
                return $country_code_check;
            }
        }

        if ($final_coin_code_override !== '') {
            if (!caes_is_final_unique_code_value($final_coin_code_override)) {
                return new WP_Error(
                    'caes_invalid_coin_code',
                    'Coin code must include a 3-digit suffix (for example -001).',
                    array('status' => 400)
                );
            }

            $unique_check = caes_validate_coin_duplicate_codes(
                $final_coin_code_override,
                $final_coin_code_override,
                $post_id
            );

            if (is_wp_error($unique_check)) {
                return $unique_check;
            }

            if (caes_is_unique_code_reserved($final_coin_code_override, $reserved_codes)) {
                return caes_duplicate_unique_code_error($final_coin_code_override);
            }

            caes_save_final_coin_code($post_id, $final_coin_code_override);

            return array(
                'coin_code'   => $final_coin_code_override,
                'unique_code' => $final_coin_code_override,
            );
        }

        $base_coin_code = caes_generate_coin_code($country, $year, $denomination, $coin_type, $released_date);

        if ($base_coin_code === '') {
            if ($require_unique_code) {
                $country_code_check = caes_validate_country_code_for_coin_generation($country);

                if (is_wp_error($country_code_check)) {
                    return $country_code_check;
                }
            }

            return true;
        }

        if ($released_date !== '' && caes_coin_code_has_release_date_suffix($base_coin_code)) {
            $final_coin_code = caes_resolve_unique_code_for_post($base_coin_code, $post_id, $force_new_suffix, $reserved_codes);

            if (is_wp_error($final_coin_code)) {
                return $final_coin_code;
            }

            if ($final_coin_code === '') {
                return new WP_Error(
                    'caes_unique_code_generate_failed',
                    'Failed to generate unique code.',
                    array('status' => 500)
                );
            }

            $unique_check = caes_validate_coin_duplicate_codes(
                $final_coin_code,
                $final_coin_code,
                $post_id
            );

            if (is_wp_error($unique_check)) {
                return $unique_check;
            }

            caes_save_final_coin_code($post_id, $final_coin_code);

            return array(
                'coin_code'   => $final_coin_code,
                'unique_code' => $final_coin_code,
            );
        }

        if ($require_unique_code) {
            return new WP_Error(
                'caes_missing_release_date',
                'Release date is required to generate the unique coin code.',
                array('status' => 400)
            );
        }

        return true;
    }
}

if (!function_exists('caes_save_generated_coin_code')) {
    function caes_save_generated_coin_code($post_id, $country, $year, $denomination, $coin_type, $released_date = '', $options = array()) {
        $result = caes_save_generated_coin_codes($post_id, $country, $year, $denomination, $coin_type, $released_date, $options);

        if (is_wp_error($result)) {
            return $result;
        }

        if ($result === true) {
            return true;
        }

        return $result['coin_code'];
    }
}

if (!function_exists('caes_finalize_coin_codes_for_publish')) {
    function caes_finalize_coin_codes_for_publish($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0 || get_post_type($post_id) !== 'coin') {
            return new WP_Error(
                'caes_invalid_coin_post',
                'Invalid coin submission.',
                array('status' => 400)
            );
        }

        $context = caes_get_coin_code_taxonomy_context($post_id);

        if (
            $context['country'] === ''
            || $context['year'] <= 0
            || $context['denomination'] === ''
            || $context['coin_type'] === ''
        ) {
            return new WP_Error(
                'caes_missing_code_fields',
                'Country, year, denomination, and coin type are required before approval.',
                array('status' => 400)
            );
        }

        $country_code_check = caes_validate_country_code_for_coin_generation($context['country']);

        if (is_wp_error($country_code_check)) {
            return $country_code_check;
        }

        if (caes_get_coin_released_date_for_codes($post_id) === '') {
            return new WP_Error(
                'caes_missing_release_date',
                'Release date is required to generate the unique coin code.',
                array('status' => 400)
            );
        }

        $existing_coin_code = sanitize_text_field((string) caes_read_coin_acf_value($post_id, 'coin_code'));

        if ($existing_coin_code !== '') {
            $duplicate_check = caes_validate_coin_duplicate_codes(
                $existing_coin_code,
                $existing_coin_code,
                $post_id
            );

            if (is_wp_error($duplicate_check)) {
                return $duplicate_check;
            }
        }

        if (
            $existing_coin_code !== ''
            && !caes_is_final_unique_code_value($existing_coin_code)
        ) {
            return caes_save_generated_coin_codes(
                $post_id,
                $context['country'],
                $context['year'],
                $context['denomination'],
                $context['coin_type'],
                caes_get_coin_released_date_for_codes($post_id),
                array(
                    'require_release_date' => true,
                    'require_unique_code'  => true,
                    'force_new_suffix'     => true,
                )
            );
        }

        return caes_save_generated_coin_codes(
            $post_id,
            $context['country'],
            $context['year'],
            $context['denomination'],
            $context['coin_type'],
            caes_get_coin_released_date_for_codes($post_id),
            array(
                'require_release_date' => true,
                'require_unique_code'  => true,
                'force_new_suffix'     => false,
            )
        );
    }
}

if (!function_exists('caes_get_german_mint_mark_code_options')) {
    function caes_get_german_mint_mark_code_options() {
        return array(
            'A' => 'Berlin',
            'D' => 'Munich',
            'F' => 'Stuttgart',
            'G' => 'Karlsruhe',
            'J' => 'Hamburg',
        );
    }
}

if (!function_exists('caes_get_german_mint_mark_import_hint')) {
    function caes_get_german_mint_mark_import_hint() {
        $parts = array();

        foreach (caes_get_german_mint_mark_code_options() as $letter => $city) {
            $parts[] = $city . ' (' . $letter . ')';
        }

        return implode(', ', $parts);
    }
}

if (!function_exists('caes_normalize_german_mint_mark_code')) {
    function caes_normalize_german_mint_mark_code($value) {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        $options = caes_get_german_mint_mark_code_options();
        $upper   = strtoupper($value);

        if (isset($options[$upper])) {
            return $upper;
        }

        foreach ($options as $letter => $city) {
            if (strcasecmp($value, $city) === 0) {
                return $letter;
            }
        }

        return '';
    }
}

if (!function_exists('caes_sanitize_mint_variant_rows')) {
    function caes_sanitize_mint_variant_rows($rows) {
        if (!is_array($rows)) {
            if (is_string($rows) && $rows !== '') {
                $decoded = json_decode($rows, true);
                $rows    = is_array($decoded) ? $decoded : array();
            } else {
                return array();
            }
        }

        $sanitized = array();

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $mark_code = sanitize_text_field((string) ($row['mint_mark_code'] ?? ''));
            $mintage   = sanitize_text_field((string) ($row['mint_mintage'] ?? ''));
            $notes     = sanitize_textarea_field((string) ($row['mint_notes'] ?? ''));

            if ($mark_code === '' && $mintage === '' && $notes === '') {
                continue;
            }

            $sanitized[] = array(
                'mint_mark_code' => $mark_code,
                'mint_mintage'   => $mintage,
                'mint_notes'     => $notes,
            );
        }

        return $sanitized;
    }
}

if (!function_exists('caes_format_mint_variants_for_api')) {
    function caes_format_mint_variants_for_api($rows) {
        if (!is_array($rows) || empty($rows)) {
            return array();
        }

        $formatted = array();

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $formatted[] = array(
                'mint_mark_code' => (string) ($row['mint_mark_code'] ?? ''),
                'mint_mintage'   => (string) ($row['mint_mintage'] ?? ''),
                'mint_notes'     => (string) ($row['mint_notes'] ?? ''),
            );
        }

        return $formatted;
    }
}

if (!function_exists('caes_get_mint_fields_from_request')) {
    function caes_get_mint_fields_from_request(WP_REST_Request $request, $only_if_present = false) {
        $params = caes_get_request_merged_params($request);

        if (!array_key_exists('has_mint_variants', $params)) {
            return null;
        }

        $has_variants = caes_sanitize_bool_acf_field($params['has_mint_variants']);
        $fields       = array(
            'coin_has_mint_variants' => $has_variants,
        );

        if ($has_variants === 0) {
            $fields['coin_mint_marks_available'] = '';
            $fields['coin_mint_variants']        = array();
            $fields['coin_mint_mark']            = array_key_exists('single_mint_mark', $params)
                ? sanitize_text_field((string) $params['single_mint_mark'])
                : '';

            return $fields;
        }

        $fields['coin_mint_mark'] = '';

        if (array_key_exists('mint_marks_available', $params)) {
            $fields['coin_mint_marks_available'] = sanitize_text_field((string) $params['mint_marks_available']);
        } elseif (!$only_if_present) {
            $fields['coin_mint_marks_available'] = '';
        }

        if (array_key_exists('mint_variants', $params)) {
            $fields['coin_mint_variants'] = caes_sanitize_mint_variant_rows($params['mint_variants']);
        } elseif (!$only_if_present) {
            $fields['coin_mint_variants'] = array();
        }

        return $fields;
    }
}

if (!function_exists('caes_save_mint_fields')) {
    function caes_save_mint_fields($post_id, $mint_fields) {
        if ($mint_fields === null || !is_array($mint_fields)) {
            return;
        }

        foreach ($mint_fields as $key => $value) {
            if (function_exists('update_field')) {
                if ($key === 'coin_mint_variants') {
                    update_field($key, is_array($value) ? $value : array(), $post_id);
                    continue;
                }

                if ($value === '' || $value === null) {
                    update_field($key, '', $post_id);
                    continue;
                }

                update_field($key, $value, $post_id);
                continue;
            }

            update_post_meta($post_id, $key, $value);
        }
    }
}

if (!function_exists('caes_get_optional_acf_field_keys')) {
    function caes_get_optional_acf_field_keys() {
        return array(
            'coin_theme',
            'released_date',
            'coin_mintage',
            'coin_material',
            'coin_quality',
            'coin_weight_g',
            'coin_diameter_mm',
            'coin_thickness_mm',
            'coin_edge_inscription',
            'coin_obverse_description',
            'coin_reverse_description',
            'coin_historical_background',
            'coin_collector_notes',
            'coin_designer',
            'coin_issue_status',
            'coin_source_name',
            'coin_source_url',
        );
    }
}

if (!function_exists('caes_get_audit_acf_field_keys')) {
    function caes_get_audit_acf_field_keys() {
        return array(
            'coin_code',
            'coin_theme',
            'coin_country_code',
            'released_date',
            'coin_mintage',
            'coin_material',
            'coin_quality',
            'coin_weight_g',
            'coin_diameter_mm',
            'coin_thickness_mm',
            'coin_edge_inscription',
        );
    }
}

if (!function_exists('caes_format_released_date_for_storage')) {
    function caes_format_released_date_for_storage($value) {
        return caes_normalize_release_date_for_coin_code($value);
    }
}

if (!function_exists('caes_format_released_date_for_api')) {
    function caes_format_released_date_for_api($value) {
        if (empty($value)) {
            return '';
        }

        $value = (string) $value;

        if (preg_match('/^\d{8}$/', $value)) {
            return substr($value, 0, 4) . '-' . substr($value, 4, 2) . '-' . substr($value, 6, 2);
        }

        return $value;
    }
}

if (!function_exists('caes_sanitize_acf_field_value')) {
    function caes_sanitize_acf_field_value($key, $value) {
        if ($value === null) {
            return null;
        }

        switch ($key) {
            case 'released_date':
                return caes_format_released_date_for_storage($value);

            case 'coin_mintage':
                return sanitize_text_field((string) $value);

            case 'coin_weight_g':
            case 'coin_diameter_mm':
            case 'coin_thickness_mm':
                return $value === '' ? '' : floatval($value);

            case 'coin_quality':
                $quality = sanitize_text_field((string) $value);
                $allowed = array('UNC', 'BU', 'Proof', 'Circulated');

                if ($quality === '') {
                    return '';
                }

                return in_array($quality, $allowed, true) ? $quality : null;

            case 'coin_obverse_description':
            case 'coin_reverse_description':
            case 'coin_collector_notes':
                return sanitize_textarea_field((string) $value);

            case 'coin_historical_background':
                return wp_kses_post((string) $value);

            case 'coin_designer':
            case 'coin_source_name':
                return sanitize_text_field((string) $value);

            case 'coin_issue_status':
                $status = sanitize_key((string) $value);

                if ($status === '') {
                    return '';
                }

                return in_array($status, caes_get_allowed_coin_issue_statuses(), true) ? $status : null;

            case 'coin_source_url':
                return esc_url_raw((string) $value);

            default:
                return sanitize_text_field((string) $value);
        }
    }
}

if (!function_exists('caes_validate_optional_acf_fields_from_request')) {
    function caes_validate_optional_acf_fields_from_request(WP_REST_Request $request) {
        $params = caes_get_request_merged_params($request);

        if (!array_key_exists('coin_issue_status', $params)) {
            return true;
        }

        $raw_status = trim((string) $params['coin_issue_status']);

        if ($raw_status === '') {
            return true;
        }

        if (caes_sanitize_acf_field_value('coin_issue_status', $raw_status) === null) {
            return new WP_Error(
                'rest_invalid_field',
                'Invalid coin_issue_status. Allowed values: scheduled, released, withdrawn, cancelled.',
                array(
                    'status' => 400,
                    'field'  => 'coin_issue_status',
                )
            );
        }

        return true;
    }
}

if (!function_exists('caes_get_supported_acf_fields_from_request')) {
    function caes_get_supported_acf_fields_from_request(WP_REST_Request $request, $only_if_present = false, $allow_empty = false) {
        $params = caes_get_request_merged_params($request);
        $fields = array();

        foreach (caes_get_optional_acf_field_keys() as $key) {
            if (!array_key_exists($key, $params)) {
                continue;
            }

            $raw_value = $params[$key];

            if ($raw_value === '' || $raw_value === null) {
                if ($allow_empty) {
                    $fields[$key] = caes_sanitize_acf_field_value($key, '');
                }

                continue;
            }

            $sanitized = caes_sanitize_acf_field_value($key, $raw_value);

            if ($sanitized === null) {
                continue;
            }

            $fields[$key] = $sanitized;
        }

        return $fields;
    }
}

if (!function_exists('caes_save_coin_acf_fields')) {
    function caes_save_coin_acf_fields($post_id, $fields) {
        $audit_keys    = caes_get_audit_acf_field_keys();
        $optional_keys = caes_get_optional_acf_field_keys();

        foreach ($fields as $key => $value) {
            $is_empty = $value === '' || $value === null;

            if (in_array($key, $audit_keys, true)) {
                update_post_meta($post_id, '_caes_' . $key, $is_empty ? '' : $value);
            }

            if (function_exists('update_field')) {
                if ($is_empty && in_array($key, $optional_keys, true)) {
                    update_field($key, '', $post_id);
                } else {
                    update_field($key, $value, $post_id);
                }
            } else {
                update_post_meta($post_id, $key, $is_empty ? '' : $value);
            }
        }
    }
}

if (!function_exists('caes_read_coin_acf_value')) {
    function caes_read_coin_acf_value($post_id, $key) {
        if (function_exists('get_field')) {
            $value = get_field($key, $post_id);
        } else {
            $value = get_post_meta($post_id, $key, true);

            if ($value === '' || $value === null) {
                $value = get_post_meta($post_id, '_caes_' . $key, true);
            }
        }

        return $value;
    }
}

if (!function_exists('caes_get_coin_acf_detail')) {
    function caes_get_coin_acf_detail($post_id) {
        $year              = caes_read_coin_acf_value($post_id, 'coin_year');
        $short_description = caes_read_coin_acf_value($post_id, 'coin_short_description');
        $released_date     = caes_read_coin_acf_value($post_id, 'released_date');
        $weight            = caes_read_coin_acf_value($post_id, 'coin_weight_g');
        $diameter          = caes_read_coin_acf_value($post_id, 'coin_diameter_mm');
        $thickness         = caes_read_coin_acf_value($post_id, 'coin_thickness_mm');

        $coin_code = (string) caes_read_coin_acf_value($post_id, 'coin_code');

        return array(
            'coin_code'                   => $coin_code,
            'unique_code'                 => $coin_code,
            'coin_theme'                  => (string) caes_read_coin_acf_value($post_id, 'coin_theme'),
            'coin_country_code'           => (string) caes_read_coin_acf_value($post_id, 'coin_country_code'),
            'coin_year'                   => absint($year),
            'coin_short_description'      => (string) $short_description,
            'released_date'               => caes_format_released_date_for_api($released_date),
            'coin_mintage'                => (string) caes_read_coin_acf_value($post_id, 'coin_mintage'),
            'coin_material'               => (string) caes_read_coin_acf_value($post_id, 'coin_material'),
            'coin_quality'                => (string) caes_read_coin_acf_value($post_id, 'coin_quality'),
            'coin_weight_g'               => $weight === '' || $weight === null ? null : floatval($weight),
            'coin_diameter_mm'            => $diameter === '' || $diameter === null ? null : floatval($diameter),
            'coin_thickness_mm'           => $thickness === '' || $thickness === null ? null : floatval($thickness),
            'coin_edge_inscription'       => (string) caes_read_coin_acf_value($post_id, 'coin_edge_inscription'),
            'coin_obverse_description'    => (string) caes_read_coin_acf_value($post_id, 'coin_obverse_description'),
            'coin_reverse_description'    => (string) caes_read_coin_acf_value($post_id, 'coin_reverse_description'),
            'coin_historical_background'  => (string) caes_read_coin_acf_value($post_id, 'coin_historical_background'),
            'coin_collector_notes'        => (string) caes_read_coin_acf_value($post_id, 'coin_collector_notes'),
            'coin_designer'               => (string) caes_read_coin_acf_value($post_id, 'coin_designer'),
            'coin_issue_status'           => (string) caes_read_coin_acf_value($post_id, 'coin_issue_status'),
            'coin_source_name'            => (string) caes_read_coin_acf_value($post_id, 'coin_source_name'),
            'coin_source_url'             => (string) caes_read_coin_acf_value($post_id, 'coin_source_url'),
            'coin_is_published_catalogue' => (int) caes_read_coin_acf_value($post_id, 'coin_is_published_catalogue'),
            'coin_is_featured'            => (int) caes_read_coin_acf_value($post_id, 'coin_is_featured'),
            'coin_is_app_enabled'         => (int) caes_read_coin_acf_value($post_id, 'coin_is_app_enabled'),
            'coin_record_status'          => (string) caes_read_coin_acf_value($post_id, 'coin_record_status'),
            'has_mint_variants'           => (int) caes_read_coin_acf_value($post_id, 'coin_has_mint_variants'),
            'single_mint_mark'            => (string) caes_read_coin_acf_value($post_id, 'coin_mint_mark'),
            'mint_marks_available'        => (string) caes_read_coin_acf_value($post_id, 'coin_mint_marks_available'),
            'mint_variants'               => caes_format_mint_variants_for_api(caes_read_coin_acf_value($post_id, 'coin_mint_variants')),
        );
    }
}
