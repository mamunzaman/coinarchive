<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_validate_import_coin_year')) {
    function caes_validate_import_coin_year($year) {
        $year = absint($year);

        if ($year <= 0) {
            return new WP_Error('caes_import_invalid_year', 'Year is required.');
        }

        if ($year < 1000 || $year > caes_get_coin_year_max()) {
            return new WP_Error(
                'caes_import_invalid_year',
                sprintf('Year must be an integer between 1000 and %d.', caes_get_coin_year_max())
            );
        }

        return $year;
    }
}

if (!function_exists('caes_import_get_max_image_bytes')) {
    function caes_import_get_max_image_bytes() {
        return 5 * 1024 * 1024;
    }
}

if (!function_exists('caes_import_url_points_to_private_network')) {
    function caes_import_url_points_to_private_network($url) {
        $host = wp_parse_url($url, PHP_URL_HOST);

        if (empty($host)) {
            return true;
        }

        $host = strtolower($host);

        if (in_array($host, array('localhost', 'localhost.localdomain'), true)) {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return !filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
        }

        $resolved_ips = gethostbynamel($host);

        if (empty($resolved_ips)) {
            return true;
        }

        foreach ($resolved_ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('caes_validate_import_image_url')) {
    function caes_validate_import_image_url($url, $label, $required = true) {
        $url = esc_url_raw(trim((string) $url));

        if ($url === '') {
            if (!$required) {
                return '';
            }

            return new WP_Error('caes_import_missing_image_url', sprintf('Missing %s.', $label));
        }

        if (!wp_http_validate_url($url)) {
            return new WP_Error('caes_import_invalid_image_url', sprintf('Invalid %s URL.', $label));
        }

        $scheme = wp_parse_url($url, PHP_URL_SCHEME);

        if (!in_array($scheme, array('http', 'https'), true)) {
            return new WP_Error('caes_import_invalid_image_url', sprintf('%s URL must use http or https.', $label));
        }

        if (caes_import_url_points_to_private_network($url)) {
            return new WP_Error(
                'caes_import_invalid_image_url',
                sprintf('%s URL must not point to localhost or a private network address.', $label)
            );
        }

        return $url;
    }
}

if (!function_exists('caes_parse_import_gallery_image_urls')) {
    function caes_parse_import_gallery_image_urls($value) {
        if (is_array($value)) {
            $parts = $value;
        } else {
            $parts = preg_split('/\s*,\s*/', (string) $value);
        }

        $urls = array();

        foreach ($parts as $part) {
            $part = trim((string) $part);

            if ($part !== '') {
                $urls[] = $part;
            }
        }

        return $urls;
    }
}

if (!function_exists('caes_import_coin_code_exists')) {
    function caes_import_coin_code_exists($coin_code, $exclude_post_id = 0) {
        if (!function_exists('caes_coin_code_exists_on_other_post')) {
            return false;
        }

        return caes_coin_code_exists_on_other_post($coin_code, $exclude_post_id) !== false;
    }
}

if (!function_exists('caes_import_unique_code_exists')) {
    function caes_import_unique_code_exists($unique_code, $exclude_post_id = 0) {
        if (!function_exists('caes_unique_code_exists_on_other_post')) {
            return false;
        }

        return caes_unique_code_exists_on_other_post($unique_code, $exclude_post_id) !== false;
    }
}

if (!function_exists('caes_generate_import_batch_id')) {
    function caes_generate_import_batch_id() {
        return 'import_' . gmdate('YmdHis') . '_' . strtolower(wp_generate_password(6, false, false));
    }
}

if (!function_exists('caes_get_import_post_status_for_mode')) {
    function caes_get_import_post_status_for_mode($mode) {
        $mode = sanitize_key((string) $mode);

        if ($mode === 'draft') {
            return 'pending';
        }

        return '';
    }
}

if (!function_exists('caes_get_import_optional_textarea_field_keys')) {
    function caes_get_import_optional_textarea_field_keys() {
        return array(
            'coin_obverse_description',
            'coin_reverse_description',
            'coin_collector_notes',
        );
    }
}

if (!function_exists('caes_get_import_optional_bool_field_keys')) {
    function caes_get_import_optional_bool_field_keys() {
        return array(
            'coin_is_published_catalogue',
            'coin_is_featured',
            'coin_is_app_enabled',
        );
    }
}

if (!function_exists('caes_validate_import_bool_field_value')) {
    function caes_validate_import_bool_field_value($value) {
        $value = strtolower(trim((string) $value));

        return in_array($value, array('0', '1', 'true', 'false', 'yes', 'no', 'on', 'off'), true);
    }
}

if (!function_exists('caes_validate_import_optional_acf_row_fields')) {
    function caes_validate_import_optional_acf_row_fields($row) {
        $errors = array();

        if (!is_array($row)) {
            return $errors;
        }

        $released_date = trim((string) ($row['released_date'] ?? ''));

        if ($released_date !== '') {
            $stored = function_exists('caes_format_released_date_for_storage')
                ? caes_format_released_date_for_storage($released_date)
                : '';

            if ($stored === '') {
                $errors[] = 'Invalid released_date format. Use YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, or DD/MM/YYYY.';
            }
        }

        $quality = trim((string) ($row['coin_quality'] ?? ''));

        if ($quality !== '' && !in_array($quality, array('UNC', 'BU', 'Proof', 'Circulated'), true)) {
            $errors[] = 'Invalid coin_quality. Allowed values: UNC, BU, Proof, Circulated.';
        }

        foreach (caes_get_import_optional_textarea_field_keys() as $field_key) {
            $value = (string) ($row[$field_key] ?? '');

            if ($value !== '' && strlen($value) > 5000) {
                $errors[] = sprintf('%s exceeds the 5000 character limit.', $field_key);
            }
        }

        foreach (caes_get_import_optional_bool_field_keys() as $field_key) {
            if (!array_key_exists($field_key, $row)) {
                continue;
            }

            $raw = trim((string) $row[$field_key]);

            if ($raw === '') {
                continue;
            }

            if (!caes_validate_import_bool_field_value($raw)) {
                $errors[] = sprintf(
                    'Invalid %s. Allowed values: 1, 0, true, false, yes, no, on, off.',
                    $field_key
                );
            }
        }

        $record_status = trim((string) ($row['coin_record_status'] ?? ''));

        if ($record_status !== '' && !in_array($record_status, array('active', 'hidden', 'deprecated'), true)) {
            $errors[] = 'Invalid coin_record_status. Allowed values: active, hidden, deprecated.';
        }

        $issue_status = trim((string) ($row['coin_issue_status'] ?? ''));

        if ($issue_status !== '' && caes_sanitize_acf_field_value('coin_issue_status', $issue_status) === null) {
            $errors[] = 'Invalid coin_issue_status. Allowed values: scheduled, released, withdrawn, cancelled.';
        }

        return $errors;
    }
}

if (!function_exists('caes_validate_import_coin_row')) {
    function caes_validate_import_coin_row($row, $row_index, $batch_unique_codes = array()) {
        $errors = array();

        if (!is_array($row)) {
            return array(
                'valid'  => false,
                'errors' => array('Row data must be an object.'),
            );
        }

        $title        = sanitize_text_field((string) ($row['title'] ?? ''));
        $country      = sanitize_text_field((string) ($row['country'] ?? ''));
        $denomination = sanitize_text_field((string) ($row['denomination'] ?? ''));
        $coin_type    = sanitize_text_field((string) ($row['coin_type'] ?? ''));

        if ($title === '') {
            $errors[] = 'Missing title';
        }

        if ($country === '') {
            $errors[] = 'Missing country';
        }

        if ($denomination === '') {
            $errors[] = 'Missing denomination';
        }

        if ($coin_type === '') {
            $errors[] = 'Missing coin_type';
        }

        $year_result = caes_validate_import_coin_year($row['year'] ?? '');

        if (is_wp_error($year_result)) {
            $errors[] = $year_result->get_error_message();
        }

        $obverse_result = caes_validate_import_image_url($row['obverse_image_url'] ?? '', 'obverse_image_url', false);

        if (is_wp_error($obverse_result)) {
            $errors[] = $obverse_result->get_error_message();
        }

        $reverse_result = caes_validate_import_image_url($row['reverse_image_url'] ?? '', 'reverse_image_url', false);

        if (is_wp_error($reverse_result)) {
            $errors[] = $reverse_result->get_error_message();
        }

        $gallery_urls           = caes_parse_import_gallery_image_urls($row['gallery_image_urls'] ?? '');
        $validated_gallery_urls = array();

        foreach ($gallery_urls as $gallery_index => $gallery_url) {
            $gallery_result = caes_validate_import_image_url($gallery_url, 'gallery_image_urls');

            if (is_wp_error($gallery_result)) {
                $errors[] = sprintf('Invalid gallery_image_urls entry #%d.', $gallery_index + 1);
                continue;
            }

            $validated_gallery_urls[] = $gallery_result;
        }

        $released_date = trim((string) ($row['released_date'] ?? ''));
        $released_date_normalized = caes_normalize_release_date_for_coin_code($released_date);

        if ($released_date_normalized === '') {
            $errors[] = 'Missing or invalid released_date. Required for import.';
        }

        $coin_code = sanitize_text_field((string) ($row['coin_code'] ?? ''));
        $legacy_unique_code = sanitize_text_field((string) ($row['unique_code'] ?? ''));

        if ($coin_code === '' && $legacy_unique_code !== '') {
            $coin_code = $legacy_unique_code;
        }

        $duplicate = null;

        if ($legacy_unique_code !== '' || $coin_code !== '' || $title !== '') {
            if ($coin_code !== '' && !caes_is_final_unique_code_value($coin_code)) {
                $errors[] = 'coin_code must include a 3-digit suffix when provided (for example -001).';
            } else {
                $duplicate = caes_find_exact_duplicate(
                    array(
                        'unique_code' => $legacy_unique_code,
                        'coin_code'   => $coin_code,
                        'title'       => $title,
                    ),
                    0
                );

                if (!empty($duplicate['found'])) {
                    $errors[] = caes_format_exact_duplicate_block_message($duplicate, 'import');
                }
            }
        }

        if ($coin_code !== '' && in_array(strtolower($coin_code), $batch_unique_codes, true)) {
            $errors[] = 'This coin already exists (matching coin code).';
        }

        if ($legacy_unique_code !== '' && in_array(strtolower($legacy_unique_code), $batch_unique_codes, true)) {
            $errors[] = 'This coin already exists (matching unique code).';
        }

        $coin_series = null;

        if (array_key_exists('coin_series', $row)) {
            $coin_series = caes_normalize_coin_series_request_value($row['coin_series']);

            if (is_wp_error($coin_series)) {
                $errors[] = $coin_series->get_error_message();
                $coin_series = null;
            }
        }

        if (!empty($country) && !empty($denomination) && !empty($coin_type)) {
            $taxonomy_result = caes_validate_submission_taxonomies($country, $denomination, $coin_type, $coin_series);

            if (is_wp_error($taxonomy_result)) {
                $errors[] = $taxonomy_result->get_error_message();
            } elseif ($released_date_normalized !== '') {
                $country_code = caes_get_country_code_from_term_name($taxonomy_result['country']['name']);

                if ($country_code === '') {
                    $errors[] = 'Country code could not be resolved for the selected country.';
                }
            }
        }

        $optional_acf_errors = caes_validate_import_optional_acf_row_fields($row);

        if (!empty($optional_acf_errors)) {
            $errors = array_merge($errors, $optional_acf_errors);
        }

        if (!empty($errors)) {
            $result = array(
                'valid'  => false,
                'errors' => $errors,
            );

            if (!empty($duplicate['found'])) {
                $result['duplicate_blocked'] = true;
                $result['duplicate']       = $duplicate;
            }

            return $result;
        }

        return array(
            'valid' => true,
            'data'  => array(
                'title'             => $title,
                'country'           => $country,
                'denomination'      => $denomination,
                'coin_type'         => $coin_type,
                'year'              => $year_result,
                'obverse_image_url' => $obverse_result,
                'reverse_image_url' => $reverse_result,
                'gallery_urls'      => $validated_gallery_urls,
                'taxonomy_result'            => $taxonomy_result,
                'coin_code'                  => $coin_code,
                'released_date'              => $released_date_normalized,
            ),
        );
    }
}

if (!function_exists('caes_save_import_coin_codes')) {
    function caes_save_import_coin_codes($post_id, $validated) {
        $country      = $validated['taxonomy_result']['country']['name'];
        $denomination = $validated['taxonomy_result']['denomination']['name'];
        $coin_type    = $validated['taxonomy_result']['coin_type']['name'];
        $options      = array(
            'require_release_date'   => true,
            'require_unique_code'    => true,
            'force_new_suffix'       => true,
            'reserved_unique_codes'  => (array) ($validated['batch_unique_codes'] ?? array()),
        );

        if (!empty($validated['coin_code'])) {
            $options['coin_code_override'] = $validated['coin_code'];
        }

        return caes_save_generated_coin_codes(
            $post_id,
            $country,
            $validated['year'],
            $denomination,
            $coin_type,
            $validated['released_date'],
            $options
        );
    }
}

if (!function_exists('caes_map_import_row_to_acf_fields')) {
    function caes_map_import_row_to_acf_fields($row, $validated) {
        $fields = array(
            'coin_year'              => $validated['year'],
            'coin_short_description' => sanitize_textarea_field((string) ($row['short_description'] ?? '')),
            'coin_is_published_catalogue' => 0,
            'coin_is_featured'            => 0,
            'coin_is_app_enabled'         => 1,
            'coin_record_status'          => 'active',
        );

        $map = array(
            'theme'                 => 'coin_theme',
            'mintage'               => 'coin_mintage',
            'material'              => 'coin_material',
            'historical_background' => 'coin_historical_background',
        );

        foreach ($map as $import_key => $acf_key) {
            if (!array_key_exists($import_key, $row)) {
                continue;
            }

            $value = caes_sanitize_acf_field_value($acf_key, $row[$import_key]);

            if ($value !== null) {
                $fields[$acf_key] = $value;
            }
        }

        if (!empty($row['weight'])) {
            $fields['coin_weight_g'] = caes_sanitize_acf_field_value('coin_weight_g', $row['weight']);
        }

        if (!empty($row['diameter'])) {
            $fields['coin_diameter_mm'] = caes_sanitize_acf_field_value('coin_diameter_mm', $row['diameter']);
        }

        if (!empty($row['edge'])) {
            $fields['coin_edge_inscription'] = caes_sanitize_acf_field_value('coin_edge_inscription', $row['edge']);
        }

        $released_date = trim((string) ($row['released_date'] ?? ''));

        if ($released_date !== '') {
            $stored_date = caes_sanitize_acf_field_value('released_date', $released_date);

            if ($stored_date !== '' && $stored_date !== null) {
                $fields['released_date'] = $stored_date;
            }
        }

        $quality = trim((string) ($row['coin_quality'] ?? ''));

        if ($quality !== '') {
            $stored_quality = caes_sanitize_acf_field_value('coin_quality', $quality);

            if ($stored_quality !== '' && $stored_quality !== null) {
                $fields['coin_quality'] = $stored_quality;
            }
        }

        foreach (caes_get_import_optional_textarea_field_keys() as $textarea_key) {
            $textarea_value = trim((string) ($row[$textarea_key] ?? ''));

            if ($textarea_value === '') {
                continue;
            }

            $fields[$textarea_key] = caes_sanitize_acf_field_value($textarea_key, $textarea_value);
        }

        foreach (caes_get_import_optional_bool_field_keys() as $bool_key) {
            if (!array_key_exists($bool_key, $row)) {
                continue;
            }

            $bool_raw = trim((string) $row[$bool_key]);

            if ($bool_raw === '') {
                continue;
            }

            $fields[$bool_key] = caes_sanitize_bool_acf_field($bool_raw);
        }

        foreach (array('coin_designer', 'coin_issue_status', 'coin_source_name', 'coin_source_url') as $import_acf_key) {
            if (!array_key_exists($import_acf_key, $row)) {
                continue;
            }

            $import_acf_value = trim((string) $row[$import_acf_key]);

            if ($import_acf_value === '') {
                continue;
            }

            $stored_import_acf = caes_sanitize_acf_field_value($import_acf_key, $import_acf_value);

            if ($stored_import_acf !== null) {
                $fields[$import_acf_key] = $stored_import_acf;
            }
        }

        $record_status = trim((string) ($row['coin_record_status'] ?? ''));

        if ($record_status !== '' && in_array($record_status, array('active', 'hidden', 'deprecated'), true)) {
            $fields['coin_record_status'] = $record_status;
        }

        if (!caes_import_row_has_german_mint_slots($row) && !empty($row['mint_mark'])) {
            $fields['coin_has_mint_variants'] = 0;
            $fields['coin_mint_mark']         = sanitize_text_field((string) $row['mint_mark']);
            $fields['coin_mint_marks_available'] = '';
            $fields['coin_mint_variants']     = array();
        }

        return $fields;
    }
}

if (!function_exists('caes_import_row_has_german_mint_slots')) {
    function caes_import_row_has_german_mint_slots($row) {
        if (!is_array($row)) {
            return false;
        }

        for ($slot = 1; $slot <= 5; $slot++) {
            $code   = trim((string) ($row['mint_' . $slot . '_code'] ?? ''));
            $mintage = trim((string) ($row['mint_' . $slot . '_mintage'] ?? ''));
            $notes  = trim((string) ($row['mint_' . $slot . '_notes'] ?? ''));

            if ($code !== '' || $mintage !== '' || $notes !== '') {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('caes_normalize_import_mint_mintage')) {
    function caes_normalize_import_mint_mintage($value) {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        $digits = preg_replace('/[^\d]/', '', $value);

        if ($digits === '') {
            return '';
        }

        return (string) absint($digits);
    }
}

if (!function_exists('caes_parse_german_import_mint_variants_from_row')) {
    function caes_parse_german_import_mint_variants_from_row($row) {
        $rows   = array();
        $errors = array();

        if (!is_array($row)) {
            return array(
                'rows'   => array(),
                'errors' => array('Mint variant row data must be an object.'),
            );
        }

        for ($slot = 1; $slot <= 5; $slot++) {
            $code    = trim((string) ($row['mint_' . $slot . '_code'] ?? ''));
            $mintage = trim((string) ($row['mint_' . $slot . '_mintage'] ?? ''));
            $notes   = trim((string) ($row['mint_' . $slot . '_notes'] ?? ''));

            if ($code === '' && $mintage === '' && $notes === '') {
                continue;
            }

            $normalized_code = caes_normalize_german_mint_mark_code($code);

            if ($normalized_code === '') {
                if ($code === '') {
                    $errors[] = sprintf('mint_%d_code is required when mintage or notes are provided.', $slot);
                } else {
                    $errors[] = sprintf(
                        'mint_%d_code must be one of: %s.',
                        $slot,
                        caes_get_german_mint_mark_import_hint()
                    );
                }
                continue;
            }

            $rows[] = array(
                'mint_mark_code' => $normalized_code,
                'mint_mintage'   => caes_normalize_import_mint_mintage($mintage),
                'mint_notes'     => sanitize_textarea_field($notes),
            );
        }

        return array(
            'rows'   => caes_sanitize_mint_variant_rows($rows),
            'errors' => $errors,
        );
    }
}

if (!function_exists('caes_save_import_row_mint_variants')) {
    function caes_save_import_row_mint_variants($post_id, $row) {
        $post_id = absint($post_id);
        $result  = array(
            'mint_variants_saved' => 0,
            'mint_errors'         => array(),
        );

        if ($post_id <= 0 || !caes_import_row_has_german_mint_slots($row)) {
            return $result;
        }

        $parsed = caes_parse_german_import_mint_variants_from_row($row);

        if (!empty($parsed['errors'])) {
            $result['mint_errors'] = $parsed['errors'];
        }

        if (empty($parsed['rows'])) {
            return $result;
        }

        update_post_meta($post_id, '_caes_import_mint_variants', $parsed['rows']);

        caes_save_mint_fields($post_id, array(
            'coin_has_mint_variants'     => 1,
            'coin_mint_mark'             => '',
            'coin_mint_marks_available'  => implode(', ', array_keys(caes_get_german_mint_mark_code_options())),
            'coin_mint_variants'         => $parsed['rows'],
        ));

        $result['mint_variants_saved'] = count($parsed['rows']);

        return $result;
    }
}

if (!function_exists('caes_save_import_image_url_staging_meta')) {
    function caes_save_import_image_url_staging_meta($post_id, $validated) {
        update_post_meta($post_id, '_caes_import_obverse_image_url', $validated['obverse_image_url']);
        update_post_meta($post_id, '_caes_import_reverse_image_url', $validated['reverse_image_url']);

        $gallery_urls = !empty($validated['gallery_urls']) ? $validated['gallery_urls'] : array();
        update_post_meta($post_id, '_caes_import_gallery_image_urls', $gallery_urls);
    }
}

if (!function_exists('caes_get_import_allowed_image_mimes')) {
    function caes_get_import_allowed_image_mimes() {
        return array(
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        );
    }
}

if (!function_exists('caes_get_import_extension_from_url_path')) {
    function caes_get_import_extension_from_url_path($url) {
        $path = wp_parse_url($url, PHP_URL_PATH);
        $ext  = strtolower((string) pathinfo((string) $path, PATHINFO_EXTENSION));
        $map  = array(
            'jpg'  => 'jpg',
            'jpeg' => 'jpg',
            'png'  => 'png',
            'webp' => 'webp',
        );

        return $map[$ext] ?? '';
    }
}

if (!function_exists('caes_detect_import_image_mime')) {
    function caes_detect_import_image_mime($file_path) {
        if (empty($file_path) || !file_exists($file_path)) {
            return '';
        }

        if (function_exists('wp_get_image_mime')) {
            $mime = wp_get_image_mime($file_path);

            if (is_string($mime) && $mime !== '') {
                return $mime;
            }
        }

        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);

            if ($finfo) {
                $mime = finfo_file($finfo, $file_path);
                finfo_close($finfo);

                if (is_string($mime) && $mime !== '') {
                    return $mime;
                }
            }
        }

        return '';
    }
}

if (!function_exists('caes_import_file_contains_svg_markup')) {
    function caes_import_file_contains_svg_markup($file_path) {
        $handle = @fopen($file_path, 'rb');

        if ($handle === false) {
            return false;
        }

        $sample = fread($handle, 4096);
        fclose($handle);

        if (!is_string($sample) || $sample === '') {
            return false;
        }

        $sample = strtolower(ltrim($sample));

        return strpos($sample, '<svg') !== false || strpos($sample, 'image/svg+xml') !== false;
    }
}

if (!function_exists('caes_normalize_import_image_role_slug')) {
    function caes_normalize_import_image_role_slug($label) {
        $label = trim((string) $label);

        if ($label === '') {
            return 'image';
        }

        $lower = strtolower($label);

        if ($lower === 'obverse image') {
            return 'obverse';
        }

        if ($lower === 'reverse image') {
            return 'reverse';
        }

        if (preg_match('/gallery\s+image\s*#\s*(\d+)/i', $label, $matches)) {
            return 'gallery-' . absint($matches[1]);
        }

        $slug = sanitize_title($label);

        return $slug !== '' ? $slug : 'image';
    }
}

if (!function_exists('caes_get_import_image_role_label')) {
    function caes_get_import_image_role_label($label) {
        $label = trim((string) $label);
        $lower = strtolower($label);

        if ($lower === 'obverse image') {
            return 'Obverse';
        }

        if ($lower === 'reverse image') {
            return 'Reverse';
        }

        if (preg_match('/gallery\s+image\s*#\s*(\d+)/i', $label, $matches)) {
            return sprintf('Gallery image %d', absint($matches[1]));
        }

        return $label !== '' ? $label : 'Image';
    }
}

if (!function_exists('caes_get_import_coin_title_for_attachment')) {
    function caes_get_import_coin_title_for_attachment($post_id) {
        $post_id = absint($post_id);
        $title   = $post_id > 0 ? get_the_title($post_id) : '';
        $title   = trim((string) $title);

        if ($title !== '') {
            return $title;
        }

        return $post_id > 0 ? sprintf('Coin %d', $post_id) : 'Coin';
    }
}

if (!function_exists('caes_get_import_image_attachment_title')) {
    function caes_get_import_image_attachment_title($post_id, $label) {
        return sprintf(
            '%s – %s',
            caes_get_import_coin_title_for_attachment($post_id),
            caes_get_import_image_role_label($label)
        );
    }
}

if (!function_exists('caes_get_import_image_attachment_alt_text')) {
    function caes_get_import_image_attachment_alt_text($post_id, $label) {
        $coin_title = caes_get_import_coin_title_for_attachment($post_id);
        $lower      = strtolower(trim((string) $label));

        if ($lower === 'obverse image') {
            return $coin_title . ' obverse';
        }

        if ($lower === 'reverse image') {
            return $coin_title . ' reverse';
        }

        if (preg_match('/gallery\s+image\s*#\s*(\d+)/i', $label, $matches)) {
            return $coin_title . ' gallery image ' . absint($matches[1]);
        }

        return trim($coin_title . ' ' . strtolower($label));
    }
}

if (!function_exists('caes_generate_import_unique_suffix')) {
    function caes_generate_import_unique_suffix() {
        if (function_exists('wp_generate_uuid4')) {
            return substr(wp_generate_uuid4(), 0, 8);
        }

        return strtolower(wp_generate_password(8, false, false));
    }
}

if (!function_exists('caes_get_import_sideload_filename')) {
    function caes_get_import_sideload_filename($post_id, $url, $label, $detected_ext = 'jpg') {
        $post_id = absint($post_id);
        $allowed_exts = array('jpg', 'png', 'webp');
        $detected_ext = strtolower(sanitize_key((string) $detected_ext));

        if (!in_array($detected_ext, $allowed_exts, true)) {
            $detected_ext = 'jpg';
        }

        $post_slug = $post_id > 0 ? sanitize_title(get_post_field('post_title', $post_id)) : '';

        if ($post_slug === '') {
            $post_slug = $post_id > 0 ? 'coin-' . $post_id : 'coin';
        }

        $role_slug = caes_normalize_import_image_role_slug($label);
        $timestamp = current_time('Ymd-His');
        $unique    = caes_generate_import_unique_suffix();
        $suffix    = '-' . $role_slug . '-' . $timestamp . '-' . $unique;
        $max_base_length = 200 - strlen($detected_ext) - 1;

        if (strlen($post_slug . $suffix) > $max_base_length) {
            $max_post_slug = max(1, $max_base_length - strlen($suffix));
            $post_slug     = rtrim(substr($post_slug, 0, $max_post_slug), '-');
        }

        $filename = sanitize_file_name($post_slug . $suffix . '.' . $detected_ext);

        return $filename !== '' ? $filename : sanitize_file_name('coin-' . $post_id . $suffix . '.' . $detected_ext);
    }
}

if (!function_exists('caes_validate_import_sideloaded_file')) {
    function caes_validate_import_sideloaded_file($file_path, $label) {
        if (empty($file_path) || !file_exists($file_path)) {
            return new WP_Error(
                'caes_import_image_download_failed',
                sprintf('download_failed: %s could not be read after download.', $label)
            );
        }

        $file_size = filesize($file_path);

        if ($file_size === false || $file_size > caes_import_get_max_image_bytes()) {
            return new WP_Error(
                'caes_import_image_too_large',
                sprintf('image_too_large: %s exceeds the 5MB import size limit.', $label)
            );
        }

        $mime = caes_detect_import_image_mime($file_path);

        if ($mime === '' && caes_import_file_contains_svg_markup($file_path)) {
            $mime = 'image/svg+xml';
        }

        if (in_array($mime, array('image/svg+xml', 'image/svg'), true)) {
            return new WP_Error(
                'caes_import_invalid_image_type',
                sprintf('invalid_image_type: %s SVG images are not allowed.', $label)
            );
        }

        $allowed_mimes = caes_get_import_allowed_image_mimes();

        if (!isset($allowed_mimes[$mime])) {
            return new WP_Error(
                'caes_import_invalid_image_type',
                sprintf(
                    'invalid_image_type: %s must be JPEG, PNG, or WebP (detected: %s).',
                    $label,
                    $mime !== '' ? $mime : 'unknown'
                )
            );
        }

        return array(
            'mime' => $mime,
            'ext'  => $allowed_mimes[$mime],
        );
    }
}

if (!function_exists('caes_sideload_import_image_from_url')) {
    function caes_sideload_import_image_from_url($url, $post_id, $label, $contributor = null) {
        $url = esc_url_raw(trim((string) $url));

        $url_check = caes_validate_import_image_url($url, $label);

        if (is_wp_error($url_check)) {
            return $url_check;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $tmp_file = download_url($url, 30);

        if (is_wp_error($tmp_file)) {
            return new WP_Error(
                'caes_import_image_download_failed',
                sprintf('download_failed: %s (%s)', $label, $tmp_file->get_error_message())
            );
        }

        $file_check = caes_validate_import_sideloaded_file($tmp_file, $label);

        if (is_wp_error($file_check)) {
            @unlink($tmp_file);

            return $file_check;
        }

        $file_array = array(
            'name'     => caes_get_import_sideload_filename(
                $post_id,
                $url,
                $label,
                $file_check['ext'] ?? 'jpg'
            ),
            'tmp_name' => $tmp_file,
        );

        $attachment_title = caes_get_import_image_attachment_title($post_id, $label);
        $attachment_alt   = caes_get_import_image_attachment_alt_text($post_id, $label);
        $attachment_id    = media_handle_sideload($file_array, $post_id, $attachment_title);

        if (file_exists($tmp_file)) {
            @unlink($tmp_file);
        }

        if (is_wp_error($attachment_id)) {
            return new WP_Error(
                'caes_import_image_sideload_failed',
                sprintf('sideload_failed: %s (%s)', $label, $attachment_id->get_error_message())
            );
        }

        update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($attachment_alt));

        if (!empty($contributor) && function_exists('caes_stamp_attachment_contributor')) {
            caes_stamp_attachment_contributor($attachment_id, $contributor);
        }

        return absint($attachment_id);
    }
}

if (!function_exists('caes_save_import_obverse_image')) {
    function caes_save_import_obverse_image($post_id, $attachment_id) {
        if (!function_exists('caes_save_coin_obverse_image_id')) {
            return false;
        }

        if (!caes_save_coin_obverse_image_id($post_id, $attachment_id)) {
            return false;
        }

        if (function_exists('caes_sync_featured_image_from_obverse')) {
            caes_sync_featured_image_from_obverse($post_id, true);
        }

        return true;
    }
}

if (!function_exists('caes_save_import_reverse_image')) {
    function caes_save_import_reverse_image($post_id, $attachment_id) {
        if (!function_exists('caes_save_coin_reverse_image_id')) {
            return false;
        }

        return caes_save_coin_reverse_image_id($post_id, $attachment_id);
    }
}

if (!function_exists('caes_import_coin_row_images')) {
    function caes_import_coin_row_images($post_id, $validated, $contributor = null) {
        $status = array(
            'obverse_imported'       => false,
            'reverse_imported'       => false,
            'gallery_imported_count' => 0,
            'image_errors'           => array(),
        );

        $obverse_image_url = trim((string) ($validated['obverse_image_url'] ?? ''));

        if ($obverse_image_url !== '') {
            $obverse_id = caes_sideload_import_image_from_url(
                $obverse_image_url,
                $post_id,
                'Obverse image',
                $contributor
            );

            if (is_wp_error($obverse_id)) {
                $status['image_errors'][] = $obverse_id->get_error_message();
            } else {
                caes_save_import_obverse_image($post_id, $obverse_id);
                $status['obverse_imported'] = true;
            }
        }

        $reverse_image_url = trim((string) ($validated['reverse_image_url'] ?? ''));

        if ($reverse_image_url !== '') {
            $reverse_id = caes_sideload_import_image_from_url(
                $reverse_image_url,
                $post_id,
                'Reverse image',
                $contributor
            );

            if (is_wp_error($reverse_id)) {
                $status['image_errors'][] = $reverse_id->get_error_message();
            } else {
                caes_save_import_reverse_image($post_id, $reverse_id);
                $status['reverse_imported'] = true;
            }
        }

        $gallery_ids = array();
        $gallery_urls = !empty($validated['gallery_urls']) ? $validated['gallery_urls'] : array();

        foreach ($gallery_urls as $gallery_index => $gallery_url) {
            $gallery_label = sprintf('Gallery image #%d', $gallery_index + 1);
            $gallery_id    = caes_sideload_import_image_from_url($gallery_url, $post_id, $gallery_label, $contributor);

            if (is_wp_error($gallery_id)) {
                $status['image_errors'][] = $gallery_id->get_error_message();
                continue;
            }

            $gallery_ids[] = $gallery_id;
        }

        if (!empty($gallery_ids)) {
            caes_save_coin_gallery_ids($post_id, $gallery_ids);
            $status['gallery_imported_count'] = count($gallery_ids);
        }

        $defaults_applied = caes_apply_default_coin_images_if_missing($post_id);

        if (!empty($defaults_applied['obverse'])) {
            $status['obverse_imported'] = true;

            if (function_exists('caes_sync_featured_image_from_obverse')) {
                caes_sync_featured_image_from_obverse($post_id, true);
            }
        }

        if (!empty($defaults_applied['reverse'])) {
            $status['reverse_imported'] = true;
        }

        if (function_exists('caes_validate_coin_obverse_reverse_ids')) {
            $image_ids_check = caes_validate_coin_obverse_reverse_ids($post_id);

            if (is_wp_error($image_ids_check)) {
                $status['image_errors'][] = $image_ids_check->get_error_message();
            }
        }

        if (!empty($status['image_errors'])) {
            update_post_meta($post_id, '_caes_import_image_errors', $status['image_errors']);
        }

        return $status;
    }
}

if (!function_exists('caes_save_import_row_optional_meta')) {
    function caes_save_import_row_optional_meta($post_id, $row) {
        if (!empty($row['designer'])) {
            update_post_meta($post_id, '_caes_import_designer', sanitize_text_field((string) $row['designer']));
        }
    }
}

if (!function_exists('caes_create_import_coin_post')) {
    function caes_create_import_coin_post($row, $validated, $batch_id, $contributor) {
        $post_status = caes_get_import_post_status_for_mode('draft');

        $post_id = wp_insert_post(array(
            'post_type'   => 'coin',
            'post_status' => $post_status,
            'post_title'  => $validated['title'],
        ), true);

        if (is_wp_error($post_id) || empty($post_id)) {
            return new WP_Error(
                'caes_import_create_failed',
                'Failed to create imported coin post.'
            );
        }

        $country      = $validated['taxonomy_result']['country']['name'];
        $denomination = $validated['taxonomy_result']['denomination']['name'];
        $coin_type    = $validated['taxonomy_result']['coin_type']['name'];
        $short_description = sanitize_textarea_field((string) ($row['short_description'] ?? ''));

        if (!empty($contributor)) {
            update_post_meta($post_id, '_caes_contributor_id', (int) $contributor->id);
            update_post_meta($post_id, '_caes_contributor_email', sanitize_email($contributor->email));
            update_post_meta($post_id, '_caes_submission_auth_type', 'contributor_token');
        }

        update_post_meta($post_id, '_caes_country', $country);
        update_post_meta($post_id, '_caes_year', $validated['year']);
        update_post_meta($post_id, '_caes_denomination', $denomination);
        update_post_meta($post_id, '_caes_short_description', $short_description);
        update_post_meta($post_id, '_caes_submission_source', 'csv_import');
        update_post_meta($post_id, '_caes_imported', 1);
        update_post_meta($post_id, '_caes_import_batch_id', $batch_id);
        update_post_meta($post_id, '_caes_imported_by', !empty($contributor) ? (int) $contributor->id : 0);
        update_post_meta($post_id, '_caes_imported_at', current_time('mysql'));

        $taxonomy_assign = caes_assign_submission_taxonomies($post_id, $validated['taxonomy_result']);

        if (is_wp_error($taxonomy_assign)) {
            wp_delete_post($post_id, true);

            return $taxonomy_assign;
        }

        caes_save_coin_acf_fields($post_id, caes_map_import_row_to_acf_fields($row, $validated));
        caes_save_coin_country_code_from_country($post_id, $country);

        $code_result = caes_save_import_coin_codes($post_id, $validated);

        if (is_wp_error($code_result)) {
            wp_delete_post($post_id, true);

            return $code_result;
        }

        $duplicate = caes_find_exact_duplicate($post_id);

        if (!empty($duplicate['found'])) {
            caes_log_exact_duplicate_block($post_id, 'import_skipped', $duplicate, $contributor);
            wp_delete_post($post_id, true);

            return caes_build_exact_duplicate_wp_error($duplicate, 'import');
        }

        caes_save_import_image_url_staging_meta($post_id, $validated);
        caes_save_import_row_optional_meta($post_id, $row);

        caes_log_submission_event(
            $post_id,
            'imported',
            'Coin imported',
            'Coin row was imported as a pending submission.',
            array(
                'batch_id' => $batch_id,
                'mode'     => 'draft',
            ),
            $contributor
        );

        return $post_id;
    }
}

if (!function_exists('caes_import_admin_coins')) {
    function caes_import_admin_coins(WP_REST_Request $request) {
        $params = $request->get_json_params();

        if (!is_array($params)) {
            return new WP_Error(
                'rest_invalid_import_payload',
                'Import payload must be a JSON object.',
                array('status' => 400)
            );
        }

        $mode = sanitize_key((string) ($params['mode'] ?? ''));
        $rows = $params['rows'] ?? null;

        if ($mode !== 'draft') {
            return new WP_Error(
                'rest_invalid_import_mode',
                'Import mode must be draft.',
                array('status' => 400)
            );
        }

        if (!is_array($rows) || empty($rows)) {
            return new WP_Error(
                'rest_missing_import_rows',
                'Import rows are required.',
                array('status' => 400)
            );
        }

        $contributor = $request->get_param('_caes_contributor');
        $batch_id    = caes_generate_import_batch_id();
        $results     = array();
        $created            = 0;
        $failed             = 0;
        $duplicate_blocked  = 0;
        $batch_unique_codes = array();

        foreach ($rows as $index => $row) {
            $row_index = $index + 1;
            $validation = caes_validate_import_coin_row($row, $row_index, $batch_unique_codes);

            if (empty($validation['valid'])) {
                $failed++;

                if (!empty($validation['duplicate_blocked']) && !empty($validation['duplicate'])) {
                    $duplicate_blocked++;
                    caes_log_exact_duplicate_block(
                        0,
                        'import_skipped',
                        $validation['duplicate'],
                        $contributor,
                        $row_index
                    );
                }

                $row_result = array(
                    'row_index' => $row_index,
                    'success'   => false,
                    'errors'    => $validation['errors'] ?? array('Row validation failed.'),
                );

                if (!empty($validation['duplicate_blocked'])) {
                    $row_result['outcome'] = 'duplicate_blocked';
                }

                if (!empty($validation['duplicate']) && is_array($validation['duplicate'])) {
                    $row_result['duplicate'] = array(
                        'post_id' => absint($validation['duplicate']['post_id'] ?? 0),
                        'title'   => sanitize_text_field((string) ($validation['duplicate']['title'] ?? '')),
                        'reason'  => sanitize_key((string) ($validation['duplicate']['reason'] ?? '')),
                    );
                }

                $results[] = $row_result;
                continue;
            }

            $validated = $validation['data'];
            $validated['batch_unique_codes'] = $batch_unique_codes;

            $post_id = caes_create_import_coin_post($row, $validated, $batch_id, $contributor);

            if (is_wp_error($post_id)) {
                $failed++;
                $row_result = array(
                    'row_index' => $row_index,
                    'success'   => false,
                    'errors'    => array($post_id->get_error_message()),
                );
                $error_data = $post_id->get_error_data();

                if (
                    $post_id->get_error_code() === 'rest_submission_duplicate_blocked'
                    || (is_array($error_data) && !empty($error_data['duplicate_found']))
                ) {
                    $duplicate_blocked++;
                    $row_result['outcome'] = 'duplicate_blocked';
                    $row_result['duplicate'] = array(
                        'post_id' => absint(is_array($error_data) ? ($error_data['duplicate_post_id'] ?? 0) : 0),
                        'title'   => sanitize_text_field(is_array($error_data) ? (string) ($error_data['duplicate_title'] ?? '') : ''),
                        'reason'  => sanitize_key(is_array($error_data) ? (string) ($error_data['duplicate_reason'] ?? '') : ''),
                    );
                }

                $results[] = $row_result;
                continue;
            }

            $mint_status  = caes_save_import_row_mint_variants($post_id, $row);
            $image_status = caes_import_coin_row_images($post_id, $validated, $contributor);
            $saved_coin_code = strtolower((string) caes_read_coin_acf_value($post_id, 'coin_code'));

            if ($saved_coin_code !== '') {
                $batch_unique_codes[] = $saved_coin_code;
            }

            $created++;
            $results[] = array_merge(
                array(
                    'row_index' => $row_index,
                    'success'   => true,
                    'post_id'   => (int) $post_id,
                    'title'     => $validated['title'],
                ),
                $mint_status,
                $image_status
            );
        }

        return new WP_REST_Response(array(
            'success'  => true,
            'batch_id' => $batch_id,
            'summary'  => array(
                'total'              => count($rows),
                'created'            => $created,
                'failed'             => $failed,
                'duplicate_blocked'  => $duplicate_blocked,
            ),
            'results'  => $results,
        ), 200);
    }
}
