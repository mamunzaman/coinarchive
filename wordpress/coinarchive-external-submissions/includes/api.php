<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_exact_unique_code_meta_keys')) {
    function caes_get_exact_unique_code_meta_keys() {
        return array(
            'unique_code',
            '_caes_unique_code',
        );
    }
}

if (!function_exists('caes_get_exact_coin_code_meta_keys')) {
    function caes_get_exact_coin_code_meta_keys() {
        return array(
            'coin_code',
            '_caes_coin_code',
        );
    }
}

if (!function_exists('caes_sanitize_duplicate_check_input')) {
    function caes_sanitize_duplicate_check_input($input) {
        if (!is_array($input)) {
            $input = array();
        }

        return array(
            'unique_code'            => sanitize_text_field((string) ($input['unique_code'] ?? '')),
            'coin_code'              => sanitize_text_field((string) ($input['coin_code'] ?? '')),
            'country'                => sanitize_text_field((string) ($input['country'] ?? '')),
            'year'                   => absint($input['year'] ?? 0),
            'denomination'           => sanitize_text_field((string) ($input['denomination'] ?? '')),
            'coin_type'              => sanitize_text_field((string) ($input['coin_type'] ?? '')),
            'coin_theme'             => sanitize_text_field((string) ($input['coin_theme'] ?? '')),
            'commemorative_subject'  => sanitize_text_field((string) ($input['commemorative_subject'] ?? '')),
            'exclude_post_id'        => absint($input['exclude_post_id'] ?? 0),
        );
    }
}

if (!function_exists('caes_exact_code_exists_on_other_post')) {
    function caes_exact_code_exists_on_other_post($code, $meta_keys, $exclude_post_id = 0) {
        global $wpdb;

        $code            = sanitize_text_field(trim((string) $code));
        $exclude_post_id = absint($exclude_post_id);
        $meta_keys       = array_values(array_filter(array_map('strval', (array) $meta_keys)));

        if ($code === '' || empty($meta_keys)) {
            return false;
        }

        $escaped_keys = array();

        foreach ($meta_keys as $meta_key) {
            $escaped_keys[] = "'" . esc_sql($meta_key) . "'";
        }

        $keys_sql = implode(', ', $escaped_keys);

        $post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT DISTINCT pm.post_id
                 FROM {$wpdb->postmeta} pm
                 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE p.post_type = 'coin'
                 AND p.post_status != 'trash'
                 AND pm.meta_key IN ($keys_sql)
                 AND pm.meta_value = %s
                 AND pm.post_id != %d",
                $code,
                $exclude_post_id
            )
        );

        if (empty($post_ids)) {
            return false;
        }

        foreach ($post_ids as $post_id) {
            $post_id = absint($post_id);

            foreach ($meta_keys as $meta_key) {
                if (sanitize_text_field((string) get_post_meta($post_id, $meta_key, true)) === $code) {
                    return $post_id;
                }
            }
        }

        return false;
    }
}

if (!function_exists('caes_exact_unique_code_exists_on_other_post')) {
    function caes_exact_unique_code_exists_on_other_post($unique_code, $exclude_post_id = 0) {
        return caes_exact_code_exists_on_other_post(
            $unique_code,
            caes_get_exact_unique_code_meta_keys(),
            $exclude_post_id
        );
    }
}

if (!function_exists('caes_exact_coin_code_exists_on_other_post')) {
    function caes_exact_coin_code_exists_on_other_post($coin_code, $exclude_post_id = 0) {
        return caes_exact_code_exists_on_other_post(
            $coin_code,
            caes_get_exact_coin_code_meta_keys(),
            $exclude_post_id
        );
    }
}

if (!function_exists('caes_duplicate_unique_code_match_error')) {
    function caes_duplicate_unique_code_match_error($unique_code = '') {
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

if (!function_exists('caes_duplicate_coin_code_match_error')) {
    function caes_duplicate_coin_code_match_error($coin_code = '') {
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

if (!function_exists('caes_validate_coin_duplicate_codes')) {
    function caes_validate_coin_duplicate_codes($unique_code, $coin_code, $exclude_post_id = 0) {
        $unique_code     = sanitize_text_field(trim((string) $unique_code));
        $coin_code       = sanitize_text_field(trim((string) $coin_code));
        $exclude_post_id = absint($exclude_post_id);

        if ($unique_code !== '') {
            $duplicate_post_id = caes_exact_unique_code_exists_on_other_post($unique_code, $exclude_post_id);

            if ($duplicate_post_id !== false) {
                return caes_duplicate_unique_code_match_error($unique_code);
            }
        }

        if ($coin_code !== '') {
            $duplicate_post_id = caes_exact_coin_code_exists_on_other_post($coin_code, $exclude_post_id);

            if ($duplicate_post_id !== false) {
                return caes_duplicate_coin_code_match_error($coin_code);
            }
        }

        return true;
    }
}

if (!function_exists('caes_normalize_duplicate_post_title')) {
    function caes_normalize_duplicate_post_title($title) {
        $title = strtolower(trim((string) $title));

        if ($title === '') {
            return '';
        }

        if (function_exists('remove_accents')) {
            $title = remove_accents($title);
        }

        $title = preg_replace('/[^a-z0-9]+/', ' ', $title);

        return trim((string) $title);
    }
}

if (!function_exists('caes_exact_post_title_exists_on_other_post')) {
    function caes_exact_post_title_exists_on_other_post($title, $exclude_post_id = 0) {
        global $wpdb;

        $title           = trim((string) $title);
        $exclude_post_id = absint($exclude_post_id);
        $normalized      = caes_normalize_duplicate_post_title($title);

        if ($title === '' && $normalized === '') {
            return false;
        }

        $post_id = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT ID
                 FROM {$wpdb->posts}
                 WHERE post_type = 'coin'
                 AND post_status != 'trash'
                 AND ID != %d
                 AND LOWER(post_title) = %s
                 LIMIT 1",
                $exclude_post_id,
                strtolower($title)
            )
        );

        if (!empty($post_id)) {
            return absint($post_id);
        }

        if ($normalized === '') {
            return false;
        }

        $post_ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT ID
                 FROM {$wpdb->posts}
                 WHERE post_type = 'coin'
                 AND post_status != 'trash'
                 AND ID != %d",
                $exclude_post_id
            )
        );

        foreach ((array) $post_ids as $candidate_id) {
            $candidate_id   = absint($candidate_id);
            $existing_title = get_the_title($candidate_id);

            if (
                $existing_title !== ''
                && caes_normalize_duplicate_post_title($existing_title) === $normalized
            ) {
                return $candidate_id;
            }
        }

        return false;
    }
}

if (!function_exists('caes_get_duplicate_check_values_from_post')) {
    function caes_get_duplicate_check_values_from_post($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return array(
                'unique_code' => '',
                'coin_code'   => '',
                'title'       => '',
            );
        }

        $unique_code = sanitize_text_field((string) get_post_meta($post_id, 'unique_code', true));

        if ($unique_code === '') {
            $unique_code = sanitize_text_field((string) get_post_meta($post_id, '_caes_unique_code', true));
        }

        $coin_code = sanitize_text_field((string) get_post_meta($post_id, 'coin_code', true));

        if ($coin_code === '') {
            $coin_code = sanitize_text_field((string) get_post_meta($post_id, '_caes_coin_code', true));
        }

        if (function_exists('caes_read_coin_acf_value')) {
            if ($unique_code === '') {
                $unique_code = sanitize_text_field((string) caes_read_coin_acf_value($post_id, 'unique_code'));
            }

            if ($coin_code === '') {
                $coin_code = sanitize_text_field((string) caes_read_coin_acf_value($post_id, 'coin_code'));
            }
        }

        return array(
            'unique_code' => $unique_code,
            'coin_code'   => $coin_code,
            'title'       => get_the_title($post_id),
        );
    }
}

if (!function_exists('caes_get_duplicate_reason_label')) {
    function caes_get_duplicate_reason_label($reason) {
        switch (sanitize_key((string) $reason)) {
            case 'exact_unique_code':
                return 'unique code';
            case 'exact_coin_code':
                return 'coin code';
            case 'exact_title':
                return 'title';
            default:
                return sanitize_text_field((string) $reason);
        }
    }
}

if (!function_exists('caes_find_exact_duplicate')) {
    function caes_find_exact_duplicate($input, $exclude_post_id = 0) {
        $empty_result = array(
            'found'   => false,
            'post_id' => 0,
            'reason'  => '',
            'title'   => '',
        );

        if (is_numeric($input)) {
            $post_id         = absint($input);
            $exclude_post_id = $post_id;
            $values          = caes_get_duplicate_check_values_from_post($post_id);
            $unique_code     = $values['unique_code'];
            $coin_code       = $values['coin_code'];
            $title           = $values['title'];
        } elseif (is_array($input)) {
            $exclude_post_id = absint($exclude_post_id > 0 ? $exclude_post_id : ($input['exclude_post_id'] ?? 0));
            $unique_code     = sanitize_text_field((string) ($input['unique_code'] ?? ''));
            $coin_code       = sanitize_text_field((string) ($input['coin_code'] ?? ''));
            $title           = sanitize_text_field((string) ($input['title'] ?? $input['post_title'] ?? ''));
        } else {
            return $empty_result;
        }

        if ($unique_code !== '') {
            $duplicate_post_id = caes_exact_unique_code_exists_on_other_post($unique_code, $exclude_post_id);

            if ($duplicate_post_id !== false) {
                return array(
                    'found'         => true,
                    'post_id'       => (int) $duplicate_post_id,
                    'reason'        => 'exact_unique_code',
                    'title'         => get_the_title($duplicate_post_id),
                    'matched_value' => $unique_code,
                );
            }
        }

        if ($coin_code !== '') {
            $duplicate_post_id = caes_exact_coin_code_exists_on_other_post($coin_code, $exclude_post_id);

            if ($duplicate_post_id !== false) {
                return array(
                    'found'         => true,
                    'post_id'       => (int) $duplicate_post_id,
                    'reason'        => 'exact_coin_code',
                    'title'         => get_the_title($duplicate_post_id),
                    'matched_value' => $coin_code,
                );
            }
        }

        if ($title !== '') {
            $duplicate_post_id = caes_exact_post_title_exists_on_other_post($title, $exclude_post_id);

            if ($duplicate_post_id !== false) {
                return array(
                    'found'         => true,
                    'post_id'       => (int) $duplicate_post_id,
                    'reason'        => 'exact_title',
                    'title'         => get_the_title($duplicate_post_id),
                    'matched_value' => $title,
                );
            }
        }

        return $empty_result;
    }
}

if (!function_exists('caes_format_exact_duplicate_block_message')) {
    function caes_format_exact_duplicate_block_message($duplicate, $context = 'approval') {
        if (empty($duplicate['found'])) {
            return 'Approval blocked because an identical coin already exists.';
        }

        $reason_label = caes_get_duplicate_reason_label($duplicate['reason'] ?? '');
        $existing_id  = absint($duplicate['post_id'] ?? 0);
        $existing_title = sanitize_text_field((string) ($duplicate['title'] ?? ''));

        if ($context === 'import') {
            $message = sprintf('Import skipped due to duplicate %s.', $reason_label);
        } else {
            $message = 'Approval blocked because an identical coin already exists.';
        }

        if ($existing_id > 0 && $existing_title !== '') {
            $message .= sprintf(' Existing coin #%d: %s.', $existing_id, $existing_title);
        } elseif ($existing_id > 0) {
            $message .= sprintf(' Existing coin #%d.', $existing_id);
        }

        return $message;
    }
}

if (!function_exists('caes_log_exact_duplicate_block')) {
    function caes_log_exact_duplicate_block($subject_post_id, $context, $duplicate, $contributor = null, $row_index = 0) {
        if (empty($duplicate['found'])) {
            return false;
        }

        $log_post_id = absint($duplicate['post_id'] ?? 0);

        if ($log_post_id <= 0) {
            $log_post_id = absint($subject_post_id);
        }

        if ($log_post_id <= 0) {
            return false;
        }

        $reason_label = caes_get_duplicate_reason_label($duplicate['reason'] ?? '');

        if ($context === 'import_skipped') {
            $event_message = sprintf('Import skipped due to duplicate %s.', $reason_label);
        } else {
            $event_message = sprintf('Approval blocked due to duplicate %s.', $reason_label);
        }

        if (!function_exists('caes_log_submission_event')) {
            return false;
        }

        return caes_log_submission_event(
            $log_post_id,
            'duplicate_blocked',
            'Duplicate blocked',
            $event_message,
            array(
                'context'           => sanitize_key((string) $context),
                'duplicate_reason'  => sanitize_key((string) ($duplicate['reason'] ?? '')),
                'duplicate_post_id' => absint($duplicate['post_id'] ?? 0),
                'duplicate_title'   => sanitize_text_field((string) ($duplicate['title'] ?? '')),
                'subject_post_id'   => absint($subject_post_id),
                'import_row_index'  => absint($row_index),
            ),
            $contributor
        );
    }
}

if (!function_exists('caes_build_exact_duplicate_wp_error')) {
    function caes_build_exact_duplicate_wp_error($duplicate, $context = 'approval') {
        return new WP_Error(
            'rest_submission_duplicate_blocked',
            caes_format_exact_duplicate_block_message($duplicate, $context),
            array(
                'status'            => 409,
                'duplicate_found'   => true,
                'duplicate_post_id' => absint($duplicate['post_id'] ?? 0),
                'duplicate_title'   => sanitize_text_field((string) ($duplicate['title'] ?? '')),
                'duplicate_reason'  => sanitize_key((string) ($duplicate['reason'] ?? '')),
            )
        );
    }
}

if (!function_exists('caes_format_duplicate_match_post')) {
    function caes_format_duplicate_match_post($post_id) {
        $post_id = absint($post_id);

        if ($post_id <= 0) {
            return array();
        }

        $post = get_post($post_id);

        if (empty($post) || $post->post_type !== 'coin') {
            return array();
        }

        $type_terms = wp_get_post_terms($post_id, 'coin_type', array('fields' => 'names'));
        $coin_type  = (!is_wp_error($type_terms) && !empty($type_terms)) ? (string) $type_terms[0] : '';
        $coin_theme = function_exists('caes_read_coin_acf_value')
            ? sanitize_text_field((string) caes_read_coin_acf_value($post_id, 'coin_theme'))
            : sanitize_text_field((string) get_post_meta($post_id, 'coin_theme', true));

        $unique_code = sanitize_text_field((string) get_post_meta($post_id, 'unique_code', true));

        if ($unique_code === '') {
            $unique_code = sanitize_text_field((string) get_post_meta($post_id, '_caes_unique_code', true));
        }

        $coin_code = sanitize_text_field((string) get_post_meta($post_id, 'coin_code', true));

        if ($coin_code === '') {
            $coin_code = sanitize_text_field((string) get_post_meta($post_id, '_caes_coin_code', true));
        }

        return array(
            'id'                    => $post_id,
            'title'                 => get_the_title($post_id),
            'status'                => $post->post_status,
            'unique_code'           => $unique_code,
            'coin_code'             => $coin_code,
            'country'               => sanitize_text_field((string) get_post_meta($post_id, '_caes_country', true)),
            'year'                  => absint(get_post_meta($post_id, '_caes_year', true)),
            'denomination'          => sanitize_text_field((string) get_post_meta($post_id, '_caes_denomination', true)),
            'coin_type'             => $coin_type,
            'coin_theme'            => $coin_theme,
            'commemorative_subject' => $coin_theme,
        );
    }
}

if (!function_exists('caes_find_similar_coin_matches')) {
    function caes_find_similar_coin_matches($criteria, $exclude_post_id = 0, $exclude_post_ids = array(), $limit = 10) {
        $criteria        = caes_sanitize_duplicate_check_input($criteria);
        $exclude_post_id = absint($exclude_post_id);
        $limit           = max(1, min(25, absint($limit)));
        $exclude_ids     = array_filter(array_map('absint', (array) $exclude_post_ids));

        if ($exclude_post_id > 0) {
            $exclude_ids[] = $exclude_post_id;
        }

        $exclude_ids   = array_values(array_unique($exclude_ids));
        $meta_filters  = array();
        $tax_query     = array();
        $has_filter    = false;

        if ($criteria['country'] !== '') {
            $has_filter     = true;
            $meta_filters[] = array(
                'key'     => '_caes_country',
                'value'   => $criteria['country'],
                'compare' => '=',
            );
        }

        if ($criteria['year'] > 0) {
            $has_filter     = true;
            $meta_filters[] = array(
                'key'     => '_caes_year',
                'value'   => (string) $criteria['year'],
                'compare' => '=',
            );
        }

        if ($criteria['denomination'] !== '') {
            $has_filter     = true;
            $meta_filters[] = array(
                'key'     => '_caes_denomination',
                'value'   => $criteria['denomination'],
                'compare' => '=',
            );
        }

        if ($criteria['coin_type'] !== '') {
            $has_filter  = true;
            $tax_query[] = array(
                'taxonomy' => 'coin_type',
                'field'    => 'name',
                'terms'    => array($criteria['coin_type']),
            );
        }

        $theme_value = $criteria['coin_theme'];

        if ($theme_value === '' && $criteria['commemorative_subject'] !== '') {
            $theme_value = $criteria['commemorative_subject'];
        }

        if ($theme_value !== '') {
            $has_filter     = true;
            $meta_filters[] = array(
                'key'     => 'coin_theme',
                'value'   => $theme_value,
                'compare' => '=',
            );
        }

        if (!$has_filter) {
            return array();
        }

        $args = array(
            'post_type'              => 'coin',
            'post_status'            => array('publish', 'pending', 'draft'),
            'posts_per_page'         => $limit,
            'post__not_in'           => $exclude_ids,
            'ignore_sticky_posts'    => true,
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'fields'                 => 'ids',
        );

        if (!empty($meta_filters)) {
            $args['meta_query'] = count($meta_filters) > 1
                ? array_merge(array('relation' => 'AND'), $meta_filters)
                : $meta_filters;
        }

        if (!empty($tax_query)) {
            $args['tax_query'] = $tax_query;
        }

        $post_ids = get_posts($args);
        $matches  = array();

        foreach ($post_ids as $post_id) {
            $formatted = caes_format_duplicate_match_post($post_id);

            if (!empty($formatted)) {
                $matches[] = $formatted;
            }
        }

        return $matches;
    }
}

if (!function_exists('caes_run_coin_duplicate_check')) {
    function caes_run_coin_duplicate_check($input, $exclude_post_id = 0) {
        $criteria        = caes_sanitize_duplicate_check_input(is_array($input) ? array_merge($input, array(
            'exclude_post_id' => $exclude_post_id,
        )) : array('exclude_post_id' => $exclude_post_id));
        $exclude_post_id = $criteria['exclude_post_id'];
        $matches         = array();
        $match_ids       = array();

        $result = array(
            'hasDuplicates'   => false,
            'exactUniqueCode' => false,
            'exactCoinCode'   => false,
            'similarMatches'  => array(),
            'matches'         => array(),
        );

        if ($criteria['unique_code'] !== '') {
            $duplicate_post_id = caes_exact_unique_code_exists_on_other_post($criteria['unique_code'], $exclude_post_id);

            if ($duplicate_post_id !== false) {
                $formatted = caes_format_duplicate_match_post($duplicate_post_id);

                if (!empty($formatted)) {
                    $result['hasDuplicates']   = true;
                    $result['exactUniqueCode'] = true;
                    $matches[]                 = $formatted;
                    $match_ids[]               = $duplicate_post_id;
                }
            }
        }

        if ($criteria['coin_code'] !== '') {
            $duplicate_post_id = caes_exact_coin_code_exists_on_other_post($criteria['coin_code'], $exclude_post_id);

            if ($duplicate_post_id !== false && !in_array($duplicate_post_id, $match_ids, true)) {
                $formatted = caes_format_duplicate_match_post($duplicate_post_id);

                if (!empty($formatted)) {
                    $result['hasDuplicates'] = true;
                    $result['exactCoinCode'] = true;
                    $matches[]               = $formatted;
                    $match_ids[]             = $duplicate_post_id;
                }
            } elseif ($duplicate_post_id !== false) {
                $result['hasDuplicates'] = true;
                $result['exactCoinCode'] = true;
            }
        }

        $result['matches']        = $matches;
        $result['similarMatches'] = caes_find_similar_coin_matches(
            $criteria,
            $exclude_post_id,
            $match_ids,
            10
        );

        return $result;
    }
}

if (!function_exists('caes_check_coin_duplicates')) {
    function caes_check_coin_duplicates(WP_REST_Request $request) {
        $params = caes_get_request_merged_params($request);
        $input  = caes_sanitize_duplicate_check_input(array(
            'unique_code'           => $params['unique_code'] ?? $request->get_param('unique_code'),
            'coin_code'             => $params['coin_code'] ?? $request->get_param('coin_code'),
            'country'               => $params['country'] ?? $request->get_param('country'),
            'year'                  => $params['year'] ?? $request->get_param('year'),
            'denomination'          => $params['denomination'] ?? $request->get_param('denomination'),
            'coin_type'             => $params['coin_type'] ?? $request->get_param('coin_type'),
            'coin_theme'            => $params['coin_theme'] ?? $request->get_param('coin_theme'),
            'commemorative_subject' => $params['commemorative_subject'] ?? $request->get_param('commemorative_subject'),
            'exclude_post_id'       => $params['exclude_post_id'] ?? $request->get_param('exclude_post_id'),
        ));

        $duplicate_error = caes_validate_coin_duplicate_codes(
            $input['unique_code'],
            $input['coin_code'],
            $input['exclude_post_id']
        );

        $result = caes_run_coin_duplicate_check($input, $input['exclude_post_id']);

        if (is_wp_error($duplicate_error)) {
            $result['hasDuplicates'] = true;

            if ($duplicate_error->get_error_code() === 'caes_duplicate_unique_code') {
                $result['exactUniqueCode'] = true;
            }

            if ($duplicate_error->get_error_code() === 'caes_duplicate_coin_code') {
                $result['exactCoinCode'] = true;
            }
        }

        return new WP_REST_Response($result, 200);
    }
}

if (!function_exists('caes_sanitize_ai_provider_debug_message')) {
    function caes_sanitize_ai_provider_debug_message($message, $max_length = 300) {
        $message = wp_strip_all_tags((string) $message);
        $message = preg_replace('/x-goog-api-key[\s:=]+[^\s,}"]+/i', '[redacted]', $message);
        $message = preg_replace('/AIza[0-9A-Za-z_-]{20,}/', '[redacted]', $message);
        $message = preg_replace('/\s+/', ' ', trim($message));

        if ($max_length > 0 && strlen($message) > $max_length) {
            $message = substr($message, 0, $max_length);
        }

        return sanitize_text_field($message);
    }
}

if (!function_exists('caes_extract_gemini_error_summary')) {
    function caes_extract_gemini_error_summary($body) {
        $body    = (string) $body;
        $decoded = json_decode($body, true);

        if (is_array($decoded)) {
            if (!empty($decoded['error']['message'])) {
                return (string) $decoded['error']['message'];
            }

            if (!empty($decoded['error']['status'])) {
                return (string) $decoded['error']['status'];
            }
        }

        return $body;
    }
}

if (!function_exists('caes_build_ai_provider_error_data')) {
    function caes_build_ai_provider_error_data($status, $extra = array()) {
        $data = array_merge(array('status' => (int) $status), $extra);

        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            unset($data['debug_message']);
        } elseif (!empty($data['debug_message'])) {
            $data['debug_message'] = caes_sanitize_ai_provider_debug_message($data['debug_message']);
        }

        return $data;
    }
}

if (!function_exists('caes_format_ai_provider_rest_error')) {
    function caes_format_ai_provider_rest_error(WP_Error $error) {
        $error_data = (array) $error->get_error_data();
        $status     = (int) ($error_data['status'] ?? 502);
        $response   = array(
            'success' => false,
            'code'    => $error->get_error_code(),
            'message' => $error->get_error_message(),
        );

        if (!empty($error_data['provider_status'])) {
            $response['provider_status'] = (int) $error_data['provider_status'];
        }

        if (defined('WP_DEBUG') && WP_DEBUG && !empty($error_data['debug_message'])) {
            $response['debug_message'] = $error_data['debug_message'];
        }

        return new WP_REST_Response($response, $status);
    }
}

if (!function_exists('caes_call_gemini_generate_content')) {
    function caes_call_gemini_generate_content($prompt) {
        $api_key = caes_get_gemini_api_key();

        if ($api_key === '') {
            return new WP_Error('caes_ai_not_configured', 'AI provider is not configured.', array('status' => 501));
        }

        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
        $response = wp_remote_post(
            $endpoint,
            array(
                'timeout' => 45,
                'headers' => array(
                    'Content-Type'   => 'application/json',
                    'x-goog-api-key' => $api_key,
                ),
                'body' => wp_json_encode(array(
                    'contents' => array(
                        array(
                            'parts' => array(
                                array('text' => (string) $prompt),
                            ),
                        ),
                    ),
                    'generationConfig' => array(
                        'temperature'     => 0.4,
                        'responseMimeType' => 'application/json',
                    ),
                )),
            )
        );

        if (is_wp_error($response)) {
            caes_log_ai_debug('Gemini request failed: ' . $response->get_error_message());

            return new WP_Error(
                'caes_ai_provider_error',
                'AI provider request failed.',
                caes_build_ai_provider_error_data(502, array(
                    'debug_message' => $response->get_error_message(),
                ))
            );
        }

        $status_code = (int) wp_remote_retrieve_response_code($response);
        $body        = wp_remote_retrieve_body($response);

        if ($status_code !== 200) {
            $error_summary = caes_extract_gemini_error_summary($body);
            caes_log_ai_debug('Gemini returned HTTP ' . $status_code . ': ' . $error_summary);

            return new WP_Error(
                'caes_ai_provider_http_error',
                'AI provider returned an error.',
                caes_build_ai_provider_error_data(502, array(
                    'provider_status' => $status_code,
                    'debug_message'   => $error_summary,
                ))
            );
        }

        $decoded = json_decode((string) $body, true);

        if (!is_array($decoded)) {
            return new WP_Error(
                'caes_ai_invalid_response',
                'AI provider returned an invalid response.',
                array('status' => 502)
            );
        }

        $text = '';

        if (!empty($decoded['candidates'][0]['content']['parts'][0]['text'])) {
            $text = (string) $decoded['candidates'][0]['content']['parts'][0]['text'];
        }

        if ($text === '') {
            return new WP_Error(
                'caes_ai_invalid_response',
                'AI provider returned an invalid response.',
                array('status' => 502)
            );
        }

        return $text;
    }
}

if (!function_exists('caes_generate_ai_descriptions')) {
    function caes_generate_ai_descriptions(WP_REST_Request $request) {
        $contributor = caes_get_authenticated_contributor_from_request($request);

        if (empty($contributor)) {
            return new WP_Error(
                'rest_forbidden',
                'Invalid or missing contributor token.',
                array('status' => 401)
            );
        }

        if (caes_get_gemini_api_key() === '') {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'AI provider is not configured.',
            ), 501);
        }

        $rate_limited = caes_enforce_contributor_rate_limit(
            'ai_descriptions',
            $contributor,
            20,
            HOUR_IN_SECONDS
        );

        if ($rate_limited instanceof WP_REST_Response) {
            return $rate_limited;
        }

        $params = function_exists('caes_get_request_merged_params')
            ? caes_get_request_merged_params($request)
            : array();
        $input  = caes_validate_ai_descriptions_request(
            caes_sanitize_ai_descriptions_request($params)
        );

        if (is_wp_error($input)) {
            return $input;
        }

        $prompt = caes_build_ai_descriptions_prompt($input);
        $raw    = caes_call_gemini_generate_content($prompt);

        if (is_wp_error($raw)) {
            if ($raw->get_error_code() === 'caes_ai_not_configured') {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => $raw->get_error_message(),
                ), 501);
            }

            return caes_format_ai_provider_rest_error($raw);
        }

        $decoded = caes_extract_json_object_from_text($raw);
        $output  = caes_sanitize_ai_descriptions_output($decoded, $input['fields_requested'], $input);

        if ($output === null) {
            caes_log_ai_debug('Failed to parse Gemini JSON output.');

            return new WP_REST_Response(array(
                'success' => false,
                'code'    => 'AI_INVALID_RESPONSE',
                'message' => 'AI provider returned an invalid response.',
            ), 502);
        }

        return new WP_REST_Response(array(
            'success'      => true,
            'descriptions' => $output,
        ), 200);
    }
}
