<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_validate_image_upload_file')) {
    function caes_validate_image_upload_file($file, $file_key) {
        if (!is_array($file) || empty($file['name'])) {
            return new WP_Error(
                'rest_upload_error',
                sprintf('Invalid upload for %s.', $file_key),
                array('status' => 400)
            );
        }

        if ($file['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            return new WP_Error(
                'rest_upload_error',
                sprintf('Upload error for %s.', $file_key),
                array('status' => 400)
            );
        }

        $max_size = 5 * 1024 * 1024;

        if ($file['size'] > $max_size) {
            return new WP_Error(
                'rest_file_too_large',
                sprintf('%s exceeds 5MB limit.', $file_key),
                array('status' => 400)
            );
        }

        $allowed_types = array('jpg', 'jpeg', 'png', 'webp');
        $filetype      = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);

        if (empty($filetype['ext']) || !in_array(strtolower($filetype['ext']), $allowed_types, true)) {
            return new WP_Error(
                'rest_invalid_file_type',
                sprintf('%s must be jpg, jpeg, png, or webp.', $file_key),
                array('status' => 400)
            );
        }

        return true;
    }
}

if (!function_exists('caes_get_gallery_upload_files')) {
    function caes_get_gallery_upload_files($file_key) {
        if (empty($_FILES[$file_key])) {
            return array();
        }

        $files = $_FILES[$file_key];

        if (!is_array($files['name'])) {
            if ($files['error'] === UPLOAD_ERR_NO_FILE) {
                return array();
            }

            return array($files);
        }

        $file_list = array();

        foreach ($files['name'] as $index => $name) {
            if ($files['error'][$index] === UPLOAD_ERR_NO_FILE) {
                continue;
            }

            $file_list[] = array(
                'name'     => $files['name'][$index],
                'type'     => $files['type'][$index],
                'tmp_name' => $files['tmp_name'][$index],
                'error'    => $files['error'][$index],
                'size'     => $files['size'][$index],
            );
        }

        return $file_list;
    }
}

if (!function_exists('caes_get_coin_year_max')) {
    function caes_get_coin_year_max() {
        return (int) gmdate('Y') + 1;
    }
}

if (!function_exists('caes_is_valid_coin_year')) {
    function caes_is_valid_coin_year($year) {
        $year = absint($year);

        return $year >= 500 && $year <= caes_get_coin_year_max();
    }
}

if (!function_exists('caes_validate_coin_year')) {
    function caes_validate_coin_year($year) {
        $year = absint($year);

        if ($year <= 0) {
            return new WP_Error(
                'rest_invalid_year',
                'Year is required.',
                array('status' => 400)
            );
        }

        if (!caes_is_valid_coin_year($year)) {
            return new WP_Error(
                'rest_invalid_year',
                sprintf('Year must be an integer between 500 and %d.', caes_get_coin_year_max()),
                array('status' => 400)
            );
        }

        return $year;
    }
}

if (!function_exists('caes_submission_image_file_present')) {
    function caes_submission_image_file_present($file_key) {
        if (empty($_FILES[$file_key]) || $_FILES[$file_key]['error'] === UPLOAD_ERR_NO_FILE) {
            return false;
        }

        return true;
    }
}

if (!function_exists('caes_validate_required_submission_image_upload')) {
    function caes_validate_required_submission_image_upload($file_key, $label) {
        if (!caes_submission_image_file_present($file_key)) {
            return new WP_Error(
                'rest_missing_image',
                sprintf('%s image is required.', $label),
                array('status' => 400)
            );
        }

        return caes_validate_image_upload_file($_FILES[$file_key], $file_key);
    }
}

if (!function_exists('caes_normalize_attachment_id')) {
    function caes_normalize_attachment_id($value) {
        if ($value === null || $value === false || $value === '') {
            return 0;
        }

        if (is_int($value) || (is_string($value) && is_numeric($value))) {
            return absint($value);
        }

        if ($value instanceof WP_Post) {
            return absint($value->ID);
        }

        if (is_object($value)) {
            if (isset($value->ID) && is_numeric($value->ID)) {
                return absint($value->ID);
            }

            if (isset($value->id) && is_numeric($value->id)) {
                return absint($value->id);
            }

            return 0;
        }

        if (is_array($value)) {
            foreach (array('ID', 'id', 'attachment_id') as $key) {
                if (isset($value[$key]) && is_numeric($value[$key])) {
                    return absint($value[$key]);
                }
            }

            return 0;
        }

        if (is_string($value)) {
            $value = trim($value);

            if ($value === '' || preg_match('/^https?:\/\//i', $value)) {
                return 0;
            }

            if (ctype_digit($value)) {
                return absint($value);
            }

            return 0;
        }

        return 0;
    }
}

if (!function_exists('caes_is_valid_image_attachment_id')) {
    function caes_is_valid_image_attachment_id($attachment_id) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0) {
            return false;
        }

        $attachment = get_post($attachment_id);

        if (empty($attachment) || $attachment->post_type !== 'attachment') {
            return false;
        }

        return (bool) wp_attachment_is_image($attachment_id);
    }
}

if (!function_exists('caes_clear_coin_obverse_image_meta')) {
    function caes_clear_coin_obverse_image_meta($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return;
        }

        delete_post_meta($post_id, '_caes_obverse_image_id');
        delete_post_meta($post_id, 'coin_image_obverse_id');
        delete_post_meta($post_id, '_coin_image_obverse_id');

        if (function_exists('update_field') && function_exists('caes_get_coin_obverse_field_key')) {
            update_field(caes_get_coin_obverse_field_key(), '', $post_id);
        }
    }
}

if (!function_exists('caes_clear_coin_reverse_image_meta')) {
    function caes_clear_coin_reverse_image_meta($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return;
        }

        delete_post_meta($post_id, '_caes_reverse_image_id');
        delete_post_meta($post_id, 'coin_image_reverse_id');
        delete_post_meta($post_id, '_coin_image_reverse_id');

        if (function_exists('update_field') && function_exists('caes_get_coin_reverse_field_key')) {
            update_field(caes_get_coin_reverse_field_key(), '', $post_id);
        }
    }
}

if (!function_exists('caes_validate_coin_obverse_reverse_ids')) {
    function caes_validate_coin_obverse_reverse_ids($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return new WP_Error(
                'rest_invalid_submission',
                'Invalid coin submission.',
                array('status' => 400)
            );
        }

        $checks = array(
            'obverse' => array(
                'getter'       => 'caes_get_coin_obverse_attachment_id',
                'clear'        => 'caes_clear_coin_obverse_image_meta',
                'default_id'   => function_exists('caes_get_default_obverse_image_id') ? caes_get_default_obverse_image_id() : 0,
                'save'         => 'caes_save_coin_obverse_image_id',
            ),
            'reverse' => array(
                'getter'       => 'caes_get_coin_reverse_attachment_id',
                'clear'        => 'caes_clear_coin_reverse_image_meta',
                'default_id'   => function_exists('caes_get_default_reverse_image_id') ? caes_get_default_reverse_image_id() : 0,
                'save'         => 'caes_save_coin_reverse_image_id',
            ),
        );

        foreach ($checks as $label => $config) {
            $attachment_id = call_user_func($config['getter'], $post_id);

            if ($attachment_id <= 0) {
                continue;
            }

            if (caes_is_valid_image_attachment_id($attachment_id)) {
                continue;
            }

            call_user_func($config['clear'], $post_id);

            $default_id = absint($config['default_id']);

            if (
                $default_id > 0
                && caes_is_valid_image_attachment_id($default_id)
                && function_exists($config['save'])
                && call_user_func($config['save'], $post_id, $default_id)
            ) {
                continue;
            }

            return new WP_Error(
                'rest_invalid_image',
                sprintf('%s image attachment is invalid.', ucfirst($label)),
                array('status' => 400)
            );
        }

        return array(
            'obverse_id' => caes_get_coin_obverse_attachment_id($post_id),
            'reverse_id' => caes_get_coin_reverse_attachment_id($post_id),
        );
    }
}

if (!function_exists('caes_apply_default_coin_image_if_missing')) {
    function caes_apply_default_coin_image_if_missing($post_id, $side) {
        $post_id = absint($post_id);
        $side    = sanitize_key((string) $side);

        if ($post_id <= 0) {
            return false;
        }

        $config = array(
            'obverse' => array(
                'getter'     => 'caes_get_coin_obverse_attachment_id',
                'clear'      => 'caes_clear_coin_obverse_image_meta',
                'default_id' => function_exists('caes_get_default_obverse_image_id') ? caes_get_default_obverse_image_id() : 0,
                'save'       => 'caes_save_coin_obverse_image_id',
            ),
            'reverse' => array(
                'getter'     => 'caes_get_coin_reverse_attachment_id',
                'clear'      => 'caes_clear_coin_reverse_image_meta',
                'default_id' => function_exists('caes_get_default_reverse_image_id') ? caes_get_default_reverse_image_id() : 0,
                'save'       => 'caes_save_coin_reverse_image_id',
            ),
        );

        if (!isset($config[$side])) {
            return false;
        }

        $side_config   = $config[$side];
        $attachment_id = call_user_func($side_config['getter'], $post_id);

        if (caes_is_valid_image_attachment_id($attachment_id)) {
            return false;
        }

        call_user_func($side_config['clear'], $post_id);

        $default_id = absint($side_config['default_id']);

        if (
            $default_id <= 0
            || !caes_is_valid_image_attachment_id($default_id)
            || !function_exists($side_config['save'])
            || !call_user_func($side_config['save'], $post_id, $default_id)
        ) {
            return false;
        }

        return true;
    }
}

if (!function_exists('caes_apply_default_coin_images_if_missing')) {
    function caes_apply_default_coin_images_if_missing($post_id) {
        $post_id = absint($post_id);

        return array(
            'obverse' => caes_apply_default_coin_image_if_missing($post_id, 'obverse'),
            'reverse' => caes_apply_default_coin_image_if_missing($post_id, 'reverse'),
        );
    }
}

if (!function_exists('caes_try_delete_coin_attachment')) {
    function caes_try_delete_coin_attachment($attachment_id, $force_delete = true) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0) {
            return false;
        }

        if (function_exists('caes_is_protected_default_image_attachment') && caes_is_protected_default_image_attachment($attachment_id)) {
            return false;
        }

        return (bool) wp_delete_attachment($attachment_id, $force_delete);
    }
}

if (!function_exists('caes_rollback_failed_coin_submission')) {
    function caes_rollback_failed_coin_submission($post_id, $attachment_ids = array()) {
        $post_id = absint($post_id);

        foreach (caes_normalize_gallery_ids($attachment_ids) as $attachment_id) {
            $attachment = get_post($attachment_id);

            if (!empty($attachment) && $attachment->post_type === 'attachment') {
                caes_try_delete_coin_attachment($attachment_id, true);
            }
        }

        if ($post_id > 0) {
            $post = get_post($post_id);

            if (!empty($post) && $post->post_type === 'coin') {
                wp_delete_post($post_id, true);
            }
        }
    }
}

if (!function_exists('caes_submission_create_fail')) {
    function caes_submission_create_fail($post_id, $attachment_ids, $error) {
        caes_rollback_failed_coin_submission($post_id, $attachment_ids);

        return $error;
    }
}

if (!function_exists('caes_handle_image_upload')) {
    function caes_handle_image_upload($file_key, $post_id) {
        if (empty($_FILES[$file_key]) || $_FILES[$file_key]['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        $file = $_FILES[$file_key];
        $valid = caes_validate_image_upload_file($file, $file_key);

        if (is_wp_error($valid)) {
            return $valid;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $attachment_id = media_handle_upload($file_key, $post_id);

        if (is_wp_error($attachment_id)) {
            return new WP_Error(
                'rest_upload_failed',
                sprintf('Failed to upload %s: %s', $file_key, $attachment_id->get_error_message()),
                array('status' => 400)
            );
        }

        return $attachment_id;
    }
}

if (!function_exists('caes_handle_gallery_uploads')) {
    function caes_handle_gallery_uploads($file_key, $post_id) {
        $file_list = caes_get_gallery_upload_files($file_key);

        if (empty($file_list)) {
            return array();
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $attachment_ids = array();

        foreach ($file_list as $index => $file) {
            $valid = caes_validate_image_upload_file($file, $file_key . '[' . $index . ']');

            if (is_wp_error($valid)) {
                return $valid;
            }

            $tmp_key             = 'caes_gallery_upload_' . $index;
            $_FILES[$tmp_key]    = $file;
            $attachment_id       = media_handle_upload($tmp_key, $post_id);
            unset($_FILES[$tmp_key]);

            if (is_wp_error($attachment_id)) {
                return new WP_Error(
                    'rest_upload_failed',
                    sprintf('Failed to upload %s: %s', $file_key, $attachment_id->get_error_message()),
                    array('status' => 400)
                );
            }

            $attachment_ids[] = (int) $attachment_id;
        }

        return $attachment_ids;
    }
}

if (!function_exists('caes_handle_optional_image_replacement')) {
    function caes_handle_optional_image_replacement($primary_key, $fallback_key, $post_id) {
        $keys = array_filter(array($primary_key, $fallback_key));

        foreach ($keys as $key) {
            $result = caes_handle_image_upload($key, $post_id);

            if (is_wp_error($result)) {
                return $result;
            }

            if ($result !== null) {
                return $result;
            }
        }

        return null;
    }
}

if (!function_exists('caes_get_coin_obverse_attachment_id')) {
    function caes_get_coin_obverse_attachment_id($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return 0;
        }

        $obverse_id = caes_normalize_attachment_id(get_post_meta($post_id, '_caes_obverse_image_id', true));

        if ($obverse_id > 0) {
            return $obverse_id;
        }

        if (function_exists('get_field')) {
            $obverse_id = caes_normalize_attachment_id(get_field('coin_image_obverse_id', $post_id));

            if ($obverse_id > 0) {
                return $obverse_id;
            }
        }

        $obverse_id = caes_normalize_attachment_id(get_post_meta($post_id, 'coin_image_obverse_id', true));

        return $obverse_id > 0 ? $obverse_id : 0;
    }
}

if (!function_exists('caes_get_coin_reverse_attachment_id')) {
    function caes_get_coin_reverse_attachment_id($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return 0;
        }

        $reverse_id = caes_normalize_attachment_id(get_post_meta($post_id, '_caes_reverse_image_id', true));

        if ($reverse_id > 0) {
            return $reverse_id;
        }

        if (function_exists('get_field')) {
            $reverse_id = caes_normalize_attachment_id(get_field('coin_image_reverse_id', $post_id));

            if ($reverse_id > 0) {
                return $reverse_id;
            }
        }

        $reverse_id = caes_normalize_attachment_id(get_post_meta($post_id, 'coin_image_reverse_id', true));

        return $reverse_id > 0 ? $reverse_id : 0;
    }
}

if (!function_exists('caes_sync_featured_image_from_obverse')) {
    function caes_sync_featured_image_from_obverse($post_id, $force = false) {
        $post_id    = absint($post_id);
        $obverse_id = caes_get_coin_obverse_attachment_id($post_id);

        if ($post_id <= 0 || $obverse_id <= 0) {
            return;
        }

        $attachment = get_post($obverse_id);

        if (empty($attachment) || $attachment->post_type !== 'attachment') {
            return;
        }

        if (!$force) {
            $current_thumbnail = absint(get_post_thumbnail_id($post_id));

            if ($current_thumbnail > 0) {
                return;
            }
        }

        set_post_thumbnail($post_id, $obverse_id);
    }
}

if (!function_exists('caes_is_wp_administrator')) {
    function caes_is_wp_administrator() {
        return current_user_can('administrator') || current_user_can('manage_options');
    }
}

if (!function_exists('caes_is_gallery_administrator')) {
    function caes_is_gallery_administrator($contributor) {
        if (caes_is_wp_administrator()) {
            return true;
        }

        if (!empty($contributor) && caes_is_admin($contributor)) {
            return true;
        }

        if (empty($contributor)) {
            return true;
        }

        return false;
    }
}

if (!function_exists('caes_get_gallery_actor_user_id')) {
    function caes_get_gallery_actor_user_id($contributor) {
        if (is_user_logged_in()) {
            return (int) get_current_user_id();
        }

        if (!empty($contributor) && !empty($contributor->email)) {
            $user = get_user_by('email', $contributor->email);

            if (!empty($user)) {
                return (int) $user->ID;
            }
        }

        return 0;
    }
}

if (!function_exists('caes_stamp_attachment_contributor')) {
    function caes_stamp_attachment_contributor($attachment_id, $contributor) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0 || empty($contributor) || empty($contributor->id)) {
            return;
        }

        update_post_meta($attachment_id, '_caes_contributor_id', (int) $contributor->id);

        $actor_user_id = caes_get_gallery_actor_user_id($contributor);

        if ($actor_user_id > 0) {
            wp_update_post(array(
                'ID'          => $attachment_id,
                'post_author' => $actor_user_id,
            ));
        }
    }
}

if (!function_exists('caes_stamp_attachment_contributors')) {
    function caes_stamp_attachment_contributors($attachment_ids, $contributor) {
        foreach (caes_normalize_gallery_ids($attachment_ids) as $attachment_id) {
            caes_stamp_attachment_contributor($attachment_id, $contributor);
        }
    }
}

if (!function_exists('caes_attachment_belongs_to_coin')) {
    function caes_attachment_belongs_to_coin($attachment_id, $post_id) {
        $attachment_id = absint($attachment_id);
        $post_id       = absint($post_id);

        if ($attachment_id <= 0 || $post_id <= 0) {
            return false;
        }

        $attachment = get_post($attachment_id);

        if (empty($attachment) || $attachment->post_type !== 'attachment') {
            return false;
        }

        return (int) $attachment->post_parent === $post_id;
    }
}

if (!function_exists('caes_attachment_authored_by_actor')) {
    function caes_attachment_authored_by_actor($attachment_id, $actor_user_id) {
        $attachment_id = absint($attachment_id);
        $actor_user_id = absint($actor_user_id);

        if ($attachment_id <= 0 || $actor_user_id <= 0) {
            return false;
        }

        $attachment = get_post($attachment_id);

        if (empty($attachment) || $attachment->post_type !== 'attachment') {
            return false;
        }

        return (int) $attachment->post_author === $actor_user_id;
    }
}

if (!function_exists('caes_attachment_in_coin_gallery')) {
    function caes_attachment_in_coin_gallery($attachment_id, $gallery_ids) {
        return in_array(absint($attachment_id), caes_normalize_gallery_ids($gallery_ids), true);
    }
}

if (!function_exists('caes_can_permanently_delete_gallery_attachment')) {
    function caes_can_permanently_delete_gallery_attachment($attachment_id, $post_id, $contributor, $gallery_ids) {
        $attachment_id = absint($attachment_id);
        $post_id       = absint($post_id);
        $gallery_ids   = caes_normalize_gallery_ids($gallery_ids);

        if ($attachment_id <= 0 || $post_id <= 0) {
            return false;
        }

        if (function_exists('caes_is_protected_default_image_attachment') && caes_is_protected_default_image_attachment($attachment_id)) {
            return false;
        }

        if (!caes_attachment_in_coin_gallery($attachment_id, $gallery_ids)) {
            return false;
        }

        if (caes_is_gallery_administrator($contributor)) {
            return true;
        }

        $actor_user_id = caes_get_gallery_actor_user_id($contributor);

        if (caes_attachment_authored_by_actor($attachment_id, $actor_user_id)) {
            return true;
        }

        if (caes_attachment_belongs_to_coin($attachment_id, $post_id)) {
            return true;
        }

        return false;
    }
}

if (!function_exists('caes_can_manage_coin_gallery_attachment')) {
    function caes_can_manage_coin_gallery_attachment($attachment_id, $post_id, $contributor, $gallery_ids = null) {
        $attachment_id = absint($attachment_id);
        $post_id       = absint($post_id);

        if ($attachment_id <= 0 || $post_id <= 0) {
            return false;
        }

        if ($gallery_ids === null) {
            $gallery_ids = caes_get_coin_gallery_ids($post_id);
        }

        return caes_can_permanently_delete_gallery_attachment($attachment_id, $post_id, $contributor, $gallery_ids);
    }
}

if (!function_exists('caes_delete_coin_gallery_attachments')) {
    function caes_delete_coin_gallery_attachments($post_id, $attachment_ids, $contributor, $allowed_gallery_ids) {
        $deleted  = array();
        $skipped  = array();
        $warnings = array();

        foreach (caes_normalize_gallery_ids($attachment_ids) as $attachment_id) {
            if (!caes_attachment_in_coin_gallery($attachment_id, $allowed_gallery_ids)) {
                $skipped[]  = $attachment_id;
                $warnings[] = sprintf(
                    'Attachment %d was skipped: not in this coin gallery.',
                    $attachment_id
                );
                continue;
            }

            if (function_exists('caes_is_protected_default_image_attachment') && caes_is_protected_default_image_attachment($attachment_id)) {
                $skipped[]  = $attachment_id;
                $warnings[] = sprintf(
                    'Attachment %d was skipped: protected default placeholder image.',
                    $attachment_id
                );
                continue;
            }

            if (!caes_can_permanently_delete_gallery_attachment($attachment_id, $post_id, $contributor, $allowed_gallery_ids)) {
                $skipped[]  = $attachment_id;
                $warnings[] = sprintf(
                    'Attachment %d was skipped: permission denied.',
                    $attachment_id
                );
                continue;
            }

            $deleted_result = caes_try_delete_coin_attachment($attachment_id, true);

            if (empty($deleted_result)) {
                $skipped[]  = $attachment_id;
                $warnings[] = sprintf(
                    'Attachment %d was skipped: delete failed.',
                    $attachment_id
                );
                continue;
            }

            $deleted[] = $attachment_id;
        }

        return array(
            'deleted'  => $deleted,
            'skipped'  => $skipped,
            'warnings' => $warnings,
        );
    }
}

if (!function_exists('caes_coin_references_attachment')) {
    function caes_coin_references_attachment($post_id, $attachment_id) {
        $post_id       = absint($post_id);
        $attachment_id = absint($attachment_id);

        if ($post_id <= 0 || $attachment_id <= 0) {
            return false;
        }

        if (caes_get_coin_obverse_attachment_id($post_id) === $attachment_id) {
            return true;
        }

        if (caes_get_coin_reverse_attachment_id($post_id) === $attachment_id) {
            return true;
        }

        if (in_array($attachment_id, caes_get_coin_gallery_ids($post_id), true)) {
            return true;
        }

        return absint(get_post_thumbnail_id($post_id)) === $attachment_id;
    }
}

if (!function_exists('caes_attachment_is_featured_anywhere')) {
    function caes_attachment_is_featured_anywhere($attachment_id) {
        $attachment_id = absint($attachment_id);

        if ($attachment_id <= 0) {
            return false;
        }

        $featured_on = get_posts(array(
            'post_type'      => 'any',
            'post_status'    => 'any',
            'posts_per_page' => 1,
            'meta_query'     => array(
                array(
                    'key'   => '_thumbnail_id',
                    'value' => $attachment_id,
                ),
            ),
            'fields'         => 'ids',
        ));

        return !empty($featured_on);
    }
}

if (!function_exists('caes_attachment_parent_is_other_existing_post')) {
    function caes_attachment_parent_is_other_existing_post($attachment_id, $current_post_id) {
        $attachment_id   = absint($attachment_id);
        $current_post_id = absint($current_post_id);
        $attachment      = get_post($attachment_id);

        if (empty($attachment)) {
            return false;
        }

        $parent_id = absint($attachment->post_parent);

        if ($parent_id <= 0 || $parent_id === $current_post_id) {
            return false;
        }

        return (bool) get_post($parent_id);
    }
}

if (!function_exists('caes_is_replaced_attachment_safe_to_delete')) {
    function caes_is_replaced_attachment_safe_to_delete($attachment_id, $post_id) {
        $attachment_id = absint($attachment_id);
        $post_id       = absint($post_id);

        if ($attachment_id <= 0 || $post_id <= 0) {
            return false;
        }

        if (function_exists('caes_is_protected_default_image_attachment') && caes_is_protected_default_image_attachment($attachment_id)) {
            return false;
        }

        $attachment = get_post($attachment_id);

        if (empty($attachment) || $attachment->post_type !== 'attachment') {
            return false;
        }

        if (caes_coin_references_attachment($post_id, $attachment_id)) {
            return false;
        }

        if (caes_attachment_is_featured_anywhere($attachment_id)) {
            return false;
        }

        if (caes_attachment_parent_is_other_existing_post($attachment_id, $post_id)) {
            return false;
        }

        return true;
    }
}

if (!function_exists('caes_delete_replaced_attachment_if_safe')) {
    function caes_delete_replaced_attachment_if_safe($attachment_id, $post_id) {
        if (!caes_is_replaced_attachment_safe_to_delete($attachment_id, $post_id)) {
            return false;
        }

        return caes_try_delete_coin_attachment($attachment_id, true);
    }
}
